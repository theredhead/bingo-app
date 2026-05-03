import { Controller, Get, Post, Body, Put, Param, Delete } from '@nestjs/common';
import { WordlistsService } from './wordlists.service';
import { CreateWordlistDto } from './dto/create-wordlist.dto';
import { UpdateWordlistDto } from './dto/update-wordlist.dto';

@Controller('api/wordlists')
export class WordlistsController {
  constructor(private readonly wordlistsService: WordlistsService) {}

  @Get()
  findAll() {
    return this.wordlistsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.wordlistsService.findOne(id);
  }

  @Post()
  create(@Body() createWordlistDto: CreateWordlistDto) {
    return this.wordlistsService.create(createWordlistDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateWordlistDto: UpdateWordlistDto) {
    return this.wordlistsService.update(id, updateWordlistDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.wordlistsService.remove(id);
  }

  @Post(':id/words')
  addWord(@Param('id') id: string, @Body() word: { text: string }) {
    return this.wordlistsService.addWord(id, word);
  }

  @Delete(':id/words/:wordId')
  removeWord(@Param('id') id: string, @Param('wordId') wordId: string) {
    return this.wordlistsService.removeWord(id, wordId);
  }
}
