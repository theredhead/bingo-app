import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ChatService, RoomSummary, ChatEvent } from "./chat.service";
import {
  ChatRoomComponent,
  DisplayMessage,
} from "./chat-room/chat-room.component";
import { Subscription } from "rxjs";

@Component({
  selector: "app-chat",
  standalone: true,
  imports: [FormsModule, ChatRoomComponent],
  templateUrl: "./chat.component.html",
  styleUrl: "./chat.component.css",
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild("messageInput") messageInput!: ElementRef<HTMLInputElement>;

  readonly step = signal<"lobby" | "room">("lobby");
  readonly rooms = signal<RoomSummary[]>([]);
  readonly from = signal(
    localStorage.getItem("chat.from") ||
      localStorage.getItem("holdem.displayName") ||
      "",
  );
  readonly currentRoom = signal<RoomSummary | null>(null);
  readonly messages = signal<DisplayMessage[]>([]);
  readonly draft = signal("");
  readonly newRoomName = signal("");
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Room slug from the URL, waiting for the user to enter their name */
  readonly pendingRoomId = signal<string | null>(null);

  private eventsub: Subscription | null = null;
  private readonly _beforeUnload = () => this._doLeave();
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  constructor(private chat: ChatService) {}

  ngOnInit() {
    window.addEventListener("beforeunload", this._beforeUnload);
    this.loadRooms();
    const roomId = this.route.snapshot.paramMap.get("roomId");
    if (roomId) {
      if (this.from().trim()) {
        this.join(roomId);
      } else {
        this.pendingRoomId.set(roomId);
      }
    }
  }

  ngOnDestroy() {
    window.removeEventListener("beforeunload", this._beforeUnload);
    this._doLeave();
  }

  loadRooms() {
    this.chat.listRooms().subscribe({ next: (r) => this.rooms.set(r) });
  }

  saveName() {
    localStorage.setItem("chat.from", this.from());
  }

  joinPending() {
    const pending = this.pendingRoomId();
    if (!pending) return;
    this.pendingRoomId.set(null);
    this.join(pending);
  }

  create() {
    const name = this.newRoomName().trim();
    const from = this.from().trim();
    if (!name || !from) return;
    this.loading.set(true);
    this.error.set(null);
    this.chat.createRoom(name, from).subscribe({
      next: ({ room }) => {
        this.loading.set(false);
        this._enterRoom(room);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.message ?? "Failed to create room");
      },
    });
  }

  join(roomId: string) {
    const from = this.from().trim();
    if (!from) {
      this.error.set("Enter your name first");
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.chat.joinRoom(roomId, from).subscribe({
      next: (room) => {
        this.loading.set(false);
        this._enterRoom(room);
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(e.message ?? "Failed to join room");
      },
    });
  }

  send() {
    const text = this.draft().trim();
    const room = this.currentRoom();
    if (!text || !room) return;
    this.draft.set("");
    this.chat
      .sendMessage(room.id, this.from(), text)
      .subscribe({ error: () => {} });
  }

  leave() {
    this._doLeave();
    this.step.set("lobby");
    this.router.navigate(["/chat"]);
    this.loadRooms();
  }

  private _enterRoom(room: RoomSummary) {
    this.currentRoom.set(room);
    this.messages.set([]);
    this.step.set("room");
    this.router.navigate(["/chat", room.id], { replaceUrl: true });
    this.eventsub = this.chat.roomEvents(room.id).subscribe((event) => {
      this._handleEvent(event);
    });
    setTimeout(() => this.messageInput?.nativeElement?.focus(), 100);
  }

  private _handleEvent(event: ChatEvent) {
    if (event.type !== "message" && event.type !== "emote") return;
    this.messages.update((msgs) => [
      ...msgs,
      {
        type: event.type as "message" | "emote",
        from: event.from,
        text: event.text ?? "",
        mine: event.from === this.from(),
      },
    ]);
  }

  private _doLeave() {
    const room = this.currentRoom();
    this.eventsub?.unsubscribe();
    this.eventsub = null;
    if (room) {
      this.chat.leaveRoom(room.id);
    }
    this.currentRoom.set(null);
  }
}
