import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { Wordlist } from './wordlist.entity';

@Entity('words')
export class Word {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 255 })
  text!: string;

  @Column()
  wordlistId!: string;

  @ManyToOne(() => Wordlist, (wordlist) => wordlist.words, { onDelete: 'CASCADE' })
  wordlist!: Wordlist;
}
