import { Component, input, output } from "@angular/core";
import { AVATARS } from "../holdem.constants";

@Component({
  selector: "app-avatar-picker",
  standalone: true,
  templateUrl: "./avatar-picker.component.html",
  styleUrl: "./avatar-picker.component.css",
})
export class AvatarPickerComponent {
  readonly AVATARS = AVATARS;
  selected = input<string>("🎩");
  select = output<string>();
}
