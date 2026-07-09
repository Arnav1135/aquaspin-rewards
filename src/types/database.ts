// src/types/database.ts
// TypeScript types auto-generated to match Supabase schema

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          avatar_url: string | null;
          tokens: number;
          level: number;
          xp: number;
          streak: number;
          streak_last: string | null;
          total_earned: number;
          referral_code: string | null;
          referred_by: string | null;
          is_banned: boolean;
          created_at: string;
          last_login: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['users']['Row']>;
      };
      spin_history: {
        Row: {
          id: string;
          user_id: string;
          reward: number;
          segment: string;
          spin_type: 'paid' | 'ad_rewarded' | 'daily_free';
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['spin_history']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['spin_history']['Row']>;
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          amount_tokens: number;
          amount_usd: number;
          status: 'pending' | 'approved' | 'rejected' | 'processing';
          method: 'upi' | 'paypal';
          payment_address: string;
          reference: string | null;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['transactions']['Row']>;
      };
      game_stats: {
        Row: {
          user_id: string;
          spins_total: number;
          spins_today: number;
          last_spin_at: string | null;
          games_played: number;
          games_won: number;
          clicker_best: number;
          memory_best: number;
          quiz_best: number;
          tap_best: number;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['game_stats']['Row']> & { user_id: string };
        Update: Partial<Database['public']['Tables']['game_stats']['Row']>;
      };
      ad_analytics: {
        Row: {
          id: string;
          user_id: string | null;
          ad_type: string;
          network: string;
          tokens_awarded: number;
          completed: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ad_analytics']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ad_analytics']['Row']>;
      };
      daily_rewards: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          tokens: number;
          claimed_at: string;
        };
        Insert: Omit<Database['public']['Tables']['daily_rewards']['Row'], 'id' | 'claimed_at'>;
        Update: Partial<Database['public']['Tables']['daily_rewards']['Row']>;
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string;
          username: string | null;
          avatar_url: string | null;
          tokens: number;
          level: number;
          total_earned: number;
          streak: number;
          rank: number;
        };
      };
    };
    Functions: {
      update_streak: {
        Args: { p_user_id: string };
        Returns: number;
      };
    };
  };
}

// ── Convenience types ────────────────────────────────────────────────────────
export type User = Database['public']['Tables']['users']['Row'];
export type SpinHistory = Database['public']['Tables']['spin_history']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type GameStats = Database['public']['Tables']['game_stats']['Row'];
export type AdAnalytics = Database['public']['Tables']['ad_analytics']['Row'];
export type DailyReward = Database['public']['Tables']['daily_rewards']['Row'];
export type LeaderboardEntry = Database['public']['Views']['leaderboard']['Row'];

// ── Wheel segment types ──────────────────────────────────────────────────────
export interface WheelSegment {
  label: string;
  tokens: number;
  color: string;
  glowColor: string;
  isJackpot?: boolean;
}

// ── Spin result from edge function ──────────────────────────────────────────
export interface SpinResult {
  success: boolean;
  reward: number;
  segment: string;
  segment_index: number;
  spin_type: 'paid' | 'ad_rewarded' | 'daily_free';
  new_balance: number;
  error?: string;
  wait_seconds?: number;
}

// ── Cashout result ───────────────────────────────────────────────────────────
export interface CashoutResult {
  success: boolean;
  transaction_id?: string;
  amount_tokens?: number;
  amount_usd?: number;
  method?: string;
  status?: string;
  message?: string;
  error?: string;
}

// ── Ad reward result ─────────────────────────────────────────────────────────
export interface AdRewardResult {
  success: boolean;
  tokens_awarded: number;
  ad_type: string;
  message: string;
  limit_reached?: boolean;
  error?: string;
}

// ── Game types ───────────────────────────────────────────────────────────────
export type GameType = 'clicker' | 'memory' | 'quiz' | 'tap';

export interface GameResult {
  type: GameType;
  score: number;
  tokensEarned: number;
  won: boolean;
}

// ── Daily reward config ──────────────────────────────────────────────────────
export const DAILY_REWARD_SCHEDULE: { day: number; tokens: number; label: string }[] = [
  { day: 1, tokens: 50,  label: 'Day 1' },
  { day: 2, tokens: 75,  label: 'Day 2' },
  { day: 3, tokens: 100, label: 'Day 3' },
  { day: 4, tokens: 100, label: 'Day 4' },
  { day: 5, tokens: 150, label: 'Day 5' },
  { day: 6, tokens: 200, label: 'Day 6' },
  { day: 7, tokens: 500, label: 'Day 7 🔥' },
];

// ── Utility: relative time (e.g. "2 minutes ago") ───────────────────────────
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);

  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
