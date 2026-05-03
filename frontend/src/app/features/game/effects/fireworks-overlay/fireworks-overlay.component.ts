import { CommonModule } from "@angular/common";
import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  signal,
} from "@angular/core";

interface FireworkBurst {
  id: number;
  left: number;
  top: number;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  color: string;
}

@Component({
  selector: "app-fireworks-overlay",
  standalone: true,
  imports: [CommonModule],
  templateUrl: "./fireworks-overlay.component.html",
  styleUrl: "./fireworks-overlay.component.css",
})
export class FireworksOverlayComponent implements OnChanges, OnDestroy {
  @Input() active = false;
  @Input() token = 0;

  readonly bursts = signal<FireworkBurst[]>([]);
  readonly rayAngles = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  private clearTimer?: ReturnType<typeof setTimeout>;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["active"] && !this.active) {
      this.bursts.set([]);
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

    const bursts = this.generateBursts(10);
    this.bursts.set(bursts);

    const longestMs = Math.max(
      ...bursts.map((burst) => burst.delayMs + burst.durationMs),
    );

    this.clearTimer = setTimeout(() => {
      this.bursts.set([]);
    }, longestMs + 200);
  }

  private generateBursts(count: number): FireworkBurst[] {
    const colors = [
      "#ffb703",
      "#fb8500",
      "#8ecae6",
      "#219ebc",
      "#ff4d6d",
      "#80ed99",
      "#b5179e",
      "#ffd166",
    ];

    return Array.from({ length: count }, (_, id) => ({
      id,
      left: this.randomBetween(10, 90),
      top: this.randomBetween(12, 52),
      sizePx: this.randomBetween(72, 148),
      delayMs: this.randomBetween(0, 1700),
      durationMs: this.randomBetween(900, 1800),
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
