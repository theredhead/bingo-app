import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
} from "@angular/core";

interface ConfettiPiece {
  id: number;
  left: number;
  width: number;
  height: number;
  delayMs: number;
  durationMs: number;
  driftPx: number;
  spinDeg: number;
  color: string;
  shape: "rect" | "circle" | "strip";
}

@Component({
  selector: "app-confetti-overlay",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./confetti-overlay.component.html",
  styleUrl: "./confetti-overlay.component.css",
})
export class ConfettiOverlayComponent implements OnChanges, OnDestroy {
  @Input() active = false;
  @Input() token = 0;

  readonly pieces = signal<ConfettiPiece[]>([]);
  private clearTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["active"] && !this.active) {
      this.pieces.set([]);
      if (this.clearTimer) {
        clearTimeout(this.clearTimer);
      }
      return;
    }

    if (this.active && (changes["token"] || changes["active"])) {
      this.launch();
    }
  }

  ngOnDestroy(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }
  }

  private launch(): void {
    if (this.clearTimer) {
      clearTimeout(this.clearTimer);
    }

    const pieces = this.generatePieces(90);
    this.pieces.set(pieces);

    const longestMs = Math.max(
      ...pieces.map((piece) => piece.delayMs + piece.durationMs),
    );

    this.clearTimer = setTimeout(() => {
      this.pieces.set([]);
    }, longestMs + 200);
  }

  private generatePieces(count: number): ConfettiPiece[] {
    const colors = [
      "#f77f00",
      "#e63946",
      "#43aa8b",
      "#577590",
      "#f9c74f",
      "#90be6d",
      "#f94144",
      "#277da1",
    ];

    return Array.from({ length: count }, (_, id) => {
      const width = this.randomBetween(5, 14);
      const isCircle = Math.random() < 0.25;
      const isStrip = !isCircle && Math.random() < 0.25;
      const height = isCircle
        ? width
        : isStrip
          ? this.randomBetween(14, 26)
          : this.randomBetween(8, 18);

      return {
        id,
        left: this.randomBetween(1, 99),
        width,
        height,
        delayMs: this.randomBetween(0, 1200),
        durationMs: this.randomBetween(2100, 4300),
        driftPx: this.randomBetween(-170, 170),
        spinDeg: this.randomBetween(320, 1180),
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: isCircle ? "circle" : isStrip ? "strip" : "rect",
      };
    });
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
