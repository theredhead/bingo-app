import { IsInt, IsNotEmpty, IsString, Max, Min } from "class-validator";

export class StampCellDto {
  @IsString()
  @IsNotEmpty()
  playerId!: string;

  @IsInt()
  @Min(0)
  @Max(4)
  row!: number;

  @IsInt()
  @Min(0)
  @Max(4)
  col!: number;
}
