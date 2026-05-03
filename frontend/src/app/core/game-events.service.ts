import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HostedGameSnapshot } from "./models";

@Injectable({
  providedIn: "root",
})
export class GameEventsService {
  private readonly reconnectDelayMs = 2000;

  watchGame(
    joinCode: string,
    playerId: string,
  ): Observable<HostedGameSnapshot> {
    return new Observable<HostedGameSnapshot>((observer) => {
      const params = new URLSearchParams({ playerId });
      const url = `/api/games/${encodeURIComponent(joinCode)}/events?${params.toString()}`;
      let source: EventSource | null = null;
      let reconnectTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
      let closed = false;

      const clearReconnectTimer = () => {
        if (reconnectTimer !== undefined) {
          globalThis.clearTimeout(reconnectTimer);
          reconnectTimer = undefined;
        }
      };

      const connect = () => {
        if (closed) {
          return;
        }

        source = new EventSource(url);

        source.onmessage = (event) => {
          try {
            observer.next(JSON.parse(event.data) as HostedGameSnapshot);
          } catch (error) {
            closed = true;
            clearReconnectTimer();
            source?.close();
            observer.error(error);
          }
        };

        source.onerror = () => {
          source?.close();
          source = null;

          if (closed || reconnectTimer !== undefined) {
            return;
          }

          reconnectTimer = globalThis.setTimeout(() => {
            reconnectTimer = undefined;
            connect();
          }, this.reconnectDelayMs);
        };
      };

      connect();

      return () => {
        closed = true;
        clearReconnectTimer();
        source?.close();
      };
    });
  }
}
