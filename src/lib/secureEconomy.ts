import { supabase } from './supabase';

/**
 * SECURE ECONOMY API
 * This module replaces direct client-side supabase.from('users').update() calls
 * with secure Remote Procedure Calls (RPCs) that handle token math atomically on the Postgres server.
 * 
 * IMPORTANT: Ensure the corresponding SQL migrations have been executed in your Supabase project.
 */

export interface GameResultPayload {
  userId: string;
  betAmount: number;
  earnedAmount: number;
  xpEarned?: number;
}

/**
 * Atomically updates user tokens and stats based on a game outcome.
 * Uses the 'record_game_result' RPC to prevent race conditions and client-side spoofing.
 */
export async function secureRecordGameResult(payload: GameResultPayload) {
  const { data, error } = await (supabase as any).rpc('record_game_result', {
    p_user_id: payload.userId,
    p_bet_amount: payload.betAmount,
    p_earned_amount: payload.earnedAmount,
    p_xp_earned: payload.xpEarned || 0
  });

  if (error) {
    console.error('[SecureEconomy] RPC Failed:', error);
    throw new Error('Transaction failed due to security policies.');
  }

  // Handle referral reward on first game/spin
  try {
    const { data: user } = await (supabase.from('users') as any).select('referred_by').eq('id', payload.userId).single();
    if (user && user.referred_by) {
      const { data: stats } = await (supabase.from('game_stats') as any).select('spins_total, games_played').eq('user_id', payload.userId).single();
      if (stats && (stats.spins_total + stats.games_played) === 1) {
        await secureUpdateTokens(user.referred_by, 500);
      }
    }
  } catch (err) {
    console.warn('Failed to process referral reward:', err);
  }

  return { data, error: null };
}

/**
 * Atomically adds or deducts tokens for general rewards/purchases.
 */
export async function secureUpdateTokens(userId: string, amountChange: number) {
  const { data, error } = await (supabase as any).rpc('update_user_tokens', {
    p_user_id: userId,
    p_amount_change: amountChange
  });

  if (error) {
    console.error('[SecureEconomy] RPC Failed:', error);
    throw new Error('Transaction failed due to security policies.');
  }

  return { data, error: null };
}
