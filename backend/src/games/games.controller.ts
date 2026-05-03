import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Query,
  Sse,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { CreateGameDto } from "./dto/create-game.dto";
import { JoinGameDto } from "./dto/join-game.dto";
import { StampCellDto } from "./dto/stamp-cell.dto";
import { StartGameDto } from "./dto/start-game.dto";
import { GameSnapshot, GamesService } from "./games.service";

@Controller("api/games")
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  createGame(@Body() dto: CreateGameDto): Promise<GameSnapshot> {
    return this.gamesService.createGame(dto);
  }

  @Get(":joinCode")
  getGame(
    @Param("joinCode") joinCode: string,
    @Query("playerId") playerId?: string,
  ): Promise<GameSnapshot> {
    return this.gamesService.getGame(joinCode, playerId);
  }

  @Post(":joinCode/join")
  joinGame(
    @Param("joinCode") joinCode: string,
    @Body() dto: JoinGameDto,
  ): Promise<GameSnapshot> {
    return this.gamesService.joinGame(joinCode, dto);
  }

  @Post(":joinCode/start")
  startGame(
    @Param("joinCode") joinCode: string,
    @Body() dto: StartGameDto,
  ): Promise<GameSnapshot> {
    return this.gamesService.startGame(joinCode, dto);
  }

  @Post(":joinCode/stamps")
  toggleStamp(
    @Param("joinCode") joinCode: string,
    @Body() dto: StampCellDto,
  ): Promise<GameSnapshot> {
    return this.gamesService.toggleStamp(joinCode, dto);
  }

  @Sse(":joinCode/events")
  watchGame(
    @Param("joinCode") joinCode: string,
    @Query("playerId") playerId?: string,
  ): Observable<MessageEvent> {
    return this.gamesService.watchGame(joinCode, playerId);
  }
}
