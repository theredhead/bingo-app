import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
} from "typeorm";
import { HoldemPlayer } from "./holdem-player.entity";

@Entity()
export class HoldemGame {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  status!: "waiting" | "active" | "completed";

  @Column({ default: 6 })
  maxSeats!: number;

  @Column({ default: "no-limit" })
  limitType!: "no-limit" | "pot-limit" | "fixed-limit";

  @Column({ default: 30 })
  moveTimeLimit!: number; // seconds

  @OneToMany(() => HoldemPlayer, (player) => player.game, { cascade: true })
  players!: HoldemPlayer[];

  @Column("simple-json", { default: "[]" })
  actions!: any[]; // betting actions history

  @Column("simple-json", { default: "{}" })
  state!: any; // current hand state (cards, pot, etc.)

  /** Updated whenever a human player acts or is present. Used for auto-cleanup. */
  @Column({ type: "datetime", nullable: true })
  lastHumanActivityAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}
