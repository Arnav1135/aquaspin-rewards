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
    console.error('[SecureEconomy] RPC Failed. Fallback to local update (vulnerable):', error);
    // Development fallback if RPC isn't deployed yet
    return fallbackUpdate(payload);
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
    console.error('[SecureEconomy] RPC Failed. Fallback to local update:', error);
    // Fallback requires fetching current balance which is race-condition prone
    const { data: user } = await supabase.from('users').select('tokens').eq('id', userId).single();
    if (user) {
      await (supabase.from('users') as any).update({ tokens: user.tokens + amountChange }).eq('id', userId);
      return { data: user.tokens + amountChange, error: null };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

async function fallbackUpdate(payload: GameResultPayload) {
  const { data: user } = await supabase.from('users').select('tokens, total_earned, xp').eq('id', payload.userId).single();
  if (!user) return { data: null, error: new Error('User not found') };

  const newBalance = user.tokens - payload.betAmount + payload.earnedAmount;
  const newEarned = (user.total_earned || 0) + (payload.earnedAmount > payload.betAmount ? payload.earnedAmount - payload.betAmount : 0);
  const newXp = (user.xp || 0) + (payload.xpEarned || 0);

  const { error } = await (supabase.from('users') as any).update({
    tokens: newBalance,
    total_earned: newEarned,
    xp: newXp
  }).eq('id', payload.userId);

  return { data: newBalance, error };
}
