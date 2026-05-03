import { Injectable } from "@angular/core";

@Injectable({
  providedIn: "root",
})
export class PlayerSessionService {
  private readonly playerNameKey = "bingo.playerName";
  private readonly playerIdPrefix = "bingo.playerId.";

  getPlayerName(): string {
    try {
      return localStorage.getItem(this.playerNameKey) ?? "";
    } catch {
      return "";
    }
  }

  setPlayerName(name: string): void {
    try {
      localStorage.setItem(this.playerNameKey, name.trim());
    } catch {
      // local storage unavailable
    }
  }

  getPlayerId(joinCode: string): string {
    try {
      return (
        localStorage.getItem(
          this.playerIdPrefix + joinCode.trim().toUpperCase(),
        ) ?? ""
      );
    } catch {
      return "";
    }
  }

  setPlayerId(joinCode: string, playerId: string): void {
    try {
      localStorage.setItem(
        this.playerIdPrefix + joinCode.trim().toUpperCase(),
        playerId,
      );
    } catch {
      // local storage unavailable
    }
  }
}
