export interface Word {
  id: string;
  text: string;
  wordlistId: string;
}

export interface Wordlist {
  id: string;
  name: string;
  description?: string;
  words: Word[];
  createdAt: string;
}

export interface BingoCard {
  card: string[][];
}

export interface HostedGame {
  id: string;
  joinCode: string;
  wordlistId: string;
  status: "pending" | "active" | "completed";
  winnerPlayerId: string | null;
  startedAt: string | null;
  endedAt: string | null;
}

export interface HostedGamePlayer {
  id: string;
  displayName: string;
  isHost: boolean;
  joinedAt: string;
  placement?: number | null;
}

export interface HostedGameSnapshot {
  game: HostedGame;
  players: HostedGamePlayer[];
  playerId?: string;
  card?: string[][];
  stampedKeys?: string[];
  winner?: HostedGamePlayer;
  canStart: boolean;
}
