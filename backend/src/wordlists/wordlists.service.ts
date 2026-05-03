import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wordlist } from './entities/wordlist.entity';
import { Word } from './entities/word.entity';
import { CreateWordlistDto } from './dto/create-wordlist.dto';
import { UpdateWordlistDto } from './dto/update-wordlist.dto';

@Injectable()
export class WordlistsService {
  constructor(
    @InjectRepository(Wordlist)
    private readonly wordlistRepo: Repository<Wordlist>,
    @InjectRepository(Word)
    private readonly wordRepo: Repository<Word>,
  ) {}

  async findAll(): Promise<Wordlist[]> {
    return this.wordlistRepo.find();
  }

  async findOne(id: string): Promise<Wordlist> {
    const wordlist = await this.wordlistRepo.findOne({
      where: { id },
      relations: ['words'],
    });
    if (!wordlist) {
      throw new NotFoundException(`Wordlist with ID ${id} not found`);
    }
    return wordlist;
  }

  async create(dto: CreateWordlistDto): Promise<Wordlist> {
    const wordlist = this.wordlistRepo.create({
      name: dto.name,
      description: dto.description,
    });
    const savedWordlist = await this.wordlistRepo.save(wordlist);

    if (dto.words && dto.words.length > 0) {
      const words = dto.words.map((w) =>
        this.wordRepo.create({ text: w.text, wordlistId: savedWordlist.id }),
      );
      await this.wordRepo.save(words);
      savedWordlist.words = words;
    }

    return this.findOne(savedWordlist.id);
  }

  async update(id: string, dto: UpdateWordlistDto): Promise<Wordlist> {
    const wordlist = await this.findOne(id);

    if (dto.name !== undefined) wordlist.name = dto.name;
    if (dto.description !== undefined) wordlist.description = dto.description;

    if (dto.words) {
      await this.wordRepo.delete({ wordlistId: id });
      const words = dto.words.map((w) =>
        this.wordRepo.create({ text: w.text, wordlistId: id }),
      );
      await this.wordRepo.save(words);
      wordlist.words = words;
    }

    await this.wordlistRepo.save(wordlist);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.wordlistRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Wordlist with ID ${id} not found`);
    }
  }

  async addWord(wordlistId: string, wordDto: { text: string }): Promise<Wordlist> {
    const wordlist = await this.findOne(wordlistId);
    const word = this.wordRepo.create({
      text: wordDto.text,
      wordlistId,
    });
    await this.wordRepo.save(word);
    return this.findOne(wordlistId);
  }

  async removeWord(wordlistId: string, wordId: string): Promise<Wordlist> {
    await this.findOne(wordlistId);
    await this.wordRepo.delete(wordId);
    return this.findOne(wordlistId);
  }
}
