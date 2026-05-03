import { TestBed } from "@angular/core/testing";
import { PlayerSessionService } from "./player-session.service";

describe("PlayerSessionService", () => {
  let service: PlayerSessionService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlayerSessionService);
  });

  it("stores and retrieves the player name", () => {
    service.setPlayerName("Kris");

    expect(service.getPlayerName()).toBe("Kris");
  });

  it("stores and retrieves a player id per join code", () => {
    service.setPlayerId("abc123", "player-1");

    expect(service.getPlayerId("ABC123")).toBe("player-1");
  });
});
