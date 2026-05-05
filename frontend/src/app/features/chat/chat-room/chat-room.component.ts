import {
  Component,
  ElementRef,
  OnChanges,
  ViewChild,
  input,
} from "@angular/core";

export interface DisplayMessage {
  type: "message" | "emote";
  from: string;
  text: string;
  mine: boolean;
}

@Component({
  selector: "app-chat-room",
  standalone: true,
  templateUrl: "./chat-room.component.html",
  styleUrls: ["./chat-room.component.css", "../chat.styles.scss"],
})
export class ChatRoomComponent implements OnChanges {
  @ViewChild("logEnd") private logEnd!: ElementRef<HTMLDivElement>;

  readonly messages = input<DisplayMessage[]>([]);

  ngOnChanges() {
    // Scroll to bottom whenever messages change
    setTimeout(() =>
      this.logEnd?.nativeElement?.scrollIntoView({ behavior: "smooth" }),
    );
  }
}
