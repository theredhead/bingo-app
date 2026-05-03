import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { ApiService } from "../../core/api.service";
import { GameEventsService } from "../../core/game-events.service";
import { HostedGamePlayer, HostedGameSnapshot } from "../../core/models";
import { PlayerSessionService } from "../../core/player-session.service";
import { QrCodeService } from "../../core/qr-code.service";

@Component({
  selector: "app-game",
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: "./game.component.html",
  styleUrl: "./game.component.css",
})
export class GameComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly eventsService = inject(GameEventsService);
  private readonly playerSession = inject(PlayerSessionService);
  private readonly qrCodeService = inject(QrCodeService);

  readonly loading = signal(true);
  readonly error = signal("");
  readonly snapshot = signal<HostedGameSnapshot | null>(null);
  readonly qrCodeUrl = signal("");
  readonly confettiPieces = Array.from({ length: 60 }, (_, i) => i);
  joinCode = "";
  private playerId = "";
  private eventSubscription?: Subscription;

  ngOnInit(): void {
    this.joinCode = (
      this.route.snapshot.paramMap.get("joinCode") ?? ""
    ).toUpperCase();
    this.playerId = this.playerSession.getPlayerId(this.joinCode);

    if (!this.playerId) {
      this.router.navigate(["/join", this.joinCode]);
      return;
    }

    this.loadSnapshot();
    this.eventSubscription = this.eventsService
      .watchGame(this.joinCode, this.playerId)
      .subscribe({
        next: (snapshot) => {
          this.error.set("");
          this.applySnapshot(snapshot);
        },
        error: () => {
          this.error.set("Could not restore the live connection.");
        },
      });
  }

  ngOnDestroy(): void {
    this.eventSubscription?.unsubscribe();
  }

  startGame(): void {
    this.apiService.startGame(this.joinCode, this.playerId).subscribe({
      next: (snapshot) => this.applySnapshot(snapshot),
      error: () => {
        this.error.set("Could not start the game. Please try again.");
      },
    });
  }

  toggleStamp(row: number, col: number, value: string): void {
    if (value === "FREE" || this.snapshot()?.game.status !== "active") {
      return;
    }

    this.apiService
      .toggleStamp(this.joinCode, this.playerId, row, col)
      .subscribe({
        next: (snapshot) => this.applySnapshot(snapshot),
        error: () => {
          this.error.set("Could not update that stamp. Please try again.");
        },
      });
  }

  isStamped(row: number, col: number, value: string): boolean {
    if (value === "FREE") {
      return true;
    }

    return this.snapshot()?.stampedKeys?.includes(`${row}-${col}`) ?? false;
  }

  getPlacedPlayers(players: HostedGamePlayer[]): HostedGamePlayer[] {
    return [...players]
      .filter((p) => p.placement !== null && p.placement !== undefined)
      .sort((a, b) => (a.placement ?? 999) - (b.placement ?? 999));
  }

  getWinner(players: HostedGamePlayer[]): HostedGamePlayer | undefined {
    return this.getPlacedPlayers(players).find(
      (player) => player.placement === 1,
    );
  }

  getRunnersUp(players: HostedGamePlayer[]): HostedGamePlayer[] {
    return this.getPlacedPlayers(players).filter(
      (player) => player.placement !== 1,
    );
  }

  getPlacementLabel(placement: number | null | undefined): string {
    if (!placement) return "-";
    const suffix =
      placement === 1
        ? "st"
        : placement === 2
          ? "nd"
          : placement === 3
            ? "rd"
            : "th";
    return `${placement}${suffix}`;
  }

  private loadSnapshot(): void {
    this.loading.set(true);
    this.error.set("");
    this.apiService.getGame(this.joinCode, this.playerId).subscribe({
      next: (snapshot) => {
        this.applySnapshot(snapshot);
        this.loading.set(false);
      },
      error: () => {
        this.error.set("Could not load that game.");
        this.loading.set(false);
      },
    });
  }

  private applySnapshot(snapshot: HostedGameSnapshot): void {
    this.snapshot.set(snapshot);
    this.loading.set(false);
    void this.renderQrCode();
  }

  get joinUrl(): string {
    if (typeof window === "undefined") {
      return `/join/${this.joinCode}`;
    }

    return `${window.location.origin}/join/${this.joinCode}`;
  }

  private async renderQrCode(): Promise<void> {
    try {
      const dataUrl = await this.qrCodeService.toDataUrl(this.joinUrl);
      this.qrCodeUrl.set(dataUrl);
    } catch {
      this.qrCodeUrl.set("");
    }
  }
}
