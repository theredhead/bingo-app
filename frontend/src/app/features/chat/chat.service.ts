import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface RoomSummary {
  id: string;
  name: string;
  memberCount: number;
}

export interface ChatEvent {
  type: "message" | "emote" | "join" | "leave";
  from: string;
  text?: string;
  roomId: string;
  at: number;
}

@Injectable({ providedIn: "root" })
export class ChatService {
  constructor(private http: HttpClient) {}

  private generateUUID(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
    return `${h.slice(0, 4).join("")}-${h.slice(4, 6).join("")}-${h.slice(6, 8).join("")}-${h.slice(8, 10).join("")}-${h.slice(10).join("")}`;
  }

  /** Stable per-browser connection ID — survives page reloads, unique per device */
  readonly connId: string = (() => {
    const key = "chat.connId";
    let id = localStorage.getItem(key);
    if (!id) {
      id = this.generateUUID();
      localStorage.setItem(key, id);
    }
    return id;
  })();

  listRooms() {
    return this.http.get<RoomSummary[]>("/api/chat/rooms");
  }

  createRoom(name: string, from: string) {
    return this.http.post<{ room: RoomSummary }>("/api/chat/rooms", {
      name,
      from,
      connId: this.connId,
    });
  }

  joinRoom(roomId: string, from: string) {
    return this.http.post<RoomSummary>(`/api/chat/rooms/${roomId}/join`, {
      from,
      connId: this.connId,
    });
  }

  sendMessage(roomId: string, from: string, text: string) {
    return this.http.post(`/api/chat/rooms/${roomId}/messages`, { from, text });
  }

  leaveRoom(roomId: string): void {
    const body = JSON.stringify({ connId: this.connId });
    // Beacon for page unload / tab close
    const blob = new Blob([body], { type: "application/json" });
    navigator.sendBeacon(`/api/chat/rooms/${roomId}/leave`, blob);
    // Also fire for in-app leaves (sendBeacon is fire-and-forget)
    this.http
      .post(`/api/chat/rooms/${roomId}/leave`, { connId: this.connId })
      .subscribe({ error: () => {} });
  }

  roomEvents(roomId: string): Observable<ChatEvent> {
    return new Observable<ChatEvent>((observer) => {
      let es: EventSource;
      let destroyed = false;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

      const connect = () => {
        if (destroyed) return;
        es = new EventSource(`/api/chat/rooms/${roomId}/stream`);
        es.onmessage = (event) => {
          try {
            observer.next(JSON.parse(event.data) as ChatEvent);
          } catch {
            // ignore malformed frames
          }
        };
        es.onerror = () => {
          es.close();
          if (!destroyed) reconnectTimeout = setTimeout(connect, 1500);
        };
      };

      connect();

      return () => {
        destroyed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        es?.close();
      };
    });
  }
}
