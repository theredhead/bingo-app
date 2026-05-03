import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { Word } from './word.entity';

@Entity('wordlists')
export class Wordlist {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @OneToMany(() => Word, (word) => word.wordlist, { cascade: true, eager: true })
  words!: Word[];

  @CreateDateColumn()
  createdAt!: Date;
}
