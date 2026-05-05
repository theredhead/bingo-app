import {
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal,
} from "@angular/core";
import { HoldemGame, HoldemPlayer } from "../holdem.service";
import {
  avatarOf,
  nameOf,
  cardRank,
  cardSuit,
  isRedCard,
} from "../holdem.constants";

@Component({
  selector: "app-holdem-table",
  standalone: true,
  templateUrl: "./holdem-table.component.html",
  styleUrl: "./holdem-table.component.css",
})
export class HoldemTableComponent implements OnDestroy {
  // Signal inputs
  game = input.required<HoldemGame>();
  player = input<HoldemPlayer | null>(null);

  // Template helpers (exposed as properties for template binding)
  readonly avatarOf = avatarOf;
  readonly nameOf = nameOf;
  readonly cardRank = cardRank;
  readonly cardSuit = cardSuit;
  readonly isRedCard = isRedCard;

  // Local UI state
  readonly raiseAmount = signal(20);
  readonly preAction = signal<"fold" | "check-fold" | "call-any" | null>(null);
  readonly winnerBannerVisible = signal(false);
  readonly tappedSeatId = signal<string | null>(null);
  readonly timeLeft = signal(0);

  // Responsive card geometry — extend viewBox bottom on mobile so cards can be ~2× larger
  readonly isMobile = signal(
    typeof window !== "undefined" && window.innerWidth < 600,
  );

  readonly svgViewBox = computed(() =>
    this.isMobile() ? "0 0 400 640" : "0 0 400 575",
  );

  /** All geometry needed to draw both hole cards in SVG coordinates. */
  readonly cardGeom = computed(() => {
    if (this.isMobile()) {
      // ~1.9× the desktop pixel size at typical mobile viewport
      return {
        c1x: 128,
        c2x: 208,
        y: 516,
        w: 72,
        h: 102,
        rankXOff: 6,
        rankYOff: 25,
        suitXOff: 36,
        suitYOff: 75,
        rankSize: 16,
        suitSize: 32,
      };
    }
    return {
      c1x: 156,
      c2x: 206,
      y: 508,
      w: 38,
      h: 54,
      rankXOff: 6,
      rankYOff: 13,
      suitXOff: 19,
      suitYOff: 40,
      rankSize: 11,
      suitSize: 21,
    };
  });

  /** Geometry for the 5 community (board) cards — ~1.5× larger on mobile. */
  readonly boardGeom = computed(() => {
    if (this.isMobile()) {
      const w = 42,
        h = 58,
        gap = 5;
      const startX = Math.round((400 - (5 * w + 4 * gap)) / 2); // 85
      return {
        startX,
        step: w + gap,
        y: 216,
        w,
        h,
        rankXOff: 6,
        rankYOff: 18,
        rankSize: 14,
        suitXOff: 21,
        suitYOff: 45,
        suitSize: 22,
      };
    }
    const w = 28,
      h = 40,
      gap = 4;
    return {
      startX: 122,
      step: w + gap,
      y: 222,
      w,
      h,
      rankXOff: 4,
      rankYOff: 12,
      rankSize: 10,
      suitXOff: 14,
      suitYOff: 33,
      suitSize: 16,
    };
  });

  private lastShowdownKey = "";
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private readonly resizeHandler = () =>
    this.isMobile.set(window.innerWidth < 600);

  // Computed game state
  readonly isHost = computed(() => {
    const p = this.player();
    if (!p) return false;
    const fromGame = this.game().players.find((x) => x.id === p.id);
    return !!(fromGame?.isHost || p.isHost);
  });

  readonly callAmount = computed(() => {
    const p = this.player();
    if (!p) return 0;
    const g = this.game();
    return Math.max(
      0,
      (g.state?.currentBet ?? 0) - (g.state?.bets?.[p.id] ?? 0),
    );
  });

  readonly isMyTurn = computed(() => {
    const p = this.player();
    return !!p && this.game().state?.activePlayerId === p.id;
  });

  readonly minRaise = computed(
    () => (this.game().state?.currentBet ?? 0) * 2 || 20,
  );

  readonly seatedPlayers = computed(() =>
    this.game().players.filter((p) => p.isSeated && p.chips > 0),
  );

  readonly dealerPlayerId = computed(() => {
    const g = this.game();
    if (g.state.dealerIdx == null || g.state.phase === "waiting") return null;
    return this.seatedPlayers()[g.state.dealerIdx]?.id ?? null;
  });

  readonly sbPlayerId = computed(() => {
    const g = this.game();
    if (g.state.sbIdx == null || g.state.phase === "waiting") return null;
    return this.seatedPlayers()[g.state.sbIdx]?.id ?? null;
  });

  readonly bbPlayerId = computed(() => {
    const g = this.game();
    if (g.state.bbIdx == null || g.state.phase === "waiting") return null;
    return this.seatedPlayers()[g.state.bbIdx]?.id ?? null;
  });

  readonly timerPct = computed(() => {
    const g = this.game();
    if (g.moveTimeLimit <= 0) return 100;
    return Math.round((this.timeLeft() / g.moveTimeLimit) * 100);
  });

  readonly canPreAct = computed(() => {
    const p = this.player();
    if (!p) return false;
    const phase = this.game().state.phase;
    if (phase === "waiting" || phase === "showdown") return false;
    if (this.isMyTurn()) return false;
    const me = this.game().players.find((x) => x.id === p.id);
    return !!(me && !me.isFolded && !me.isAllIn);
  });

  readonly opponentSeats = computed(() => {
    const g = this.game();
    const p = this.player();
    const opponents = g.players.filter((x) => x.id !== p?.id);
    const slots = g.maxSeats - 1;
    const padded: (HoldemPlayer | null)[] = [...opponents];
    while (padded.length < slots) padded.push(null);
    return padded;
  });

  readonly mySeat = computed(() => {
    const p = this.player();
    if (!p) return null;
    return this.game().players.find((x) => x.id === p.id) ?? null;
  });

  /** SVG arc positions (viewBox 400×575) for opponent seats */
  readonly seatPositions = computed((): { x: number; y: number }[] => {
    const n = this.game().maxSeats - 1;
    const cx = 200,
      cy = 235,
      rx = 183,
      ry = 112;
    const startDeg = 145,
      endDeg = 35;
    return Array.from({ length: n }, (_, i) => {
      const deg = n === 1 ? 90 : startDeg - (i / (n - 1)) * (startDeg - endDeg);
      const rad = (deg * Math.PI) / 180;
      return {
        x: +(cx + rx * Math.cos(rad)).toFixed(1),
        y: +(cy - ry * Math.sin(rad)).toFixed(1),
      };
    });
  });

  // Outputs
  readonly action = output<{ type: string; amount?: number }>();
  readonly startGame = output<void>();
  readonly leave = output<void>();
  readonly addBot = output<void>();
  readonly removeBot = output<string>();
  readonly sitHere = output<void>();

  constructor() {
    // Sync timer to server-stamped turnStartedAt
    effect(() => {
      const g = this.game();
      const phase = g.state.phase;
      if (
        g.state.activePlayerId &&
        phase !== "showdown" &&
        phase !== "waiting"
      ) {
        this.startTimerFromServer(
          g.state.turnStartedAt as number,
          g.moveTimeLimit,
        );
      } else {
        this.stopTimer();
      }
    });

    // Fire queued pre-action when it becomes the player's turn
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
      const phase = this.game().state.phase;
      if (phase === "waiting" || phase === "showdown") this.preAction.set(null);
    });

    // Show winner banner once per showdown result
    effect(() => {
      const winners = this.game().state.winners;
      if (this.game().state.phase === "showdown" && winners?.length) {
        const key = winners.map((w) => w.playerId + w.amount).join(",");
        if (key !== this.lastShowdownKey) {
          this.lastShowdownKey = key;
          this.winnerBannerVisible.set(true);
          setTimeout(() => this.winnerBannerVisible.set(false), 5000);
        }
      }
    });

    window.addEventListener("resize", this.resizeHandler);
  }

  ngOnDestroy() {
    this.stopTimer();
    window.removeEventListener("resize", this.resizeHandler);
  }

  betOrRaise() {
    this.action.emit({
      type: this.callAmount() === 0 ? "bet" : "raise",
      amount: this.raiseAmount(),
    });
  }

  togglePreAction(pa: "fold" | "check-fold" | "call-any") {
    this.preAction.set(this.preAction() === pa ? null : pa);
  }

  private executePreAction(pa: "fold" | "check-fold" | "call-any") {
    switch (pa) {
      case "fold":
        this.action.emit({ type: "fold" });
        break;
      case "check-fold":
        this.action.emit({ type: this.callAmount() === 0 ? "check" : "fold" });
        break;
      case "call-any":
        this.action.emit({ type: "call" });
        break;
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
}
