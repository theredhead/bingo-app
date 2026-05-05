import { Injectable, MessageEvent } from "@nestjs/common";
import { Observable, Subject } from "rxjs";
import { map } from "rxjs/operators";

export interface ChatEvent {
  type: "message" | "emote" | "join" | "leave";
  from: string;
  text?: string;
  roomId: string;
  at: number;
}

export interface RoomSummary {
  id: string;
  name: string;
  memberCount: number;
}

interface Room {
  id: string;
  name: string;
  members: Map<string, string>; // connectionId → displayName
  subject: Subject<ChatEvent>;
}

@Injectable()
export class ChatService {
  private readonly rooms = new Map<string, Room>();

  private slugify(name: string): string {
    return (
      name
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
        .replace(/-+/g, "-")
        .slice(0, 60) || "room"
    );
  }

  listRooms(): RoomSummary[] {
    return Array.from(this.rooms.values()).map((r) => ({
      id: r.id,
      name: r.name,
      memberCount: r.members.size,
    }));
  }

  createRoom(
    name: string,
    from: string,
    connId: string,
  ): { room: RoomSummary } {
    const id = this.slugify(name);
    // findOrCreate — return existing room if slug already in use
    if (this.rooms.has(id)) {
      return { room: this.joinRoom(id, from, connId) };
    }
    const room: Room = {
      id,
      name: name.trim().slice(0, 80),
      members: new Map([[connId, from.trim()]]),
      subject: new Subject(),
    };
    this.rooms.set(id, room);
    return { room: { id, name: room.name, memberCount: 1 } };
  }

  joinRoom(roomId: string, from: string, connId: string): RoomSummary {
    // Auto-create if navigated to a room that doesn't exist yet
    if (!this.rooms.has(roomId)) {
      return this.createRoom(roomId, from, connId).room;
    }
    const room = this.rooms.get(roomId)!;
    room.members.set(connId, from.trim());
    room.subject.next({ type: "join", from, roomId, at: Date.now() });
    return { id: room.id, name: room.name, memberCount: room.members.size };
  }

  leaveRoom(roomId: string, connId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const from = room.members.get(connId) ?? connId;
    room.members.delete(connId);
    room.subject.next({ type: "leave", from, roomId, at: Date.now() });
    if (room.members.size === 0) {
      room.subject.complete();
      this.rooms.delete(roomId);
    }
  }

  sendMessage(roomId: string, from: string, text: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    const type = trimmed.startsWith("/me ") ? "emote" : "message";
    const body = type === "emote" ? trimmed.slice(4) : trimmed;
    room.subject.next({ type, from, text: body, roomId, at: Date.now() });
  }

  stream(roomId: string): Observable<MessageEvent> {
    // Auto-create rooms on stream connect too (handles SSE reconnect after server restart)
    if (!this.rooms.has(roomId)) {
      const room: Room = {
        id: roomId,
        name: roomId,
        members: new Map(),
        subject: new Subject(),
      };
      this.rooms.set(roomId, room);
    }
    return this.rooms
      .get(roomId)!
      .subject.asObservable()
      .pipe(map((event) => ({ data: event }) as MessageEvent));
  }
}
