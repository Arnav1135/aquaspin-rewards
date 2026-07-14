// src/features/coinflip/lib/rules.ts
import { CoinSide } from '../types';

export const HOUSE_EDGE = 0.02; // 2% house edge for 1.96x payout
export const MULTIPLIER = (1 - HOUSE_EDGE) / 0.5; // 1.96x

/**
 * Determine the flip outcome based on a random float f in [0, 1)
 */
export function getFlipResult(f: number): CoinSide {
  return f < 0.5 ? 'heads' : 'tails';
}

/**
 * Calculate won tokens for a given bet
 */
export function calculatePayout(betAmount: number): number {
  return Math.floor(betAmount * MULTIPLIER);
}
