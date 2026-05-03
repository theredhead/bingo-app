import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Game } from "./game.entity";

@Entity("game_players")
export class GamePlayer {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  gameId!: string;

  @ManyToOne(() => Game, (game) => game.players, { onDelete: "CASCADE" })
  @JoinColumn({ name: "gameId" })
  game!: Game;

  @Column({ length: 80 })
  displayName!: string;

  @Column({ default: false })
  isHost!: boolean;

  @Column({ type: "simple-json" })
  card!: string[][];

  @Column({ type: "simple-json", default: "[]" })
  stampedKeys!: string[];

  @Column({ type: "integer", nullable: true })
  placement!: number | null;

  @CreateDateColumn()
  joinedAt!: Date;
}
