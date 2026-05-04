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

  /** The persistent player account UUID (null for bots) */
  @Column({ nullable: true, type: "varchar" })
  accountId!: string | null;

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

  /** Consecutive hands auto-folded due to inactivity; kicked at 3 */
  @Column({ default: 0 })
  missedHands!: number;
}
