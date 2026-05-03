import { Test, TestingModule } from "@nestjs/testing";
import { of } from "rxjs";
import { GamesController } from "./games.controller";
import { GamesService } from "./games.service";

describe("GamesController", () => {
  let controller: GamesController;

  const snapshot = {
    game: {
      id: "game-1",
      joinCode: "ABC123",
      wordlistId: "wordlist-1",
      status: "pending" as const,
      winnerPlayerId: null,
      startedAt: null,
      endedAt: null,
    },
    players: [
      {
        id: "player-1",
        displayName: "Host",
        isHost: true,
        joinedAt: new Date("2026-05-03T00:00:00.000Z"),
      },
    ],
    playerId: "player-1",
    card: [["FREE"]],
    stampedKeys: [],
    canStart: true,
  };

  const mockService = {
    createGame: jest.fn(),
    getGame: jest.fn(),
    joinGame: jest.fn(),
    startGame: jest.fn(),
    toggleStamp: jest.fn(),
    watchGame: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GamesController],
      providers: [{ provide: GamesService, useValue: mockService }],
    }).compile();

    controller = module.get<GamesController>(GamesController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("creates a hosted game", async () => {
    mockService.createGame.mockResolvedValue(snapshot);

    const dto = { wordlistId: "wordlist-1", hostName: "Host" };
    await expect(controller.createGame(dto)).resolves.toEqual(snapshot);
    expect(mockService.createGame).toHaveBeenCalledWith(dto);
  });

  it("fetches a game snapshot for a reconnecting player", async () => {
    mockService.getGame.mockResolvedValue(snapshot);

    await expect(controller.getGame("ABC123", "player-1")).resolves.toEqual(
      snapshot,
    );
    expect(mockService.getGame).toHaveBeenCalledWith("ABC123", "player-1");
  });

  it("joins a pending game", async () => {
    mockService.joinGame.mockResolvedValue(snapshot);

    const dto = { displayName: "Guest" };
    await expect(controller.joinGame("ABC123", dto)).resolves.toEqual(snapshot);
    expect(mockService.joinGame).toHaveBeenCalledWith("ABC123", dto);
  });

  it("starts a game", async () => {
    mockService.startGame.mockResolvedValue(snapshot);

    const dto = { playerId: "player-1" };
    await expect(controller.startGame("ABC123", dto)).resolves.toEqual(
      snapshot,
    );
    expect(mockService.startGame).toHaveBeenCalledWith("ABC123", dto);
  });

  it("toggles a stamp", async () => {
    mockService.toggleStamp.mockResolvedValue(snapshot);

    const dto = { playerId: "player-1", row: 0, col: 1 };
    await expect(controller.toggleStamp("ABC123", dto)).resolves.toEqual(
      snapshot,
    );
    expect(mockService.toggleStamp).toHaveBeenCalledWith("ABC123", dto);
  });

  it("streams live game events", () => {
    const events$ = of({ data: snapshot } as MessageEvent);
    mockService.watchGame.mockReturnValue(events$);

    expect(controller.watchGame("ABC123", "player-1")).toBe(events$);
    expect(mockService.watchGame).toHaveBeenCalledWith("ABC123", "player-1");
  });
});
