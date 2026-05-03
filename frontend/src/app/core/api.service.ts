import { Injectable } from "@angular/core";
import { HttpClient, HttpParams } from "@angular/common/http";
import { Observable } from "rxjs";
import { HostedGameSnapshot, Wordlist, BingoCard } from "./models";

@Injectable({
  providedIn: "root",
})
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  // Public endpoint
  getConfig(): Observable<any> {
    return this.http.get("/api/config");
  }

  // Public endpoints
  getWordlists(): Observable<Wordlist[]> {
    return this.http.get<Wordlist[]>("/api/wordlists");
  }

  getWordlist(id: string): Observable<Wordlist> {
    return this.http.get<Wordlist>(`/api/wordlists/${id}`);
  }

  // Public endpoint
  generateCard(wordlistId: string): Observable<BingoCard> {
    const params = new HttpParams().set("wordlistId", wordlistId.trim());

    return this.http.get<BingoCard>("/api/bingo/generate", {
      params,
    });
  }

  createGame(
    wordlistId: string,
    hostName: string,
  ): Observable<HostedGameSnapshot> {
    return this.http.post<HostedGameSnapshot>("/api/games", {
      wordlistId: wordlistId.trim(),
      hostName: hostName.trim(),
    });
  }

  getGame(joinCode: string, playerId: string): Observable<HostedGameSnapshot> {
    const params = new HttpParams().set("playerId", playerId);
    return this.http.get<HostedGameSnapshot>(
      `/api/games/${joinCode.trim().toUpperCase()}`,
      {
        params,
      },
    );
  }

  joinGame(
    joinCode: string,
    displayName: string,
  ): Observable<HostedGameSnapshot> {
    return this.http.post<HostedGameSnapshot>(
      `/api/games/${joinCode.trim().toUpperCase()}/join`,
      { displayName: displayName.trim() },
    );
  }

  startGame(
    joinCode: string,
    playerId: string,
  ): Observable<HostedGameSnapshot> {
    return this.http.post<HostedGameSnapshot>(
      `/api/games/${joinCode.trim().toUpperCase()}/start`,
      { playerId },
    );
  }

  toggleStamp(
    joinCode: string,
    playerId: string,
    row: number,
    col: number,
  ): Observable<HostedGameSnapshot> {
    return this.http.post<HostedGameSnapshot>(
      `/api/games/${joinCode.trim().toUpperCase()}/stamps`,
      { playerId, row, col },
    );
  }
}
