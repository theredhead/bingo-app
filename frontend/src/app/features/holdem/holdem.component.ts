import {
  Component,
  OnDestroy,
  OnInit,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { HoldemService, HoldemGame, HoldemPlayer } from "./holdem.service";
import { HoldemLandingComponent } from "./landing/holdem-landing.component";
import {
  HoldemCreateFormComponent,
  CreateGameOptions,
} from "./create-form/holdem-create-form.component";
import { HoldemTableComponent } from "./table/holdem-table.component";

@Component({
  selector: "app-holdem",
  standalone: true,
  imports: [
    HoldemLandingComponent,
    HoldemCreateFormComponent,
    HoldemTableComponent,
  ],
  templateUrl: "./holdem.component.html",
  styleUrl: "./holdem.component.css",
})
export class HoldemComponent implements OnInit, OnDestroy {
  // Navigation / step
  readonly step = signal<"landing" | "create" | "table">("landing");
  readonly pendingJoinId = signal<string | null>(null);

  // Game state
  readonly game = signal<HoldemGame | null>(null);
  readonly player = signal<HoldemPlayer | null>(null);
  readonly gameId = signal("");

  // Player identity (persisted)
  readonly displayName = signal(
    localStorage.getItem("holdem.displayName") ?? "",
  );
  readonly avatar = signal(localStorage.getItem("holdem.avatar") ?? "🎩");

  // Balance
  readonly balance = signal<number | null>(null);
  readonly dailyBonusAwarded = signal(false);

  // Public lobby
  readonly publicTables = signal<HoldemGame[]>([]);
  readonly publicLoading = signal(false);

  // Shared error
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly _beforeUnload = () => this.beaconLeave();

  constructor(private holdem: HoldemService) {
    this.holdem.getBalance().subscribe({
      next: (r) => {
        this.balance.set(r.balance);
        if (r.dailyBonusAwarded) this.dailyBonusAwarded.set(true);
      },
    });

    effect(() => {
      if (this.step() === "landing") this.loadPublicTables();
    });

    effect(() => {
      document.body.classList.toggle("game-mode", this.step() === "table");
    });
  }

  ngOnInit() {
    window.addEventListener("beforeunload", this._beforeUnload);
    const gameId = this.route.snapshot.paramMap.get("gameId");
    if (gameId) {
      this.gameId.set(gameId);
      if (this.loadSession(gameId)) {
        this.joinGame(gameId);
      } else {
        this.pendingJoinId.set(gameId);
        this.loadPublicTables();
      }
    }
  }

  ngOnDestroy() {
    this.beaconLeave();
    document.body.classList.remove("game-mode");
    window.removeEventListener("beforeunload", this._beforeUnload);
  }

  // ── Navigation ────────────────────────────────────────────

  toCreate() {
    this.step.set("create");
    this.error.set(null);
  }

  toLanding() {
    const gid = this.gameId();
    const pid = this.player()?.id;
    this.step.set("landing");
    this.pendingJoinId.set(null);
    this.error.set(null);
    this.game.set(null);
    this.player.set(null);
    this.router.navigate(["/holdem"]);
    const refresh = () =>
      this.holdem.getBalance().subscribe({
        next: (r) => {
          this.balance.set(r.balance);
          if (r.dailyBonusAwarded) this.dailyBonusAwarded.set(true);
        },
      });
    if (gid && pid) {
      this.holdem.leaveGame(gid, pid).subscribe({ complete: refresh });
    } else {
      refresh();
    }
  }

  // ── Identity ──────────────────────────────────────────────

  selectAvatar(emoji: string) {
    this.avatar.set(emoji);
    try {
      localStorage.setItem("holdem.avatar", emoji);
    } catch {
      /* ignore */
    }
  }

  onDisplayNameChanged(name: string) {
    this.displayName.set(name);
  }

  // ── Lobby ─────────────────────────────────────────────────

  loadPublicTables() {
    this.publicLoading.set(true);
    this.holdem.getPublicGames().subscribe({
      next: (t) => {
        this.publicTables.set(t);
        this.publicLoading.set(false);
      },
      error: () => {
        this.publicTables.set([]);
        this.publicLoading.set(false);
      },
    });
  }

  // ── Create ────────────────────────────────────────────────

  onCreateGame(opts: CreateGameOptions) {
    this.loading.set(true);
    this.holdem.createGame(opts).subscribe({
      next: (game) => {
        this.game.set(game);
        this.joinGame(game.id);
      },
      error: (err) => {
        this.error.set(err?.error?.message || "Create failed");
        this.loading.set(false);
      },
    });
  }

  // ── Join / table ──────────────────────────────────────────

  joinGame(gameId: string) {
    this.loading.set(true);
    const storedId = this.loadSession(gameId);
    const name = this.displayName();
    if (name) {
      try {
        localStorage.setItem("holdem.displayName", name);
        localStorage.setItem("holdem.avatar", this.avatar());
      } catch {
        /* ignore */
      }
    }
    this.holdem
      .joinGame(gameId, this.avatar() + " " + name, storedId)
      .subscribe({
        next: (player) => {
          this.player.set(player);
          this.saveSession(gameId, player.id);
          this.gameId.set(gameId);
          this.subscribeGame(gameId);
          this.holdem.getGame(gameId).subscribe((game) => {
            this.game.set(game);
            const me = game.players.find((x) => x.id === player.id);
            if (me) this.player.set(me);
            const isHost = !!(me?.isHost || player.isHost);
            const seated = game.players.filter(
              (p) => p.isSeated && p.chips > 0,
            ).length;
            if (isHost && game.status === "waiting" && seated >= 2) {
              this.holdem
                .startHand(gameId)
                .subscribe({ next: (g) => this.game.set(g) });
            }
          });
          this.router.navigate(["/holdem/table", gameId], { replaceUrl: true });
          this.step.set("table");
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.error?.message || "Join failed");
          this.loading.set(false);
        },
      });
  }

  subscribeGame(gameId: string) {
    this.holdem.gameEvents(gameId).subscribe((game) => {
      this.game.set(game);
      const me = this.player();
      if (me) {
        const updated = game.players.find((p) => p.id === me.id);
        if (updated) this.player.set(updated);
      }
    });
  }

  // ── Table event handlers (forwarded from HoldemTableComponent) ──

  onAction(action: { type: string; amount?: number }) {
    const game = this.game();
    const p = this.player();
    if (!game || !p) return;
    this.holdem.playerAction(game.id, { ...action, playerId: p.id }).subscribe({
      next: (g) => {
        this.game.set(g);
        const me = g.players.find((x) => x.id === p.id);
        if (me) this.player.set(me);
      },
      error: (err) => this.error.set(err?.error?.message || "Action failed"),
    });
  }

  onStartGame() {
    const game = this.game();
    if (!game) return;
    this.holdem.startHand(game.id).subscribe({
      next: (g) => this.game.set(g),
      error: (err) =>
        this.error.set(err?.error?.message || "Failed to start hand"),
    });
  }

  onAddBot() {
    const game = this.game();
    if (!game) return;
    this.holdem.addBot(game.id).subscribe({
      next: (g) => {
        this.game.set(g);
        const me = this.player();
        if (me) {
          const u = g.players.find((p) => p.id === me.id);
          if (u) this.player.set(u);
        }
        const seated = g.players.filter(
          (p) => p.isSeated && p.chips > 0,
        ).length;
        if (g.status === "waiting" && seated >= 2) {
          this.holdem
            .startHand(g.id)
            .subscribe({ next: (s) => this.game.set(s) });
        }
      },
      error: (err) =>
        this.error.set(err?.error?.message || "Could not add bot"),
    });
  }

  onRemoveBot(botId: string) {
    const game = this.game();
    if (!game) return;
    this.holdem.removeBot(game.id, botId).subscribe({
      next: (g) => {
        this.game.set(g);
        const me = this.player();
        if (me) {
          const u = g.players.find((p) => p.id === me.id);
          if (u) this.player.set(u);
        }
      },
      error: (err) =>
        this.error.set(err?.error?.message || "Could not remove bot"),
    });
  }

  onSitHere() {
    const g = this.game();
    if (g) this.joinGame(g.id);
  }

  // ── Session helpers ───────────────────────────────────────

  private saveSession(gameId: string, playerId: string) {
    try {
      localStorage.setItem(`holdem:${gameId}`, playerId);
    } catch {
      /* ignore */
    }
  }

  private loadSession(gameId: string): string | undefined {
    try {
      return localStorage.getItem(`holdem:${gameId}`) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private beaconLeave() {
    const gid = this.gameId();
    const pid = this.player()?.id;
    if (gid && pid) {
      navigator.sendBeacon(
        `/api/holdem/${gid}/players/${pid}`,
        new Blob([], { type: "application/json" }),
      );
    }
  }
}
