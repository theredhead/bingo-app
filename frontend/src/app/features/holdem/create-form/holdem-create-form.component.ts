import { Component, input, output, signal } from "@angular/core";
import { AvatarPickerComponent } from "../shared/avatar-picker.component";

export interface CreateGameOptions {
  maxSeats: number;
  limitType: "no-limit" | "pot-limit" | "fixed-limit";
  moveTimeLimit: number;
  botCount: number;
}

@Component({
  selector: "app-holdem-create-form",
  standalone: true,
  imports: [AvatarPickerComponent],
  templateUrl: "./holdem-create-form.component.html",
  styleUrl: "./holdem-create-form.component.css",
})
export class HoldemCreateFormComponent {
  // Inputs
  loading = input(false);
  error = input<string | null>(null);
  displayName = input("");
  avatar = input("🎩");

  // Local form state
  readonly limitType = signal<"no-limit" | "pot-limit" | "fixed-limit">(
    "no-limit",
  );
  readonly moveTimeLimit = signal(30);
  readonly botCount = signal(0);

  // Outputs
  readonly createGame = output<CreateGameOptions>();
  readonly back = output<void>();
  readonly avatarSelected = output<string>();
  readonly displayNameChanged = output<string>();

  submit(event?: Event) {
    event?.preventDefault();
    this.createGame.emit({
      maxSeats: 6,
      limitType: this.limitType(),
      moveTimeLimit: this.moveTimeLimit(),
      botCount: this.botCount(),
    });
  }
}
