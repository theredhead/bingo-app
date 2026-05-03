import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateWordDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

export class CreateWordlistDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(24, { message: 'Wordlist must have at least 24 words for a 5x5 bingo card' })
  @Type(() => CreateWordDto)
  words!: CreateWordDto[];
}
