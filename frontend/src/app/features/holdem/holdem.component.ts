import {
  Component,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { HoldemService, HoldemGame, HoldemPlayer } from "./holdem.service";

@Component({
  selector: "app-holdem",
  standalone: true,
  templateUrl: "./holdem.component.html",
  styleUrl: "./holdem.component.css",
})
export class HoldemComponent implements OnInit, OnDestroy {
  // UI state
  step = signal<"landing" | "create" | "table">("landing");
  pendingJoinId = signal<string | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Game state
  game = signal<HoldemGame | null>(null);
  player = signal<HoldemPlayer | null>(null);
  gameId = signal("");
  displayName = signal(localStorage.getItem("holdem.displayName") ?? "");

  // Create options
  maxSeats = signal(6);
  limitType = signal<"no-limit" | "pot-limit" | "fixed-limit">("no-limit");
  moveTimeLimit = signal(30);
  botCount = signal(0);

  publicTables = signal<HoldemGame[]>([]);
  publicLoading = signal(false);

  // Raise amount input
  raiseAmount = signal(20);

  // Pre-action: queued move while waiting for other players
  preAction = signal<"fold" | "check-fold" | "call-any" | null>(null);

  // Winner banner
  winnerBannerVisible = signal(false);
  private lastShowdownKey = "";

  // Turn timer
  timeLeft = signal(0);
  private timerInterval: ReturnType<typeof setInterval> | null = null;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Computed helpers
  // Use || so that if player signal says isHost=true we always trust it,
  // even if a subsequent game-state update has a stale isHost:false from DB
  isHost = computed(() => {
    const p = this.player();
    if (!p) return false;
    const fromGame = this.game()?.players.find((x) => x.id === p.id);
    return !!(fromGame?.isHost || p.isHost);
  });

  callAmount = computed(() => {
    const g = this.game();
    const p = this.player();
    if (!g || !p) return 0;
    return Math.max(
      0,
      (g.state?.currentBet ?? 0) - (g.state?.bets?.[p.id] ?? 0),
    );
  });

  isMyTurn = computed(() => {
    const g = this.game();
    const p = this.player();
    return !!g && !!p && g.state?.activePlayerId === p.id;
  });

  minRaise = computed(() => {
    const g = this.game();
    return g ? (g.state?.currentBet ?? 0) * 2 || 20 : 20;
  });

  // Seated players (used for position badge computation)
  readonly seatedPlayers = computed(() => {
    const g = this.game();
    if (!g) return [] as HoldemPlayer[];
    return g.players.filter((p) => p.isSeated && p.chips > 0);
  });

  readonly dealerPlayerId = computed(() => {
    const g = this.game();
    if (!g || g.state.dealerIdx == null || g.state.phase === "waiting")
      return null;
    return this.seatedPlayers()[g.state.dealerIdx]?.id ?? null;
  });

  readonly sbPlayerId = computed(() => {
    const g = this.game();
    if (!g || g.state.sbIdx == null || g.state.phase === "waiting") return null;
    return this.seatedPlayers()[g.state.sbIdx]?.id ?? null;
  });

  readonly bbPlayerId = computed(() => {
    const g = this.game();
    if (!g || g.state.bbIdx == null || g.state.phase === "waiting") return null;
    return this.seatedPlayers()[g.state.bbIdx]?.id ?? null;
  });

  readonly timerPct = computed(() => {
    const g = this.game();
    if (!g || g.moveTimeLimit <= 0) return 100;
    return Math.round((this.timeLeft() / g.moveTimeLimit) * 100);
  });

  // True when the player can queue a pre-action (game is running, not their turn, still in hand)
  readonly canPreAct = computed(() => {
    const g = this.game();
    const p = this.player();
    if (!g || !p) return false;
    const phase = g.state.phase;
    if (phase === "waiting" || phase === "showdown") return false;
    if (this.isMyTurn()) return false;
    const me = g.players.find((x) => x.id === p.id);
    return !!(me && !me.isFolded && !me.isAllIn);
  });

  // Seats split into opponents (top) and my seat (bottom)
  readonly opponentSeats = computed(() => {
    const g = this.game();
    const p = this.player();
    if (!g) return [] as (HoldemPlayer | null)[];
    const opponents = g.players.filter((x) => x.id !== p?.id);
    const slots = g.maxSeats - 1;
    const padded: (HoldemPlayer | null)[] = [...opponents];
    while (padded.length < slots) padded.push(null);
    return padded;
  });

  readonly mySeat = computed(() => {
    const g = this.game();
    const p = this.player();
    if (!g || !p) return null;
    return g.players.find((x) => x.id === p.id) ?? null;
  });

  constructor(private holdem: HoldemService) {
    effect(() => {
      if (this.step() === "landing") this.loadPublicTables();
    });
    // Timer syncs to server-stamped turnStartedAt — survives page reload
    effect(() => {
      const game = this.game();
      const activeId = game?.state.activePlayerId;
      const phase = game?.state.phase;
      if (activeId && game && phase !== "showdown" && phase !== "waiting") {
        this.startTimerFromServer(
          game.state.turnStartedAt as number,
          game.moveTimeLimit,
        );
      } else {
        this.stopTimer();
      }
    });
    // Fire queued pre-action the moment it becomes the player's turn
    effect(() => {
      if (this.isMyTurn()) {
        const pa = this.preAction();
        if (pa) {
          this.preAction.set(null);
          this.executePreAction(pa);
        }
      }
    });
    // Clear stale pre-action when hand resets
    effect(() => {
      const phase = this.game()?.state.phase;
      if (phase === "waiting" || phase === "showdown") {
        this.preAction.set(null);
      }
    });
    // Show floating winner banner once per showdown result
    effect(() => {
      const winners = this.game()?.state.winners;
      const phase = this.game()?.state.phase;
      if (phase === "showdown" && winners?.length) {
        const key = winners.map((w) => w.playerId + w.amount).join(",");
        if (key !== this.lastShowdownKey) {
          this.lastShowdownKey = key;
          this.winnerBannerVisible.set(true);
          setTimeout(() => this.winnerBannerVisible.set(false), 3500);
        }
      }
    });
  }

  private saveSession(gameId: string, playerId: string) {
    try {
      localStorage.setItem(`holdem:${gameId}`, playerId);
    } catch {
      /* storage unavailable */
    }
  }

  private loadSession(gameId: string): string | undefined {
    try {
      return localStorage.getItem(`holdem:${gameId}`) ?? undefined;
    } catch {
      return undefined;
    }
  }

  private startTimerFromServer(startedAtMs: number, limitSeconds: number) {
    this.stopTimer();
    const tick = () => {
      const elapsed = (Date.now() - startedAtMs) / 1000;
      this.timeLeft.set(Math.max(0, Math.ceil(limitSeconds - elapsed)));
    };
    tick();
    this.timerInterval = setInterval(tick, 250);
  }

  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.timeLeft.set(0);
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  ngOnInit(): void {
    const gameId = this.route.snapshot.paramMap.get("gameId");
    if (gameId) {
      this.gameId.set(gameId);
      const storedPlayerId = this.loadSession(gameId);
      if (storedPlayerId) {
        // Silently rejoin when returning via bookmarked URL
        this.joinGame(gameId);
      } else {
        // Show the landing page with this table highlighted for joining
        this.pendingJoinId.set(gameId);
        this.loadPublicTables();
      }
    }
  }

  loadPublicTables() {
    this.publicLoading.set(true);
    this.holdem.getPublicGames().subscribe({
      next: (tables: HoldemGame[]) => {
        this.publicTables.set(tables);
        this.publicLoading.set(false);
      },
      error: () => {
        this.publicTables.set([]);
        this.publicLoading.set(false);
      },
    });
  }

  toCreate() {
    this.step.set("create");
    this.error.set(null);
  }
  startJoin(gameId: string) {
    this.pendingJoinId.set(gameId);
    this.error.set(null);
  }
  cancelJoin() {
    this.pendingJoinId.set(null);
    this.error.set(null);
  }
  toLanding() {
    this.router.navigate(["/holdem"]);
    this.step.set("landing");
    this.pendingJoinId.set(null);
    this.error.set(null);
    this.game.set(null);
    this.player.set(null);
    this.loadPublicTables();
  }

  createGame(event?: Event) {
    event?.preventDefault();
    this.loading.set(true);
    this.holdem
      .createGame({
        maxSeats: this.maxSeats(),
        limitType: this.limitType(),
        moveTimeLimit: this.moveTimeLimit(),
        botCount: this.botCount(),
      })
      .subscribe({
        next: (game: HoldemGame) => {
          this.game.set(game);
          this.joinGame(game.id);
        },
        error: (err) => {
          this.error.set(err?.error?.message || "Create failed");
          this.loading.set(false);
        },
      });
  }

  joinGame(gameId: string) {
    this.loading.set(true);
    const storedPlayerId = this.loadSession(gameId);
    const name = this.displayName();
    if (name) {
      try {
        localStorage.setItem("holdem.displayName", name);
      } catch {
        /* ignore */
      }
    }
    this.holdem.joinGame(gameId, name, storedPlayerId).subscribe({
      next: (player) => {
        this.player.set(player);
        this.saveSession(gameId, player.id);
        this.gameId.set(gameId);
        // Subscribe to live updates first so we don't miss events
        this.subscribeGame(gameId);
        // Fetch authoritative state — also syncs isHost, chips from DB
        this.holdem.getGame(gameId).subscribe((game) => {
          this.game.set(game);
          const me = game.players.find((x) => x.id === player.id);
          if (me) this.player.set(me);
          // Host triggers start directly so we don't rely on SSE delivery
          // of the backend auto-start timeout (which can race with SSE setup).
          const isHost = !!(me?.isHost || player.isHost);
          const seatedCount = game.players.filter(
            (p) => p.isSeated && p.chips > 0,
          ).length;
          if (isHost && game.status === "waiting" && seatedCount >= 2) {
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

  startGame() {
    const game = this.game();
    if (!game) return;
    this.holdem.startHand(game.id).subscribe({
      next: (g) => this.game.set(g),
      error: (err) =>
        this.error.set(err?.error?.message || "Failed to start hand"),
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

  sendAction(action: { type: string; amount?: number }) {
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

  betOrRaise() {
    this.sendAction({
      type: this.callAmount() === 0 ? "bet" : "raise",
      amount: this.raiseAmount(),
    });
  }

  togglePreAction(action: "fold" | "check-fold" | "call-any") {
    this.preAction.set(this.preAction() === action ? null : action);
  }

  private executePreAction(action: "fold" | "check-fold" | "call-any") {
    switch (action) {
      case "fold":
        this.sendAction({ type: "fold" });
        break;
      case "check-fold":
        this.sendAction({ type: this.callAmount() === 0 ? "check" : "fold" });
        break;
      case "call-any":
        this.sendAction({ type: "call" });
        break;
    }
  }

  addBot() {
    const game = this.game();
    if (!game) return;
    this.holdem.addBot(game.id).subscribe({
      next: (g) => {
        this.game.set(g);
        const me = this.player();
        if (me) {
          const updated = g.players.find((p) => p.id === me.id);
          if (updated) this.player.set(updated);
        }
        // Start the hand immediately from the frontend so we don't rely on
        // the backend auto-start SSE race condition
        const seatedCount = g.players.filter(
          (p) => p.isSeated && p.chips > 0,
        ).length;
        if (g.status === "waiting" && seatedCount >= 2) {
          this.holdem
            .startHand(g.id)
            .subscribe({ next: (started) => this.game.set(started) });
        }
      },
      error: (err) =>
        this.error.set(err?.error?.message || "Could not add bot"),
    });
  }

  removeBot(botId: string) {
    const game = this.game();
    if (!game) return;
    this.holdem.removeBot(game.id, botId).subscribe({
      next: (g) => {
        this.game.set(g);
        const me = this.player();
        if (me) {
          const updated = g.players.find((p) => p.id === me.id);
          if (updated) this.player.set(updated);
        }
      },
      error: (err) =>
        this.error.set(err?.error?.message || "Could not remove bot"),
    });
  }

  formatCard(c: string): string {
    if (!c || c.length < 2) return c;
    const rank = c[0] === "T" ? "10" : c[0];
    const suits: Record<string, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };
    return rank + (suits[c[1]] ?? c[1]);
  }

  isRedCard(c: string): boolean {
    return c?.[1] === "h" || c?.[1] === "d";
  }
}
