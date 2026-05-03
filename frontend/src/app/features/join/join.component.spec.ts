import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { ApiService } from "../../core/api.service";
import { PlayerSessionService } from "../../core/player-session.service";
import { JoinComponent } from "./join.component";

describe("JoinComponent", () => {
  let component: JoinComponent;
  let fixture: ComponentFixture<JoinComponent>;
  let apiService: { joinGame: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let session: {
    getPlayerName: ReturnType<typeof vi.fn>;
    setPlayerName: ReturnType<typeof vi.fn>;
    getPlayerId: ReturnType<typeof vi.fn>;
    setPlayerId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiService = { joinGame: vi.fn() };
    router = { navigate: vi.fn() };
    session = {
      getPlayerName: vi.fn().mockReturnValue("Stored Guest"),
      setPlayerName: vi.fn(),
      getPlayerId: vi.fn().mockReturnValue(""),
      setPlayerId: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [JoinComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router },
        { provide: PlayerSessionService, useValue: session },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue("abc123"),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinComponent);
    component = fixture.componentInstance;
  });

  it("redirects to the game immediately when a player id is already stored", () => {
    session.getPlayerId.mockReturnValue("existing-player-id");

    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(["/bingo/games", "ABC123"]);
    expect(apiService.joinGame).not.toHaveBeenCalled();
  });

  it("prefills the stored player name and uppercases the join code", () => {
    fixture.detectChanges();

    expect(component.playerName).toBe("Stored Guest");
    expect(component.joinCode).toBe("ABC123");
  });

  it("joins a game, stores identity, and navigates to the game page", () => {
    apiService.joinGame.mockReturnValue(
      of({
        game: {
          id: "game-1",
          joinCode: "ABC123",
          wordlistId: "wordlist-1",
          status: "pending",
          winnerPlayerId: null,
          startedAt: null,
          endedAt: null,
        },
        playerId: "player-2",
        players: [],
        card: [],
        stampedKeys: [],
        canStart: false,
      }),
    );

    fixture.detectChanges();
    component.playerName = "Guest";
    component.joinGame();

    expect(apiService.joinGame).toHaveBeenCalledWith("ABC123", "Guest");
    expect(session.setPlayerName).toHaveBeenCalledWith("Guest");
    expect(session.setPlayerId).toHaveBeenCalledWith("ABC123", "player-2");
    expect(router.navigate).toHaveBeenCalledWith(["/bingo/games", "ABC123"]);
  });

  it("shows an error when joining fails", () => {
    apiService.joinGame.mockReturnValue(throwError(() => new Error("boom")));

    fixture.detectChanges();
    component.playerName = "Guest";
    component.joinGame();

    expect(component.loading()).toBe(false);
    expect(component.error()).toContain("Could not join that game");
  });
});
