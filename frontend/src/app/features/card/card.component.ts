import { Component, OnDestroy, OnInit, inject, signal } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ApiService } from "../../core/api.service";
import { CommonModule } from "@angular/common";
import { HttpErrorResponse } from "@angular/common/http";

@Component({
  selector: "app-card",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./card.component.html",
  styleUrl: "./card.component.css",
})
export class CardComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);

  readonly card = signal<string[][] | null>(null);
  readonly loading = signal(true);
  readonly error = signal("");
  readonly stampedCells = signal<Set<string>>(new Set());
  readonly hasBingo = signal(false);
  wordlistId = "";
  private audioCtx: AudioContext | null = null;

  ngOnInit() {
    this.wordlistId = this.route.snapshot.paramMap.get("wordlistId") || "";
    this.loadCard();
  }

  isStamped(row: number, col: number, value: string): boolean {
    if (value === "FREE") {
      return true;
    }

    return this.stampedCells().has(this.cellKey(row, col));
  }

  toggleStamp(row: number, col: number, value: string) {
    if (value === "FREE") {
      return;
    }

    const wasBingo = this.hasBingo();

    this.stampedCells.update((existing) => {
      const next = new Set(existing);
      const key = this.cellKey(row, col);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

    const card = this.card();
    if (card) {
      const nowBingo = this.detectBingo(card, this.stampedCells());
      this.hasBingo.set(nowBingo);
      if (!wasBingo && nowBingo) {
        this.playWinSound();
      }
    }
  }

  detectBingo(card: string[][], stamped: Set<string>): boolean {
    const ok = (r: number, c: number) =>
      card[r][c] === "FREE" || stamped.has(this.cellKey(r, c));

    for (let r = 0; r < 5; r++) {
      if ([0, 1, 2, 3, 4].every((c) => ok(r, c))) return true;
    }
    for (let c = 0; c < 5; c++) {
      if ([0, 1, 2, 3, 4].every((r) => ok(r, c))) return true;
    }
    if ([0, 1, 2, 3, 4].every((i) => ok(i, i))) return true;
    if ([0, 1, 2, 3, 4].every((i) => ok(i, 4 - i))) return true;

    return false;
  }

  ngOnDestroy() {
    this.audioCtx?.close();
  }

  private cellKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  private playWinSound(): void {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      this.audioCtx?.close();
      this.audioCtx = new AudioCtx();
      const ctx = this.audioCtx;
      // Ascending fanfare: C5 E5 G5 C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "triangle";
        const t = ctx.currentTime + i * 0.13;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch {
      // audio unavailable in this environment
    }
  }

  private loadCard() {
    if (!this.wordlistId) {
      this.card.set(null);
      this.error.set("Missing wordlist ID. Return to Home and try again.");
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set("");
    this.stampedCells.set(new Set());
    this.hasBingo.set(false);

    this.apiService.generateCard(this.wordlistId).subscribe({
      next: (response) => {
        this.card.set(response.card);
        this.loading.set(false);
      },
      error: (err: unknown) => {
        let reason = "Please try another wordlist.";

        if (err instanceof HttpErrorResponse) {
          const backendMessage = err.error?.message;
          if (typeof backendMessage === "string" && backendMessage.trim()) {
            reason = backendMessage.trim();
          } else if (
            Array.isArray(backendMessage) &&
            backendMessage.length > 0
          ) {
            reason = backendMessage.join(", ");
          } else if (err.status) {
            reason = `Request failed (${err.status}).`;
          }
        } else if (typeof err === "object" && err !== null) {
          const errorLike = err as {
            status?: number;
            error?: { message?: string | string[] };
          };
          const backendMessage = errorLike.error?.message;
          if (typeof backendMessage === "string" && backendMessage.trim()) {
            reason = backendMessage.trim();
          } else if (
            Array.isArray(backendMessage) &&
            backendMessage.length > 0
          ) {
            reason = backendMessage.join(", ");
          } else if (
            typeof errorLike.status === "number" &&
            errorLike.status > 0
          ) {
            reason = `Request failed (${errorLike.status}).`;
          }
        }

        this.card.set(null);
        this.error.set(`Could not load bingo card. ${reason}`);
        this.loading.set(false);
      },
    });
  }
}
