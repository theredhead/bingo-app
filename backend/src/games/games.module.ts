import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BingoModule } from "../bingo/bingo.module";
import { GamesController } from "./games.controller";
import { Game } from "./entities/game.entity";
import { GamePlayer } from "./entities/game-player.entity";
import { GamesService } from "./games.service";

@Module({
  imports: [TypeOrmModule.forFeature([Game, GamePlayer]), BingoModule],
  controllers: [GamesController],
  providers: [GamesService],
  exports: [GamesService],
})
export class GamesModule {}
