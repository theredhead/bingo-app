import { CommonModule } from "@angular/common";
import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { Subscription } from "rxjs";
import { ApiService } from "../../core/api.service";
import { GameEventsService } from "../../core/game-events.service";
import { HostedGamePlayer, HostedGameSnapshot } from "../../core/models";
import { PlayerSessionService } from "../../core/player-session.service";
import { QrCodeService } from "../../core/qr-code.service";
import { ConfettiOverlayComponent } from "./effects/confetti-overlay/confetti-overlay.component";
import { FireworksOverlayComponent } from "./effects/fireworks-overlay/fireworks-overlay.component";

@Component({
  selector: "app-game",
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ConfettiOverlayComponent,
    FireworksOverlayComponent,
  ],
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
  readonly celebrationToken = signal(0);
  joinCode = "";
  private playerId = "";
  private eventSubscription?: Subscription;
  private audioCtx: AudioContext | null = null;
  private playedVictoryForGameId: string | null = null;

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
    this.audioCtx?.close();
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

  isWinnerDevice(snapshot: HostedGameSnapshot): boolean {
    return (
      snapshot.game.status === "completed" &&
      !!snapshot.playerId &&
      snapshot.game.winnerPlayerId === snapshot.playerId
    );
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
    const previous = this.snapshot();
    this.snapshot.set(snapshot);
    this.loading.set(false);
    this.applyWinnerEffects(previous, snapshot);
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

  private applyWinnerEffects(
    previous: HostedGameSnapshot | null,
    snapshot: HostedGameSnapshot,
  ): void {
    if (!this.isWinnerDevice(snapshot)) {
      return;
    }

    const enteredCompletedState =
      previous?.game.status !== "completed" ||
      previous.game.id !== snapshot.game.id;
    const alreadyPlayed = this.playedVictoryForGameId === snapshot.game.id;

    if (enteredCompletedState && !alreadyPlayed) {
      this.playedVictoryForGameId = snapshot.game.id;
      this.triggerCelebration();
      this.playVictorySound();
    }
  }

  private triggerCelebration(): void {
    this.celebrationToken.update((value) => value + 1);
  }

  private playVictorySound(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioCtx?.close();
      this.audioCtx = new AudioCtx();
      const ctx = this.audioCtx;
      const notes = [523.25, 659.25, 783.99, 1046.5];

      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = freq;
        osc.type = "triangle";

        const start = ctx.currentTime + index * 0.13;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

        osc.start(start);
        osc.stop(start + 0.45);
      });
    } catch {
      // Audio can be blocked in browsers without user gesture.
    }
  }
}
