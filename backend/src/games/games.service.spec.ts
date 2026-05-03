import { BadRequestException, NotFoundException } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BingoService } from "../bingo/bingo.service";
import { Game } from "./entities/game.entity";
import { GamePlayer } from "./entities/game-player.entity";
import { GamesService } from "./games.service";

describe("GamesService", () => {
  let service: GamesService;
  let gameRepo: Repository<Game>;
  let playerRepo: Repository<GamePlayer>;

  const gameStore = new Map<string, Game>();
  const playerStore = new Map<string, GamePlayer>();
  let gameSeq = 1;
  let playerSeq = 1;

  const cloneGame = (game: Game): Game => ({
    ...game,
    players: (game.players ?? []).map((player: GamePlayer) => ({
      ...player,
      card: player.card.map((row: string[]) => [...row]),
      stampedKeys: [...player.stampedKeys],
      placement: player.placement,
    })),
  });

  const mockGameRepo = {
    create: jest.fn((input: Partial<Game>) => input),
    save: jest.fn(async (input: Partial<Game>) => {
      const game: Game = {
        id: input.id ?? `game-${gameSeq++}`,
        joinCode: input.joinCode ?? "ABCDE1",
        wordlistId: input.wordlistId ?? "wordlist-1",
        status: input.status ?? "pending",
        startedAt: input.startedAt ?? null,
        endedAt: input.endedAt ?? null,
        winnerPlayerId: input.winnerPlayerId ?? null,
        createdAt: input.createdAt ?? new Date("2026-05-03T00:00:00.000Z"),
        updatedAt: new Date("2026-05-03T00:00:00.000Z"),
        players: input.players ?? [],
      } as Game;
      gameStore.set(game.id, cloneGame(game));
      return cloneGame(game);
    }),
    findOne: jest.fn(async ({ where }: { where: Partial<Game> }) => {
      const game = [...gameStore.values()].find((entry) => {
        return Object.entries(where).every(
          ([key, value]) =>
            (entry as unknown as Record<string, unknown>)[key] === value,
        );
      });
      if (!game) {
        return null;
      }

      const players = [...playerStore.values()].filter(
        (player) => player.gameId === game.id,
      );
      return cloneGame({ ...game, players });
    }),
  };

  const mockPlayerRepo = {
    create: jest.fn((input: Partial<GamePlayer>) => input),
    save: jest.fn(async (input: Partial<GamePlayer>) => {
      const player: GamePlayer = {
        id: input.id ?? `player-${playerSeq++}`,
        gameId: input.gameId ?? "game-1",
        displayName: input.displayName ?? "Player",
        card: input.card ?? [],
        stampedKeys: input.stampedKeys ?? [],
        joinedAt: input.joinedAt ?? new Date("2026-05-03T00:00:00.000Z"),
        isHost: input.isHost ?? false,
        placement: input.placement ?? null,
        game: input.game ?? (undefined as unknown as Game),
      } as GamePlayer;
      playerStore.set(player.id, {
        ...player,
        card: player.card.map((row: string[]) => [...row]),
        stampedKeys: [...player.stampedKeys],
      });
      return {
        ...player,
        card: player.card.map((row: string[]) => [...row]),
        stampedKeys: [...player.stampedKeys],
      };
    }),
    findOne: jest.fn(async ({ where }: { where: Partial<GamePlayer> }) => {
      const player = [...playerStore.values()].find((entry) => {
        return Object.entries(where).every(
          ([key, value]) =>
            (entry as unknown as Record<string, unknown>)[key] === value,
        );
      });
      if (!player) {
        return null;
      }
      return {
        ...player,
        card: player.card.map((row: string[]) => [...row]),
        stampedKeys: [...player.stampedKeys],
      };
    }),
  };

  const mockBingoService = {
    generateCard: jest.fn(),
  };

  beforeEach(async () => {
    gameStore.clear();
    playerStore.clear();
    gameSeq = 1;
    playerSeq = 1;

    mockBingoService.generateCard.mockReset();
    mockGameRepo.create.mockClear();
    mockGameRepo.save.mockClear();
    mockGameRepo.findOne.mockClear();
    mockPlayerRepo.create.mockClear();
    mockPlayerRepo.save.mockClear();
    mockPlayerRepo.findOne.mockClear();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamesService,
        { provide: getRepositoryToken(Game), useValue: mockGameRepo },
        { provide: getRepositoryToken(GamePlayer), useValue: mockPlayerRepo },
        { provide: BingoService, useValue: mockBingoService },
      ],
    }).compile();

    service = module.get<GamesService>(GamesService);
    gameRepo = module.get<Repository<Game>>(getRepositoryToken(Game));
    playerRepo = module.get<Repository<GamePlayer>>(
      getRepositoryToken(GamePlayer),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
    expect(gameRepo).toBeDefined();
    expect(playerRepo).toBeDefined();
  });

  it("creates a pending game with a host player and card", async () => {
    mockBingoService.generateCard.mockResolvedValue([
      ["A1", "A2", "A3", "A4", "A5"],
      ["B1", "B2", "B3", "B4", "B5"],
      ["C1", "C2", "FREE", "C4", "C5"],
      ["D1", "D2", "D3", "D4", "D5"],
      ["E1", "E2", "E3", "E4", "E5"],
    ]);

    const result = await service.createGame({
      wordlistId: "wordlist-1",
      hostName: "Host",
    });

    expect(result.game.status).toBe("pending");
    expect(result.playerId).toBeDefined();
    expect(result.players).toHaveLength(1);
    expect(result.players[0].displayName).toBe("Host");
    expect(result.card?.[2][2]).toBe("FREE");
    expect(mockBingoService.generateCard).toHaveBeenCalledWith("wordlist-1");
  });

  it("allows a second player to join while the game is pending", async () => {
    mockBingoService.generateCard
      .mockResolvedValueOnce([
        ["A1", "A2", "A3", "A4", "A5"],
        ["B1", "B2", "B3", "B4", "B5"],
        ["C1", "C2", "FREE", "C4", "C5"],
        ["D1", "D2", "D3", "D4", "D5"],
        ["E1", "E2", "E3", "E4", "E5"],
      ])
      .mockResolvedValueOnce([
        ["F1", "F2", "F3", "F4", "F5"],
        ["G1", "G2", "G3", "G4", "G5"],
        ["H1", "H2", "FREE", "H4", "H5"],
        ["I1", "I2", "I3", "I4", "I5"],
        ["J1", "J2", "J3", "J4", "J5"],
      ]);

    const created = await service.createGame({
      wordlistId: "wordlist-1",
      hostName: "Host",
    });

    const joined = await service.joinGame(created.game.joinCode, {
      displayName: "Guest",
    });

    expect(joined.players).toHaveLength(2);
    expect(joined.players.map((player) => player.displayName)).toEqual([
      "Host",
      "Guest",
    ]);
    expect(joined.card?.[0][0]).toBe("F1");
  });

  it("returns the same stored player session when the player reconnects later", async () => {
    mockBingoService.generateCard.mockResolvedValue([
      ["A1", "A2", "A3", "A4", "A5"],
      ["B1", "B2", "B3", "B4", "B5"],
      ["C1", "C2", "FREE", "C4", "C5"],
      ["D1", "D2", "D3", "D4", "D5"],
      ["E1", "E2", "E3", "E4", "E5"],
    ]);

    const created = await service.createGame({
      wordlistId: "wordlist-1",
      hostName: "Host",
    });
    const hostPlayerId = created.playerId as string;

    await service.startGame(created.game.joinCode, { playerId: hostPlayerId });
    await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 0,
    });

    const reconnected = await service.getGame(
      created.game.joinCode,
      hostPlayerId,
    );

    expect(reconnected.playerId).toBe(hostPlayerId);
    expect(reconnected.card).toEqual(created.card);
    expect(reconnected.stampedKeys).toEqual(["0-0"]);
    expect(reconnected.game.status).toBe("active");
  });

  it("prevents joining after the host starts the game", async () => {
    mockBingoService.generateCard.mockResolvedValue([
      ["A1", "A2", "A3", "A4", "A5"],
      ["B1", "B2", "B3", "B4", "B5"],
      ["C1", "C2", "FREE", "C4", "C5"],
      ["D1", "D2", "D3", "D4", "D5"],
      ["E1", "E2", "E3", "E4", "E5"],
    ]);

    const created = await service.createGame({
      wordlistId: "wordlist-1",
      hostName: "Host",
    });
    const hostPlayerId = created.playerId as string;

    await service.startGame(created.game.joinCode, { playerId: hostPlayerId });

    await expect(
      service.joinGame(created.game.joinCode, { displayName: "Late" }),
    ).rejects.toThrow(BadRequestException);
  });

  it("marks the game complete when a player reaches bingo", async () => {
    mockBingoService.generateCard.mockResolvedValue([
      ["A1", "A2", "A3", "A4", "A5"],
      ["B1", "B2", "B3", "B4", "B5"],
      ["C1", "C2", "FREE", "C4", "C5"],
      ["D1", "D2", "D3", "D4", "D5"],
      ["E1", "E2", "E3", "E4", "E5"],
    ]);

    const created = await service.createGame({
      wordlistId: "wordlist-1",
      hostName: "Host",
    });
    const hostPlayerId = created.playerId as string;

    await service.startGame(created.game.joinCode, { playerId: hostPlayerId });

    await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 0,
    });
    await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 1,
    });
    await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 2,
    });
    await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 3,
    });
    const result = await service.toggleStamp(created.game.joinCode, {
      playerId: hostPlayerId,
      row: 0,
      col: 4,
    });

    expect(result.game.status).toBe("completed");
    const hostPlayer = result.players.find((p) => p.id === hostPlayerId);
    expect(hostPlayer?.placement).toBe(1);
  });

  it("throws if the requested game does not exist", async () => {
    await expect(service.getGame("MISSING")).rejects.toThrow(NotFoundException);
  });
});
