import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ActivatedRoute, Router } from "@angular/router";
import { of, Subject, throwError } from "rxjs";
import { ApiService } from "../../core/api.service";
import { GameEventsService } from "../../core/game-events.service";
import { HostedGameSnapshot } from "../../core/models";
import { PlayerSessionService } from "../../core/player-session.service";
import { QrCodeService } from "../../core/qr-code.service";
import { GameComponent } from "./game.component";

describe("GameComponent", () => {
  let component: GameComponent;
  let fixture: ComponentFixture<GameComponent>;
  let apiService: {
    getGame: ReturnType<typeof vi.fn>;
    startGame: ReturnType<typeof vi.fn>;
    toggleStamp: ReturnType<typeof vi.fn>;
  };
  let eventsService: { watchGame: ReturnType<typeof vi.fn> };
  let playerSession: { getPlayerId: ReturnType<typeof vi.fn> };
  let qrCodeService: { toDataUrl: ReturnType<typeof vi.fn> };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let events$: Subject<HostedGameSnapshot>;

  const pendingSnapshot: HostedGameSnapshot = {
    game: {
      id: "game-1",
      joinCode: "ABC123",
      wordlistId: "wordlist-1",
      status: "pending",
      winnerPlayerId: null,
      startedAt: null,
      endedAt: null,
    },
    players: [
      {
        id: "player-1",
        displayName: "Host",
        isHost: true,
        joinedAt: "2026-05-03T00:00:00.000Z",
      },
    ],
    playerId: "player-1",
    card: [
      ["A1", "A2", "A3", "A4", "A5"],
      ["B1", "B2", "B3", "B4", "B5"],
      ["C1", "C2", "FREE", "C4", "C5"],
      ["D1", "D2", "D3", "D4", "D5"],
      ["E1", "E2", "E3", "E4", "E5"],
    ],
    stampedKeys: [],
    canStart: true,
  };

  const activeSnapshot: HostedGameSnapshot = {
    ...pendingSnapshot,
    game: {
      ...pendingSnapshot.game,
      status: "active",
      startedAt: "2026-05-03T01:00:00.000Z",
    },
    canStart: false,
  };

  beforeEach(async () => {
    events$ = new Subject<HostedGameSnapshot>();
    apiService = {
      getGame: vi.fn(),
      startGame: vi.fn(),
      toggleStamp: vi.fn(),
    };
    eventsService = {
      watchGame: vi.fn().mockReturnValue(events$.asObservable()),
    };
    playerSession = {
      getPlayerId: vi.fn().mockReturnValue("player-1"),
    };
    qrCodeService = {
      toDataUrl: vi.fn().mockResolvedValue("data:image/png;base64,qr"),
    };
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [GameComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: GameEventsService, useValue: eventsService },
        { provide: PlayerSessionService, useValue: playerSession },
        { provide: QrCodeService, useValue: qrCodeService },
        { provide: Router, useValue: router },
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

    fixture = TestBed.createComponent(GameComponent);
    component = fixture.componentInstance;
  });
  it("redirects to join when no stored player id exists", () => {
    playerSession.getPlayerId.mockReturnValue("");

    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith(["/join", "ABC123"]);
    expect(apiService.getGame).not.toHaveBeenCalled();
  });

  it("reloads the same game session using the stored player id", async () => {
    apiService.getGame.mockReturnValue(of(activeSnapshot));

    fixture.detectChanges();
    await fixture.whenStable();

    expect(apiService.getGame).toHaveBeenCalledWith("ABC123", "player-1");
    expect(eventsService.watchGame).toHaveBeenCalledWith("ABC123", "player-1");
    expect(component.snapshot()?.playerId).toBe("player-1");
    expect(component.snapshot()?.game.status).toBe("active");
  });

  it("starts the game from the lobby", () => {
    apiService.getGame.mockReturnValue(of(pendingSnapshot));
    apiService.startGame.mockReturnValue(of(activeSnapshot));

    fixture.detectChanges();
    component.startGame();

    expect(apiService.startGame).toHaveBeenCalledWith("ABC123", "player-1");
    expect(component.snapshot()?.game.status).toBe("active");
  });

  it("toggles a stamp on an active game cell", () => {
    apiService.getGame.mockReturnValue(of(activeSnapshot));
    apiService.toggleStamp.mockReturnValue(
      of({
        ...activeSnapshot,
        stampedKeys: ["0-1"],
      }),
    );

    fixture.detectChanges();
    component.toggleStamp(0, 1, "A2");

    expect(apiService.toggleStamp).toHaveBeenCalledWith(
      "ABC123",
      "player-1",
      0,
      1,
    );
    expect(component.snapshot()?.stampedKeys).toEqual(["0-1"]);
  });

  it("shows a reconnect error when the initial load fails", () => {
    apiService.getGame.mockReturnValue(throwError(() => new Error("boom")));

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toContain("Could not load that game.");
  });
});
