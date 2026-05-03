import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Wordlist } from "../wordlists/entities/wordlist.entity";

@Injectable()
export class BingoService {
  constructor(
    @InjectRepository(Wordlist)
    private readonly wordlistRepo: Repository<Wordlist>,
  ) {}

  async generateCard(wordlistId: string): Promise<string[][]> {
    if (!wordlistId?.trim()) {
      throw new BadRequestException("wordlistId is required");
    }

    let wordlist: Wordlist | null;
    try {
      wordlist = await this.wordlistRepo.findOne({
        where: { id: wordlistId.trim() },
        relations: ["words"],
      });
    } catch {
      throw new BadRequestException("Invalid wordlistId");
    }

    if (!wordlist) {
      throw new NotFoundException(`Wordlist with ID ${wordlistId} not found`);
    }

    if (!wordlist.words || wordlist.words.length < 24) {
      throw new BadRequestException(
        `Wordlist must have at least 24 words. Current count: ${wordlist.words?.length || 0}`,
      );
    }

    // Fisher-Yates shuffle
    const shuffled = [...wordlist.words.map((w) => w.text)];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Take first 24 words
    const selectedWords = shuffled.slice(0, 24);

    // Create 5x5 grid with FREE in center
    const grid: string[][] = [];
    let wordIndex = 0;

    for (let row = 0; row < 5; row++) {
      const rowArr: string[] = [];
      for (let col = 0; col < 5; col++) {
        if (row === 2 && col === 2) {
          rowArr.push("FREE");
        } else {
          rowArr.push(selectedWords[wordIndex++]);
        }
      }
      grid.push(rowArr);
    }

    return grid;
  }
}
