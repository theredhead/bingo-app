import { IsNotEmpty, IsString } from "class-validator";

export class CreateGameDto {
  @IsString()
  @IsNotEmpty()
  wordlistId!: string;

  @IsString()
  @IsNotEmpty()
  hostName!: string;
}
