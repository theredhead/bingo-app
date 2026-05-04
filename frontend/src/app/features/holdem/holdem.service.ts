import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, shareReplay } from "rxjs";

export interface HoldemWinner {
  playerId: string;
  name: string;
  hand: string;
  cards: string[];
  amount: number;
}

export interface HoldemGameState {
  phase: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
  board: string[];
  pot: number;
  currentBet: number;
  bets: Record<string, number> | undefined;
  acted: Record<string, boolean> | undefined;
  dealerIdx: number | undefined;
  sbIdx: number | undefined;
  bbIdx: number | undefined;
  activePlayerId: string | null;
  turnStartedAt: number | null;
  winners: HoldemWinner[] | null;
}

export interface HoldemGame {
  id: string;
  status: "waiting" | "active" | "completed";
  maxSeats: number;
  limitType: "no-limit" | "pot-limit" | "fixed-limit";
  moveTimeLimit: number;
  players: HoldemPlayer[];
  actions: any[];
  state: HoldemGameState;
}

export interface HoldemPlayer {
  id: string;
  displayName: string;
  chips: number;
  isHost: boolean;
  isSeated: boolean;
  isFolded: boolean;
  isAllIn: boolean;
  cards: string[];
}

@Injectable({ providedIn: "root" })
export class HoldemService {
  constructor(private http: HttpClient) {}

  /** Generates a UUID v4 using getRandomValues (works on HTTP, unlike randomUUID) */
  private generateUUID(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant bits
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  /** Returns the persistent account UUID stored in localStorage, creating one if needed */
  getAccountId(): string {
    let id = localStorage.getItem("holdem_account_id");
    if (!id) {
      id = this.generateUUID();
      localStorage.setItem("holdem_account_id", id);
    }
    return id;
  }

  getBalance() {
    return this.http.get<{ balance: number; dailyBonusAwarded?: boolean }>(
      `/api/holdem/account/${this.getAccountId()}/balance`,
    );
  }

  getPublicGames() {
    return this.http.get<HoldemGame[]>("/api/holdem/public");
  }

  createGame(opts: Partial<HoldemGame> & { botCount?: number }) {
    return this.http.post<HoldemGame>("/api/holdem/create", opts);
  }

  joinGame(gameId: string, displayName: string, playerId?: string) {
    return this.http.post<HoldemPlayer>(`/api/holdem/${gameId}/join`, {
      displayName,
      accountId: this.getAccountId(),
      ...(playerId ? { playerId } : {}),
    });
  }

  startHand(gameId: string) {
    return this.http.post<HoldemGame>(`/api/holdem/${gameId}/start`, {});
  }

  getGame(gameId: string) {
    return this.http.get<HoldemGame>(`/api/holdem/${gameId}`);
  }

  playerAction(gameId: string, action: any) {
    return this.http.patch<HoldemGame>(`/api/holdem/${gameId}/action`, action);
  }

  addBot(gameId: string) {
    return this.http.post<HoldemGame>(`/api/holdem/${gameId}/bots`, {});
  }

  leaveGame(gameId: string, playerId: string) {
    return this.http.delete(`/api/holdem/${gameId}/players/${playerId}`);
  }

  removeBot(gameId: string, botId: string) {
    return this.http.delete<HoldemGame>(`/api/holdem/${gameId}/bots/${botId}`);
  }

  gameEvents(gameId: string): Observable<HoldemGame> {
    return new Observable<HoldemGame>((observer) => {
      let es: EventSource;
      let destroyed = false;
      let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

      const connect = () => {
        if (destroyed) return;
        es = new EventSource(`/api/holdem/${gameId}/events`);
        es.onmessage = (event) => {
          try {
            observer.next(JSON.parse(event.data) as HoldemGame);
          } catch {
            // ignore malformed frames
          }
        };
        es.onerror = () => {
          es.close();
          if (!destroyed) {
            reconnectTimeout = setTimeout(connect, 1500);
          }
        };
      };

      connect();

      return () => {
        destroyed = true;
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        es?.close();
      };
    }).pipe(shareReplay(1));
  }
}
