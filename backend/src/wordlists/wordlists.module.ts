import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { WordlistsService } from './wordlists.service';
import { WordlistsController } from './wordlists.controller';
import { Wordlist } from './entities/wordlist.entity';
import { Word } from './entities/word.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wordlist, Word]),
    ConfigModule,
  ],
  controllers: [WordlistsController],
  providers: [WordlistsService],
  exports: [WordlistsService],
})
export class WordlistsModule {}
