
export interface Player {
  id: string;
  name: string;
  score: number;
  history: number[];
  avg: number;
  dartsThrown: number;
  lastTurnScores: number[];
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  currentTurnThrows: number[];
  status: 'setup' | 'playing' | 'finished';
  winner: Player | null;
  startingScore: number;
}

export type DartMultiplier = 1 | 2 | 3;

export interface DartHit {
  value: number;
  multiplier: DartMultiplier;
  label: string;
}
