import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Sse,
  Delete,
} from "@nestjs/common";
import { HoldemService } from "./holdem.service";
import { Observable, map } from "rxjs";

@Controller("api/holdem")
export class HoldemController {
  constructor(private readonly holdemService: HoldemService) {}

  @Get("public")
  getPublicGames() {
    return this.holdemService.getPublicGames();
  }

  @Post("create")
  createGame(@Body() dto: any) {
    return this.holdemService.createGame(dto);
  }

  @Post(":gameId/start")
  startHand(@Param("gameId") gameId: string) {
    return this.holdemService.startHand(gameId);
  }

  @Post(":gameId/join")
  joinGame(@Param("gameId") gameId: string, @Body() dto: any) {
    return this.holdemService.joinGame(gameId, dto);
  }

  @Patch(":gameId/action")
  playerAction(@Param("gameId") gameId: string, @Body() dto: any) {
    return this.holdemService.playerAction(gameId, dto);
  }

  @Post(":gameId/bots")
  addBot(@Param("gameId") gameId: string) {
    return this.holdemService.addBot(gameId);
  }

  @Delete(":gameId/bots/:botId")
  removeBot(@Param("gameId") gameId: string, @Param("botId") botId: string) {
    return this.holdemService.removeBot(gameId, botId);
  }

  @Get(":gameId")
  getGame(@Param("gameId") gameId: string) {
    return this.holdemService.getGame(gameId);
  }

  @Sse(":gameId/events")
  gameEvents(@Param("gameId") gameId: string): Observable<any> {
    return this.holdemService
      .gameEvents(gameId)
      .pipe(map((game) => ({ data: JSON.stringify(game) })));
  }
}
