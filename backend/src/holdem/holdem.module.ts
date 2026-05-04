import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HoldemController } from "./holdem.controller";
import { HoldemService } from "./holdem.service";
import { HoldemGame } from "./entities/holdem-game.entity";
import { HoldemPlayer } from "./entities/holdem-player.entity";
import { PlayerAccount } from "./entities/player-account.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([HoldemGame, HoldemPlayer, PlayerAccount]),
  ],
  controllers: [HoldemController],
  providers: [HoldemService],
})
export class HoldemModule {}
