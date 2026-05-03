import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { HostedGameSnapshot } from "./models";

@Injectable({
  providedIn: "root",
})
export class GameEventsService {
  watchGame(
    joinCode: string,
    playerId: string,
  ): Observable<HostedGameSnapshot> {
    return new Observable<HostedGameSnapshot>((observer) => {
      const params = new URLSearchParams({ playerId });
      const source = new EventSource(
        `/api/games/${encodeURIComponent(joinCode)}/events?${params.toString()}`,
      );

      source.onmessage = (event) => {
        try {
          observer.next(JSON.parse(event.data) as HostedGameSnapshot);
        } catch (error) {
          observer.error(error);
        }
      };

      source.onerror = (error) => {
        observer.error(error);
      };

      return () => source.close();
    });
  }
}
