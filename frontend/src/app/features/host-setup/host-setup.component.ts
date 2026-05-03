import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { PlayerSessionService } from "../../core/player-session.service";

@Component({
  selector: "app-host-setup",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./host-setup.component.html",
  styleUrl: "./host-setup.component.css",
})
export class HostSetupComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly playerSession = inject(PlayerSessionService);

  readonly loading = signal(false);
  readonly error = signal("");
  playerName = "";
  wordlistId = "";

  ngOnInit(): void {
    this.wordlistId = this.route.snapshot.paramMap.get("wordlistId") ?? "";
    this.playerName = this.playerSession.getPlayerName();
  }

  createGame(): void {
    const name = this.playerName.trim();
    if (!name) {
      this.error.set("Enter your name to host a game.");
      return;
    }

    this.loading.set(true);
    this.error.set("");
    this.apiService.createGame(this.wordlistId, name).subscribe({
      next: (snapshot) => {
        this.playerSession.setPlayerName(name);
        if (snapshot.playerId) {
          this.playerSession.setPlayerId(
            snapshot.game.joinCode,
            snapshot.playerId,
          );
        }
        this.router.navigate(["/games", snapshot.game.joinCode]);
      },
      error: () => {
        this.error.set("Could not create a hosted game. Please try again.");
        this.loading.set(false);
      },
    });
  }
}
