import { BadRequestException, Controller, Get, Query } from "@nestjs/common";
import { BingoService } from "./bingo.service";
import { IsString, IsNotEmpty } from "class-validator";

export class GenerateCardDto {
  @IsString()
  @IsNotEmpty()
  wordlistId!: string;
}

@Controller("api/bingo")
export class BingoController {
  constructor(private readonly bingoService: BingoService) {}

  @Get("generate")
  async generateCard(@Query() query: GenerateCardDto) {
    const wordlistId = query?.wordlistId?.trim();
    if (!wordlistId) {
      throw new BadRequestException("wordlistId query parameter is required");
    }

    const card = await this.bingoService.generateCard(wordlistId);
    return { card };
  }
}
