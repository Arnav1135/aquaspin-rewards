// src/lib/supabase.ts
// Supabase client initialization + typed helpers

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// ── Environment variables ────────────────────────────────────────────────────
 
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 
  import.meta.env.SUPABASE_URL || 
  '';
 
const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 
  import.meta.env.SUPABASE_ANON_KEY || 
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⛔ Missing Supabase environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY). Please configure your environment.');
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

/** Update user token balance (DEPRECATED: Direct table updates are disabled for security; use secureEconomy) */
export async function updateUserTokens(_userId: string, _newBalance: number) {
  console.warn('[Security] Direct updateUserTokens call blocked. Please use secureEconomy module.');
  return { error: { message: 'Direct client-side token modification is disabled for security.' } };
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

/** Fetch sign-in history for a user (last 15 logins) */
export async function getSignInHistory(userId: string) {
  return db
    .from('sign_in_history')
    .select('*')
    .eq('user_id', userId)
    .order('signed_in_at', { ascending: false })
    .limit(15);
}

/** Detect browser name + version from userAgent */
function detectBrowser(ua: string): string {
  if (/Edg\/([\d.]+)/.test(ua)) return `Edge ${ua.match(/Edg\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/OPR\/([\d.]+)/.test(ua)) return `Opera ${ua.match(/OPR\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Chrome\/([\d.]+)/.test(ua)) return `Chrome ${ua.match(/Chrome\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Firefox\/([\d.]+)/.test(ua)) return `Firefox ${ua.match(/Firefox\/([\d.]+)/)?.[1]?.split('.')[0] ?? ''}`;
  if (/Safari\/([\d.]+)/.test(ua) && !/Chrome/.test(ua)) return `Safari`;
  return 'Unknown Browser';
}

/** Detect OS from userAgent */
function detectOS(ua: string): string {
  if (/Windows NT/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Unknown OS';
}

/** Detect device type from userAgent */
function detectDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/Mobi|Android.*Mobile|iPhone/.test(ua)) return 'mobile';
  if (/iPad|Android(?!.*Mobile)|Tablet/.test(ua)) return 'tablet';
  return 'desktop';
}

/**
 * Record a sign-in event for the user.
 * Call this immediately after a successful login/signup.
 */
export async function recordSignIn(
  userId: string,
  email: string,
  method: 'email' | 'google' | 'guest' = 'email'
) {
  const ua = navigator.userAgent;
  return db.from('sign_in_history').insert({
    user_id: userId,
    email,
    device_type: detectDeviceType(ua),
    browser: detectBrowser(ua),
    os: detectOS(ua),
    sign_in_method: method,
  });
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
    .channel(`leaderboard-changes-${Math.random().toString(36).substring(7)}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, callback)
    .subscribe();
}

/** Subscribe to realtime user token updates */
export function subscribeToUserTokens(userId: string, callback: (tokens: number) => void) {
  return supabase
    .channel(`user-tokens-${userId}-${Math.random().toString(36).substring(7)}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${userId}` },
      (payload: { new: { tokens: number } }) => {
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

/** Claim daily login reward via secure edge function */
export async function claimDailyReward(_userId: string, _streak: number, _tokensToAward: number) {
  const { data, error } = await supabase.functions.invoke('daily-reward');
  if (error) return { error: error.message };
  return { data, error: null };
}

