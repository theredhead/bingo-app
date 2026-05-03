import {
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { HoldemGame } from "./entities/holdem-game.entity";
import { HoldemPlayer } from "./entities/holdem-player.entity";
import { Subject } from "rxjs";
import { makeDeck, shuffle, bestHandScore, handName } from "./cards";

const BIG_BLIND = 10;
const SMALL_BLIND = 5;

@Injectable()
export class HoldemService implements OnApplicationBootstrap {
  private gameSubjects = new Map<string, Subject<any>>();
  /** One pending auto-fold timeout per game (human turns only) */
  private turnTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

  private clearTurnTimeout(gameId: string) {
    const t = this.turnTimeouts.get(gameId);
    if (t) {
      clearTimeout(t);
      this.turnTimeouts.delete(gameId);
    }
  }

  /** Set activePlayerId + timestamp together, then schedule server auto-fold */
  private assignTurn(game: HoldemGame, playerId: string | null) {
    game.state.activePlayerId = playerId;
    game.state.turnStartedAt = playerId ? Date.now() : null;
    this.clearTurnTimeout(game.id);
    if (!playerId || game.moveTimeLimit <= 0) return;
    const activePlayer = game.players.find((p) => p.id === playerId);
    if (activePlayer && this.isBot(activePlayer)) return; // bot handles itself
    const timeout = setTimeout(
      () =>
        this.playerAction(game.id, { type: "fold", playerId }).catch(() => {}),
      game.moveTimeLimit * 1000 + 800, // +800ms grace for network
    );
    this.turnTimeouts.set(game.id, timeout);
  }

  constructor(
    @InjectRepository(HoldemGame) private gameRepo: Repository<HoldemGame>,
    @InjectRepository(HoldemPlayer)
    private playerRepo: Repository<HoldemPlayer>,
  ) {}

  async onApplicationBootstrap() {
    await this.playerRepo.clear();
    await this.gameRepo.clear();
    console.log("[holdem] cleared stale games on startup");
  }
  async getPublicGames() {
    return this.gameRepo.find({
      where: [{ status: "waiting" }, { status: "active" }],
      relations: ["players"],
      order: { status: "ASC" },
    });
  }

  async createGame(dto: any) {
    const game = this.gameRepo.create({
      status: "waiting",
      maxSeats: dto.maxSeats || 6,
      limitType: dto.limitType || "no-limit",
      moveTimeLimit: dto.moveTimeLimit || 30,
      players: [],
      actions: [],
      state: { phase: "waiting", board: [], pot: 0, currentBet: 0 },
    });
    await this.gameRepo.save(game);
    const botCount = Math.min(dto.botCount ?? 0, game.maxSeats - 1);
    if (botCount > 0) {
      const bots: HoldemPlayer[] = [];
      for (let i = 0; i < botCount; i++) {
        bots.push(
          this.playerRepo.create({
            displayName: `Bot ${i + 1}`,
            isHost: false,
            chips: 1000,
            isSeated: true,
            isFolded: false,
            isAllIn: false,
            cards: [],
            game,
          }),
        );
      }
      await this.playerRepo.save(bots);
      game.players = bots;
      await this.gameRepo.save(game);
    }
    return game;
  }

  async joinGame(gameId: string, dto: any) {
    const game = await this.loadGame(gameId);
    if (!game) throw new NotFoundException("Game not found");

    // Idempotent rejoin: if the caller knows their playerId, return them immediately
    if (dto.playerId) {
      const existing = game.players.find((p) => p.id === dto.playerId);
      if (existing) {
        this.emit(game);
        return existing;
      }
    }

    if (game.players.length >= game.maxSeats) throw new Error("Table full");
    const humanPlayers = game.players.filter((p) => !this.isBot(p));
    const player = this.playerRepo.create({
      displayName: dto.displayName,
      isHost: humanPlayers.length === 0,
      chips: 1000,
      isSeated: true,
      isFolded: false,
      isAllIn: false,
      cards: [],
      game,
    });
    await this.playerRepo.save(player);
    game.players.push(player);
    await this.gameRepo.save(game);
    this.emit(game);

    // Auto-start as soon as there are 2+ seated players
    const seated = game.players.filter((p) => p.isSeated && p.chips > 0);
    if (game.status === "waiting" && seated.length >= 2) {
      setTimeout(
        () =>
          this.startHand(game.id).catch((err) =>
            console.error("[holdem] auto-start failed:", err),
          ),
        1500,
      );
    }

    return player;
  }

  async startHand(gameId: string) {
    const game = await this.loadGame(gameId);
    if (!game) throw new NotFoundException("Game not found");
    if (game.status === "active") return game; // already running – no-op
    const seated = game.players.filter((p) => p.isSeated && p.chips > 0);
    if (seated.length < 2) throw new Error("Need at least 2 players");

    for (const p of game.players) {
      p.isFolded = false;
      p.isAllIn = false;
      p.cards = [];
    }
    await this.playerRepo.save(game.players);

    const deck = shuffle(makeDeck());
    const prevDealerIdx = game.state?.dealerIdx ?? -1;
    const dealerIdx = (prevDealerIdx + 1) % seated.length;
    const sbIdx =
      seated.length === 2 ? dealerIdx : (dealerIdx + 1) % seated.length;
    const bbIdx = (sbIdx + 1) % seated.length;

    for (const p of seated) {
      p.cards = [deck.pop()!, deck.pop()!];
    }
    await this.playerRepo.save(seated);

    seated[sbIdx].chips -= SMALL_BLIND;
    seated[bbIdx].chips -= BIG_BLIND;
    await this.playerRepo.save([seated[sbIdx], seated[bbIdx]]);

    const bets: Record<string, number> = {};
    const acted: Record<string, boolean> = {};
    for (const p of seated) {
      bets[p.id] = 0;
      acted[p.id] = false;
    }
    bets[seated[sbIdx].id] = SMALL_BLIND;
    bets[seated[bbIdx].id] = BIG_BLIND;
    acted[seated[sbIdx].id] = true; // SB has acted (posted blind)

    const firstToActIdx = (bbIdx + 1) % seated.length;

    game.status = "active";
    game.state = {
      phase: "preflop",
      board: [],
      pot: SMALL_BLIND + BIG_BLIND,
      currentBet: BIG_BLIND,
      bets,
      acted,
      deck,
      dealerIdx,
      sbIdx,
      bbIdx,
      activePlayerId: seated[firstToActIdx].id,
      turnStartedAt: Date.now(),
      winners: null,
    };
    game.actions = [];
    await this.gameRepo.save(game);
    this.emit(game);
    // Schedule server-side auto-fold for the first human turn
    this.assignTurn(game, game.state.activePlayerId);
    this.scheduleBotIfNeeded(game, seated);
    return game;
  }

  async playerAction(
    gameId: string,
    dto: { type: string; amount?: number; playerId?: string },
  ) {
    const game = await this.loadGame(gameId);
    if (!game) throw new NotFoundException("Game not found");
    if (!game.state?.activePlayerId) return game;
    if (dto.playerId && dto.playerId !== game.state.activePlayerId) return game;

    const activePlayer = game.players.find(
      (p) => p.id === game.state.activePlayerId,
    );
    if (!activePlayer) return game;

    const currentBet: number = game.state.currentBet ?? 0;
    const playerBet: number = game.state.bets?.[activePlayer.id] ?? 0;
    const callAmount = Math.max(0, currentBet - playerBet);

    switch (dto.type) {
      case "fold":
        activePlayer.isFolded = true;
        await this.playerRepo.save(activePlayer);
        game.state.acted[activePlayer.id] = true;
        game.actions.push({ name: activePlayer.displayName, type: "fold" });
        break;

      case "check":
        if (callAmount > 0) return game;
        game.state.acted[activePlayer.id] = true;
        game.actions.push({ name: activePlayer.displayName, type: "check" });
        break;

      case "call": {
        const actual = Math.min(callAmount, activePlayer.chips);
        activePlayer.chips -= actual;
        game.state.bets[activePlayer.id] = playerBet + actual;
        game.state.pot += actual;
        if (activePlayer.chips === 0) activePlayer.isAllIn = true;
        game.state.acted[activePlayer.id] = true;
        game.actions.push({
          name: activePlayer.displayName,
          type: "call",
          amount: actual,
        });
        await this.playerRepo.save(activePlayer);
        break;
      }

      case "raise":
      case "bet": {
        const targetBet = dto.amount ?? currentBet * 2;
        const additional = Math.max(0, targetBet - playerBet);
        const actual = Math.min(additional, activePlayer.chips);
        activePlayer.chips -= actual;
        const newBet = playerBet + actual;
        game.state.bets[activePlayer.id] = newBet;
        game.state.pot += actual;
        game.state.currentBet = newBet;
        if (activePlayer.chips === 0) activePlayer.isAllIn = true;
        for (const pid of Object.keys(game.state.acted)) {
          if (pid !== activePlayer.id) game.state.acted[pid] = false;
        }
        game.state.acted[activePlayer.id] = true;
        game.actions.push({
          name: activePlayer.displayName,
          type: dto.type,
          amount: newBet,
        });
        await this.playerRepo.save(activePlayer);
        break;
      }
    }

    const freshGame = await this.loadGame(gameId);
    if (!freshGame) return game;
    freshGame.state = game.state;
    freshGame.actions = game.actions;
    await this.gameRepo.save(freshGame);

    const activePlayers = freshGame.players.filter(
      (p) => p.isSeated && !p.isFolded,
    );
    if (activePlayers.length === 1) {
      await this.awardPot(freshGame, activePlayers, "Last player standing");
      this.emit(freshGame);
      this.scheduleNextHand(freshGame);
      return freshGame;
    }

    if (this.isBettingComplete(freshGame)) {
      await this.advanceStreet(freshGame);
    } else {
      const seated = freshGame.players.filter(
        (p) => p.isSeated && !p.isFolded && !p.isAllIn && p.chips > 0,
      );
      const idx = seated.findIndex((p) => p.id === activePlayer.id);
      const nextId = this.nextActivePlayerId(freshGame, seated, idx);
      this.assignTurn(freshGame, nextId);
      await this.gameRepo.save(freshGame);
    }

    this.emit(freshGame);
    this.scheduleBotIfNeeded(
      freshGame,
      freshGame.players.filter((p) => p.isSeated && p.chips > 0),
    );
    return freshGame;
  }

  async addBot(gameId: string): Promise<HoldemGame> {
    const game = await this.loadGame(gameId);
    if (!game) throw new NotFoundException("Game not found");
    const seated = game.players.filter((p) => p.isSeated);
    if (seated.length >= game.maxSeats) throw new Error("Table full");

    const existingBotCount = game.players.filter((p) => this.isBot(p)).length;
    const bot = this.playerRepo.create({
      displayName: `Bot ${existingBotCount + 1}`,
      isHost: false,
      chips: 1000,
      isSeated: true,
      isFolded: false,
      isAllIn: false,
      cards: [],
      game,
    });
    await this.playerRepo.save(bot);
    game.players.push(bot);
    await this.gameRepo.save(game);
    this.emit(game);

    const seatedNow = game.players.filter((p) => p.isSeated && p.chips > 0);
    if (game.status === "waiting" && seatedNow.length >= 2) {
      setTimeout(
        () =>
          this.startHand(game.id).catch((err) =>
            console.error("[holdem] auto-start after addBot:", err),
          ),
        1500,
      );
    }
    return game;
  }

  async removeBot(gameId: string, botId: string): Promise<HoldemGame> {
    const game = await this.loadGame(gameId);
    if (!game) throw new NotFoundException("Game not found");
    const bot = game.players.find((p) => p.id === botId && this.isBot(p));
    if (!bot) throw new NotFoundException("Bot not found");

    // If it's this bot's turn, fold them first so hand state advances cleanly
    if (game.state?.activePlayerId === botId && game.status === "active") {
      await this.playerAction(gameId, { type: "fold", playerId: botId });
    }

    const entity = await this.playerRepo.findOne({ where: { id: botId } });
    if (entity) await this.playerRepo.remove(entity);

    const fresh = await this.loadGame(gameId);
    if (!fresh) throw new NotFoundException("Game not found");

    // If the bot was still in the hand (not active but not yet folded),
    // check if betting is now complete and advance the street if needed
    if (
      game.status === "active" &&
      !bot.isFolded &&
      game.state?.activePlayerId !== botId &&
      this.isBettingComplete(fresh)
    ) {
      await this.advanceStreet(fresh);
    }

    this.emit(fresh);
    return fresh;
  }

  async getGame(gameId: string) {
    return this.loadGame(gameId);
  }

  gameEvents(gameId: string) {
    if (!this.gameSubjects.has(gameId)) {
      this.gameSubjects.set(gameId, new Subject());
    }
    return this.gameSubjects.get(gameId)!.asObservable();
  }

  // ─── Internals ───────────────────────────────────────────────────────────────

  private isBettingComplete(game: HoldemGame): boolean {
    const active = game.players.filter(
      (p) => p.isSeated && !p.isFolded && !p.isAllIn && p.chips > 0,
    );
    if (active.length === 0) return true;
    const currentBet: number = game.state.currentBet ?? 0;
    for (const p of active) {
      if (!game.state.acted[p.id]) return false;
      if ((game.state.bets?.[p.id] ?? 0) < currentBet) return false;
    }
    return true;
  }

  private nextActivePlayerId(
    game: HoldemGame,
    seated: HoldemPlayer[],
    currentIdx: number,
  ): string {
    const n = seated.length;
    for (let i = 1; i <= n; i++) {
      const p = seated[(currentIdx + i) % n];
      if (!p.isFolded && !p.isAllIn && p.chips > 0) return p.id;
    }
    return seated[currentIdx]?.id;
  }

  private async advanceStreet(game: HoldemGame) {
    const deck: string[] = game.state.deck ?? [];
    const activePlayers = game.players.filter((p) => p.isSeated && !p.isFolded);
    const bets: Record<string, number> = {};
    const acted: Record<string, boolean> = {};
    for (const p of activePlayers) {
      bets[p.id] = 0;
      acted[p.id] = false;
    }
    game.state.bets = bets;
    game.state.acted = acted;
    game.state.currentBet = 0;

    switch (game.state.phase) {
      case "preflop":
        game.state.board = [deck.pop()!, deck.pop()!, deck.pop()!];
        game.state.phase = "flop";
        break;
      case "flop":
        game.state.board.push(deck.pop()!);
        game.state.phase = "turn";
        break;
      case "turn":
        game.state.board.push(deck.pop()!);
        game.state.phase = "river";
        break;
      case "river":
        await this.showdown(game);
        return;
      default:
        return;
    }

    const seatedAll = game.players.filter((p) => p.isSeated);
    const dealerIdx: number = game.state.dealerIdx ?? 0;
    let nextId: string | null = null;
    for (let i = 1; i <= seatedAll.length; i++) {
      const p = seatedAll[(dealerIdx + i) % seatedAll.length];
      if (!p.isFolded && !p.isAllIn && p.chips > 0) {
        nextId = p.id;
        break;
      }
    }
    this.assignTurn(game, nextId);

    await this.gameRepo.save(game);

    const canAct = game.players.filter(
      (p) => p.isSeated && !p.isFolded && !p.isAllIn && p.chips > 0,
    );
    if (canAct.length <= 1) {
      await this.advanceStreet(game);
    }
  }

  private async showdown(game: HoldemGame) {
    const board: string[] = game.state.board ?? [];
    const activePlayers = game.players.filter((p) => p.isSeated && !p.isFolded);
    let bestScore = -1;
    let winners: HoldemPlayer[] = [];
    for (const p of activePlayers) {
      const score = bestHandScore([...p.cards, ...board]);
      if (score > bestScore) {
        bestScore = score;
        winners = [p];
      } else if (score === bestScore) winners.push(p);
    }
    await this.awardPot(game, winners, handName(bestScore));
    this.scheduleNextHand(game);
  }

  private async awardPot(
    game: HoldemGame,
    winners: HoldemPlayer[],
    hand: string,
  ) {
    const pot: number = game.state.pot ?? 0;
    const share = Math.floor(pot / winners.length);
    for (const w of winners) w.chips += share;
    await this.playerRepo.save(winners);

    game.state.phase = "showdown";
    game.state.winners = winners.map((w) => ({
      playerId: w.id,
      name: w.displayName,
      hand,
      cards: w.cards,
      amount: share,
    }));
    this.assignTurn(game, null); // clears timeout + sets activePlayerId null

    const broke = game.players.filter((p) => p.chips <= 0 && p.isSeated);
    for (const p of broke) p.isSeated = false;
    if (broke.length) await this.playerRepo.save(broke);

    if (game.players.filter((p) => p.isSeated && p.chips > 0).length < 2) {
      game.status = "completed";
    } else {
      // Reset to waiting so startHand() guard doesn't block the next deal
      game.status = "waiting";
    }
    await this.gameRepo.save(game);
  }

  private scheduleNextHand(game: HoldemGame) {
    const remaining = game.players.filter((p) => p.isSeated && p.chips > 0);
    if (remaining.length >= 2) {
      setTimeout(
        () =>
          this.startHand(game.id).catch((err) =>
            console.error("[holdem] auto-next-hand failed:", err),
          ),
        4000,
      );
    }
  }

  private scheduleBotIfNeeded(game: HoldemGame, seated: HoldemPlayer[]) {
    if (!game.state?.activePlayerId) return;
    if (["showdown", "waiting"].includes(game.state.phase)) return;
    const activePlayer = game.players.find(
      (p) => p.id === game.state.activePlayerId,
    );
    if (!activePlayer || !this.isBot(activePlayer)) return;
    const delay = 800 + Math.random() * 1200;
    const playerId = activePlayer.id;
    setTimeout(() => this.performBotAction(game.id, playerId), delay);
  }

  private async performBotAction(gameId: string, playerId: string) {
    const game = await this.loadGame(gameId);
    if (!game || game.state?.activePlayerId !== playerId) return;
    const player = game.players.find((p) => p.id === playerId);
    if (!player || !this.isBot(player)) return;

    const currentBet: number = game.state.currentBet ?? 0;
    const playerBet: number = game.state.bets?.[playerId] ?? 0;
    const callAmount = Math.max(0, currentBet - playerBet);
    const rand = Math.random();

    if (callAmount === 0) {
      if (rand < 0.75) {
        await this.playerAction(gameId, { type: "check", playerId });
      } else {
        await this.playerAction(gameId, {
          type: "bet",
          amount: BIG_BLIND * 2,
          playerId,
        });
      }
    } else {
      if (rand < 0.6) {
        await this.playerAction(gameId, { type: "call", playerId });
      } else if (rand < 0.85) {
        await this.playerAction(gameId, { type: "fold", playerId });
      } else {
        await this.playerAction(gameId, {
          type: "raise",
          amount: currentBet * 2,
          playerId,
        });
      }
    }
  }

  private isBot(player: HoldemPlayer): boolean {
    return player.displayName.startsWith("Bot");
  }

  private loadGame(gameId: string) {
    return this.gameRepo.findOne({
      where: { id: gameId },
      relations: ["players"],
    });
  }

  private emit(game: HoldemGame): void {
    const subj = this.gameSubjects.get(game.id);
    if (subj) subj.next(game);
  }
}
