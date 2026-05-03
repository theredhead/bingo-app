import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router } from "@angular/router";
import { of } from "rxjs";
import { ApiService } from "../../core/api.service";
import { PlayerSessionService } from "../../core/player-session.service";
import { HostSetupComponent } from "./host-setup.component";

describe("HostSetupComponent", () => {
  let component: HostSetupComponent;
  let fixture: ComponentFixture<HostSetupComponent>;
  let apiService: {
    createGame: ReturnType<typeof vi.fn>;
  };
  let router: {
    navigate: ReturnType<typeof vi.fn>;
  };
  let session: {
    getPlayerName: ReturnType<typeof vi.fn>;
    setPlayerName: ReturnType<typeof vi.fn>;
    setPlayerId: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    apiService = {
      createGame: vi.fn(),
    };
    router = {
      navigate: vi.fn(),
    };
    session = {
      getPlayerName: vi.fn().mockReturnValue("Stored Name"),
      setPlayerName: vi.fn(),
      setPlayerId: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HostSetupComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router },
        { provide: PlayerSessionService, useValue: session },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: vi.fn().mockReturnValue("wordlist-1"),
              },
            },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HostSetupComponent);
    component = fixture.componentInstance;
  });

  it("prefills the stored player name", () => {
    fixture.detectChanges();

    expect(component.playerName).toBe("Stored Name");
  });

  it("creates a game, stores identity, and navigates to the game page", () => {
    apiService.createGame.mockReturnValue(
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
        playerId: "player-1",
        players: [],
        card: [],
        stampedKeys: [],
        canStart: true,
      }),
    );

    fixture.detectChanges();
    component.playerName = "Host";
    component.createGame();

    expect(apiService.createGame).toHaveBeenCalledWith("wordlist-1", "Host");
    expect(session.setPlayerName).toHaveBeenCalledWith("Host");
    expect(session.setPlayerId).toHaveBeenCalledWith("ABC123", "player-1");
    expect(router.navigate).toHaveBeenCalledWith(["/games", "ABC123"]);
  });
});
