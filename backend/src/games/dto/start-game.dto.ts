import { IsNotEmpty, IsString } from "class-validator";

export class StartGameDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;
}
