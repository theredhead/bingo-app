import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm";
import { HoldemGame } from "./holdem-game.entity";

@Entity()
export class HoldemPlayer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @ManyToOne(() => HoldemGame, (game) => game.players)
  game!: HoldemGame;

  @Column()
  displayName!: string;

  @Column({ default: 100 })
  chips!: number;

  @Column({ default: false })
  isHost!: boolean;

  @Column({ default: false })
  isSeated!: boolean;

  @Column({ default: false })
  isFolded!: boolean;

  @Column({ default: false })
  isAllIn!: boolean;

  @Column("simple-json", { default: "[]" })
  cards!: string[];
}
