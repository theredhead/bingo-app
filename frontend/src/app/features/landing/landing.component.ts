import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-landing",
  standalone: true,
  templateUrl: "./landing.component.html",
  styleUrl: "./landing.component.css",
})
export class LandingComponent {
  constructor(private router: Router) {}

  selectGame(game: string) {
    if (game === "bingo") {
      this.router.navigate(["/bingo"]);
    } else if (game === "holdem") {
      this.router.navigate(["/holdem"]);
    }
  }
}
