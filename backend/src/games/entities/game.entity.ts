import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { GamePlayer } from "./game-player.entity";

@Entity("games")
export class Game {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, length: 4 })
  joinCode!: string;

  @Column()
  wordlistId!: string;

  @Column({ length: 32, default: "pending" })
  status!: "pending" | "active" | "completed";

  @Column({ type: "text", nullable: true })
  winnerPlayerId!: string | null;

  @Column({ type: "datetime", nullable: true })
  startedAt!: Date | null;

  @Column({ type: "datetime", nullable: true })
  endedAt!: Date | null;

  @OneToMany(() => GamePlayer, (player) => player.game, { cascade: true })
  players!: GamePlayer[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
