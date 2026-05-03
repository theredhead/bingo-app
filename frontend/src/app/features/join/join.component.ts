import { CommonModule } from "@angular/common";
import { Component, OnInit, inject, signal } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { PlayerSessionService } from "../../core/player-session.service";

@Component({
  selector: "app-join",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./join.component.html",
  styleUrl: "./join.component.css",
})
export class JoinComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly playerSession = inject(PlayerSessionService);

  readonly loading = signal(false);
  readonly error = signal("");
  playerName = "";
  joinCode = "";

  ngOnInit(): void {
    this.joinCode = (
      this.route.snapshot.paramMap.get("joinCode") ?? ""
    ).toUpperCase();
    const existingPlayerId = this.playerSession.getPlayerId(this.joinCode);
    if (existingPlayerId) {
      this.router.navigate(["/bingo/games", this.joinCode]);
      return;
    }
    this.playerName = this.playerSession.getPlayerName();
  }

  joinGame(): void {
    const name = this.playerName.trim();
    if (!name) {
      this.error.set("Enter your name to join the game.");
      return;
    }

    this.loading.set(true);
    this.error.set("");
    this.apiService.joinGame(this.joinCode, name).subscribe({
      next: (snapshot) => {
        this.playerSession.setPlayerName(name);
        if (snapshot.playerId) {
          this.playerSession.setPlayerId(
            snapshot.game.joinCode,
            snapshot.playerId,
          );
        }
        this.router.navigate(["/bingo/games", snapshot.game.joinCode]);
      },
      error: () => {
        this.error.set(
          "Could not join that game. Check the code and try again.",
        );
        this.loading.set(false);
      },
    });
  }
}
