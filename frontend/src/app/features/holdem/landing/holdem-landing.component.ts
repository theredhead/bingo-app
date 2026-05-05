import { Component, input, output } from "@angular/core";
import { HoldemGame } from "../holdem.service";
import { AvatarPickerComponent } from "../shared/avatar-picker.component";

@Component({
  selector: "app-holdem-landing",
  standalone: true,
  imports: [AvatarPickerComponent],
  templateUrl: "./holdem-landing.component.html",
  styleUrl: "./holdem-landing.component.css",
})
export class HoldemLandingComponent {
  // Inputs
  publicTables = input.required<HoldemGame[]>();
  publicLoading = input(false);
  balance = input<number | null>(null);
  dailyBonusAwarded = input(false);
  loading = input(false);
  error = input<string | null>(null);
  displayName = input("");
  avatar = input("🎩");
  pendingJoinId = input<string | null>(null);

  // Outputs
  readonly createClicked = output<void>();
  readonly joinClicked = output<string>(); // tableId
  readonly startJoin = output<string>(); // tableId
  readonly cancelJoin = output<void>();
  readonly avatarSelected = output<string>();
  readonly displayNameChanged = output<string>();
}
