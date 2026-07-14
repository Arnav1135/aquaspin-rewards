// src/features/coinflip/types.ts

export type CoinSide = 'heads' | 'tails';

export interface CoinFlipState {
  isFlipping: boolean;
  selection: CoinSide | null;
  result: CoinSide | null;
  isWin: boolean | null;
  wonAmount: number;
  betAmount: number;
}

export interface CoinFlipStats {
  winStreak: number;
  lossStreak: number;
  history: CoinSide[];
}
