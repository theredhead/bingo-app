import {
  BadRequestException,
  Injectable,
  MessageEvent,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { merge, Observable, of, Subject, from } from "rxjs";
import { map, switchMap } from "rxjs/operators";
import { Repository } from "typeorm";
import { BingoService } from "../bingo/bingo.service";
import { CreateGameDto } from "./dto/create-game.dto";
import { JoinGameDto } from "./dto/join-game.dto";
import { StampCellDto } from "./dto/stamp-cell.dto";
import { StartGameDto } from "./dto/start-game.dto";
import { Game } from "./entities/game.entity";
import { GamePlayer } from "./entities/game-player.entity";

interface SnapshotPlayer {
  id: string;
  displayName: string;
  isHost: boolean;
  joinedAt: Date;
  placement?: number | null;
}

interface SnapshotGame {
  id: string;
  joinCode: string;
  wordlistId: string;
  status: "pending" | "active" | "completed";
  winnerPlayerId: string | null;
  startedAt: Date | null;
  endedAt: Date | null;
}

export interface GameSnapshot {
  game: SnapshotGame;
  players: SnapshotPlayer[];
  playerId?: string;
  card?: string[][];
  stampedKeys?: string[];
  winner?: SnapshotPlayer;
  canStart: boolean;
}

@Injectable()
export class GamesService {
  private readonly streams = new Map<string, Subject<void>>();

  constructor(
    @InjectRepository(Game)
    private readonly gameRepo: Repository<Game>,
    @InjectRepository(GamePlayer)
    private readonly playerRepo: Repository<GamePlayer>,
    private readonly bingoService: BingoService,
  ) {}

  async createGame(dto: CreateGameDto): Promise<GameSnapshot> {
    const hostName = this.normalizeName(dto.hostName);
    const joinCode = await this.generateJoinCode();
    const game = await this.gameRepo.save(
      this.gameRepo.create({
        joinCode,
        wordlistId: dto.wordlistId.trim(),
        status: "pending",
        startedAt: null,
        endedAt: null,
        winnerPlayerId: null,
      }),
    );

    const card = await this.bingoService.generateCard(dto.wordlistId.trim());
    const host = await this.playerRepo.save(
      this.playerRepo.create({
        gameId: game.id,
        displayName: hostName,
        isHost: true,
        card,
        stampedKeys: [],
      }),
    );

    const snapshot = await this.getGame(joinCode, host.id);
    this.emit(joinCode);
    return snapshot;
  }

  async getGame(joinCode: string, playerId?: string): Promise<GameSnapshot> {
    const game = await this.findGame(joinCode);
    return this.buildSnapshot(game, playerId);
  }

  async joinGame(joinCode: string, dto: JoinGameDto): Promise<GameSnapshot> {
    const game = await this.findGame(joinCode);
    if (game.status !== "pending") {
      throw new BadRequestException("Game has already started");
    }

    const displayName = this.normalizeName(dto.displayName);
    const duplicate = game.players.find(
      (player) =>
        player.displayName.toLowerCase() === displayName.toLowerCase(),
    );
    if (duplicate) {
      throw new BadRequestException(
        "That name is already in use for this game",
      );
    }

    const card = await this.bingoService.generateCard(game.wordlistId);
    const player = await this.playerRepo.save(
      this.playerRepo.create({
        gameId: game.id,
        displayName,
        isHost: false,
        card,
        stampedKeys: [],
      }),
    );

    const snapshot = await this.getGame(joinCode, player.id);
    this.emit(joinCode);
    return snapshot;
  }

  async startGame(joinCode: string, dto: StartGameDto): Promise<GameSnapshot> {
    const game = await this.findGame(joinCode);
    if (game.status !== "pending") {
      throw new BadRequestException("Game is not waiting to start");
    }

    const host = game.players.find((player) => player.id === dto.playerId);
    if (!host) {
      throw new NotFoundException("Player not found in this game");
    }
    if (!host.isHost) {
      throw new BadRequestException("Only the host can start the game");
    }

    await this.gameRepo.save({
      ...game,
      status: "active",
      startedAt: new Date(),
    });

    const snapshot = await this.getGame(joinCode, dto.playerId);
    this.emit(joinCode);
    return snapshot;
  }

  async toggleStamp(
    joinCode: string,
    dto: StampCellDto,
  ): Promise<GameSnapshot> {
    const game = await this.findGame(joinCode);
    if (game.status !== "active") {
      throw new BadRequestException("Game is not active");
    }

    const player = game.players.find((entry) => entry.id === dto.playerId);
    if (!player) {
      throw new NotFoundException("Player not found in this game");
    }

    const value = player.card[dto.row]?.[dto.col];
    if (!value) {
      throw new BadRequestException("Cell is out of bounds");
    }
    if (value === "FREE") {
      throw new BadRequestException("FREE cell is always stamped");
    }

    // Stamp the WORD (not just coordinates) for ALL players
    // Find where that word appears on each player's card and stamp it there
    for (const p of game.players) {
      const stampedKeys = new Set(p.stampedKeys);

      // Find the coordinates where this word appears on this player's card
      let wordRow = -1;
      let wordCol = -1;
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          if (p.card[row][col] === value) {
            wordRow = row;
            wordCol = col;
            break;
          }
        }
        if (wordRow !== -1) break;
      }

      // If word found on this player's card, toggle its stamp
      if (wordRow !== -1) {
        const key = this.cellKey(wordRow, wordCol);
        if (stampedKeys.has(key)) {
          stampedKeys.delete(key);
        } else {
          stampedKeys.add(key);
        }
      }

      await this.playerRepo.save({
        ...p,
        stampedKeys: [...stampedKeys],
      });
    }

    // Reload game to get fresh player data with updated stamps
    const freshGame = await this.findGame(joinCode);

    // Check all players for bingo and assign placements to newly completed players
    let anyNewBingo = false;
    for (const p of freshGame.players) {
      if (p.placement === null || p.placement === undefined) {
        const stampedKeys = new Set(p.stampedKeys);
        if (this.hasBingo(p.card, stampedKeys)) {
          const completedCount = freshGame.players.filter(
            (pl) => pl.placement !== null && pl.placement !== undefined,
          ).length;
          const newPlacement = completedCount + 1;
          await this.playerRepo.save({
            ...p,
            placement: newPlacement,
          });
          anyNewBingo = true;
        }
      }
    }

    // End game as soon as anyone has bingo
    if (anyNewBingo) {
      await this.gameRepo.save({
        ...freshGame,
        status: "completed",
        endedAt: new Date(),
      });
    }

    const snapshot = await this.getGame(joinCode, dto.playerId);
    this.emit(joinCode);
    return snapshot;
  }

  watchGame(joinCode: string, playerId?: string): Observable<MessageEvent> {
    const normalized = this.normalizeJoinCode(joinCode);
    const stream = this.getStream(normalized);
    return merge(of(undefined), stream).pipe(
      switchMap(() => from(this.getGame(normalized, playerId))),
      map((data) => ({ data })),
    );
  }

  private async findGame(joinCode: string): Promise<Game> {
    const normalized = this.normalizeJoinCode(joinCode);
    const game = await this.gameRepo.findOne({
      where: { joinCode: normalized },
      relations: ["players"],
    });
    if (!game) {
      throw new NotFoundException(
        `Game with join code ${normalized} not found`,
      );
    }
    return game;
  }

  private buildSnapshot(game: Game, playerId?: string): GameSnapshot {
    const players = [...(game.players ?? [])].sort(
      (left, right) =>
        this.toTimestamp(left.joinedAt) - this.toTimestamp(right.joinedAt),
    );
    const currentPlayer = playerId
      ? players.find((player) => player.id === playerId)
      : undefined;
    const winner = game.winnerPlayerId
      ? players.find((player) => player.id === game.winnerPlayerId)
      : undefined;

    return {
      game: {
        id: game.id,
        joinCode: game.joinCode,
        wordlistId: game.wordlistId,
        status: game.status,
        winnerPlayerId: game.winnerPlayerId,
        startedAt: game.startedAt,
        endedAt: game.endedAt,
      },
      players: players.map((player) => ({
        id: player.id,
        displayName: player.displayName,
        isHost: player.isHost,
        joinedAt: this.toDate(player.joinedAt),
        placement: player.placement,
      })),
      playerId: currentPlayer?.id,
      card: currentPlayer?.card,
      stampedKeys: currentPlayer?.stampedKeys ?? [],
      winner: winner
        ? {
            id: winner.id,
            displayName: winner.displayName,
            isHost: winner.isHost,
            joinedAt: this.toDate(winner.joinedAt),
          }
        : undefined,
      canStart: !!currentPlayer?.isHost && game.status === "pending",
    };
  }

  private toTimestamp(value: Date | string): number {
    if (value instanceof Date) {
      return value.getTime();
    }

    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  private toDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private hasBingo(card: string[][], stampedKeys: Set<string>): boolean {
    const isStamped = (row: number, col: number) => {
      return (
        card[row][col] === "FREE" || stampedKeys.has(this.cellKey(row, col))
      );
    };

    for (let row = 0; row < 5; row += 1) {
      if ([0, 1, 2, 3, 4].every((col) => isStamped(row, col))) {
        return true;
      }
    }

    for (let col = 0; col < 5; col += 1) {
      if ([0, 1, 2, 3, 4].every((row) => isStamped(row, col))) {
        return true;
      }
    }

    if ([0, 1, 2, 3, 4].every((index) => isStamped(index, index))) {
      return true;
    }

    return [0, 1, 2, 3, 4].every((index) => isStamped(index, 4 - index));
  }

  private cellKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  private normalizeName(name: string): string {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException("displayName is required");
    }
    return trimmed;
  }

  private normalizeJoinCode(joinCode: string): string {
    const normalized = joinCode?.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException("joinCode is required");
    }
    return normalized;
  }

  private async generateJoinCode(): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = Math.random().toString(36).slice(2, 6).toUpperCase();
      const existing = await this.gameRepo.findOne({
        where: { joinCode: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    throw new BadRequestException("Could not allocate a join code");
  }

  private getStream(joinCode: string): Subject<void> {
    const existing = this.streams.get(joinCode);
    if (existing) {
      return existing;
    }

    const created = new Subject<void>();
    this.streams.set(joinCode, created);
    return created;
  }

  private emit(joinCode: string): void {
    this.getStream(this.normalizeJoinCode(joinCode)).next();
  }
}
