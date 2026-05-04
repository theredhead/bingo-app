import { Entity, PrimaryColumn, Column } from "typeorm";

/**
 * Persistent wallet for human players.
 * Keyed by the player's UUID (stored in browser localStorage).
 * This survives across games/sessions.
 */
@Entity()
export class PlayerAccount {
  /** The UUID the browser generates once and stores in localStorage */
  @PrimaryColumn("uuid")
  playerId!: string;

  @Column({ default: 0 })
  balance!: number;

  @Column({ type: "datetime", nullable: true })
  lastSeenAt!: Date | null;

  /** Set when balance first reaches 0; cleared when a daily bonus is awarded */
  @Column({ type: "datetime", nullable: true })
  brokeAt!: Date | null;
}
