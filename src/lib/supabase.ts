// src/lib/supabase.ts
// Supabase client initialization + typed helpers

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ── Environment variables ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL as string;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '⛔ Missing Supabase environment variables.\n' +
    'Copy .env.example to .env and fill in your Supabase project URL and anon key.\n' +
    'Get them from: https://app.supabase.com → Your Project → Settings → API'
  );
}

// ── Supabase client (fully typed) ────────────────────────────────────────────
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// ── Supabase "any" shorthand for tables not fully typed ──────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

// ── Edge function invoker helper ─────────────────────────────────────────────
export async function invokeEdgeFunction<T>(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  const { data, error } = await supabase.functions.invoke<T>(functionName, {
    body,
  });

  if (error) {
    console.error(`Edge function ${functionName} error:`, error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

// ── User helpers ─────────────────────────────────────────────────────────────

/** Fetch full user profile from DB */
export async function getUserProfile(userId: string) {
  return db.from('users').select('*').eq('id', userId).single();
}

/** Update user token balance */
export async function updateUserTokens(userId: string, newBalance: number) {
  return db.from('users').update({ tokens: newBalance }).eq('id', userId);
}

/** Fetch spin history for a user (last 20) */
export async function getSpinHistory(userId: string) {
  return db
    .from('spin_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
}

/** Fetch transaction history for a user */
export async function getTransactionHistory(userId: string) {
  return db
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

/** Fetch leaderboard (top 100) */
export async function getLeaderboard() {
  return db
    .from('leaderboard')
    .select('*')
    .order('rank', { ascending: true })
    .limit(100);
}

/** Get game stats for a user */
export async function getGameStats(userId: string) {
  return db.from('game_stats').select('*').eq('user_id', userId).single();
}

/** Subscribe to realtime leaderboard changes */
export function subscribeToLeaderboard(callback: () => void) {
  return supabase
    .channel('leaderboard-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
    .subscribe();
}

/** Subscribe to realtime user token updates */
export function subscribeToUserTokens(userId: string, callback: (tokens: number) => void) {
  return supabase
    .channel(`user-tokens-${userId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (payload: any) => {
        callback(payload.new.tokens);
      }
    )
    .subscribe();
}

/** Check if user claimed daily reward today */
export async function getDailyRewardStatus(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  return db
    .from('daily_rewards')
    .select('*')
    .eq('user_id', userId)
    .gte('claimed_at', today)
    .limit(1);
}

/** Claim daily login reward */
export async function claimDailyReward(userId: string, streak: number, tokensToAward: number) {
  const dayNumber = ((streak - 1) % 7) + 1;

  const { error: rewardError } = await db
    .from('daily_rewards')
    .insert({ user_id: userId, day_number: dayNumber, tokens: tokensToAward });

  if (rewardError) return { error: rewardError.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: streakError } = await (supabase as any).rpc('update_streak', { p_user_id: userId });
  if (streakError) return { error: streakError.message };

  const { data: user } = await getUserProfile(userId);
  if (user) {
    await updateUserTokens(userId, (user as { tokens: number }).tokens + tokensToAward);
  }

  return { error: null };
}
