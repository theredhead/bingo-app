import { Module } from "@nestjs/common";
import { BingoService } from "./bingo.service";
import { BingoController } from "./bingo.controller";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Wordlist } from "../wordlists/entities/wordlist.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Wordlist])],
  controllers: [BingoController],
  providers: [BingoService],
  exports: [BingoService],
})
export class BingoModule {}
