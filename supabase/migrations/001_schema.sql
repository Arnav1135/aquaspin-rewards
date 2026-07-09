-- ============================================================
-- AquaSpin Rewards — Supabase Database Schema
-- Run this in Supabase SQL Editor: Project → SQL Editor → New Query
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ============================================================
-- TABLE: users (public profile, extends auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  username      TEXT UNIQUE,
  avatar_url    TEXT,
  tokens        BIGINT DEFAULT 500 NOT NULL CHECK (tokens >= 0),  -- Start with 500 bonus tokens
  level         INTEGER DEFAULT 1 NOT NULL,
  xp            BIGINT DEFAULT 0 NOT NULL,
  streak        INTEGER DEFAULT 0 NOT NULL,
  streak_last   DATE,                            -- Last login date for streak tracking
  total_earned  BIGINT DEFAULT 0 NOT NULL,       -- Cumulative tokens ever earned
  referral_code TEXT UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  referred_by   UUID REFERENCES public.users(id),
  is_banned     BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_login    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- TABLE: spin_history
-- ============================================================
CREATE TABLE IF NOT EXISTS public.spin_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward      INTEGER NOT NULL,          -- Tokens awarded
  segment     TEXT NOT NULL,             -- Segment label (e.g., "50 Tokens", "JACKPOT")
  spin_type   TEXT DEFAULT 'paid',       -- 'paid' | 'ad_rewarded' | 'daily_free'
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- TABLE: transactions (cashout requests)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_tokens   BIGINT NOT NULL CHECK (amount_tokens >= 1000),
  amount_usd      NUMERIC(10, 2) NOT NULL,       -- tokens / 1000
  status          TEXT DEFAULT 'pending' NOT NULL
                  CHECK (status IN ('pending', 'approved', 'rejected', 'processing')),
  method          TEXT NOT NULL CHECK (method IN ('upi', 'paypal')),
  payment_address TEXT NOT NULL,                 -- UPI ID or PayPal email
  reference       TEXT,                          -- Payment reference/UTR
  note            TEXT,                          -- Owner note
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================================
-- TABLE: game_stats
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_stats (
  user_id         UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  spins_total     INTEGER DEFAULT 0,
  spins_today     INTEGER DEFAULT 0,
  last_spin_at    TIMESTAMPTZ,
  games_played    INTEGER DEFAULT 0,
  games_won       INTEGER DEFAULT 0,
  clicker_best    INTEGER DEFAULT 0,
  memory_best     INTEGER DEFAULT 0,
  quiz_best       INTEGER DEFAULT 0,
  tap_best        INTEGER DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: ad_analytics (track ad impressions for owner revenue tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ad_analytics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ad_type     TEXT NOT NULL,   -- 'rewarded' | 'interstitial' | 'banner'
  network     TEXT NOT NULL,   -- 'applovin' | 'adsense' | 'propeller' | 'mock'
  tokens_awarded INTEGER DEFAULT 0,
  completed   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: daily_rewards (track daily login bonuses)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_rewards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_number  INTEGER NOT NULL,    -- Streak day (1-7 for weekly cycle)
  tokens      INTEGER NOT NULL,
  claimed_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- VIEW: leaderboard (top 100 players by total tokens earned)
-- ============================================================
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  u.id,
  u.username,
  u.avatar_url,
  u.tokens,
  u.level,
  u.total_earned,
  u.streak,
  RANK() OVER (ORDER BY u.total_earned DESC) AS rank
FROM public.users u
WHERE u.is_banned = FALSE
ORDER BY u.total_earned DESC
LIMIT 100;

-- ============================================================
-- FUNCTION: auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, username, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );

  -- Also create empty game_stats row
  INSERT INTO public.game_stats (user_id) VALUES (NEW.id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fire after each new auth signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNCTION: auto-update level when XP changes
-- Level formula: level = floor(xp / 500) + 1 (max 100)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_level_on_xp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.level = LEAST(FLOOR(NEW.xp / 500) + 1, 100);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_xp_change
  BEFORE UPDATE OF xp ON public.users
  FOR EACH ROW
  WHEN (NEW.xp IS DISTINCT FROM OLD.xp)
  EXECUTE FUNCTION public.update_level_on_xp();

-- ============================================================
-- FUNCTION: auto-update streak on login
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER;
  v_last_login DATE;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT streak, streak_last INTO v_streak, v_last_login
  FROM public.users WHERE id = p_user_id;

  IF v_last_login IS NULL OR v_last_login < v_today - INTERVAL '1 day' THEN
    -- Reset streak if missed a day
    IF v_last_login < v_today - INTERVAL '1 day' THEN
      v_streak := 1;
    ELSE
      v_streak := COALESCE(v_streak, 0) + 1;
    END IF;
  END IF;

  UPDATE public.users
  SET streak = v_streak, streak_last = v_today, last_login = NOW()
  WHERE id = p_user_id;

  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: update transaction updated_at timestamp
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_transaction_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_transaction_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_transaction_timestamp();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spin_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

-- === users policies ===
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public read for leaderboard (only safe columns exposed via view)
CREATE POLICY "Anyone can view leaderboard data"
  ON public.users FOR SELECT
  USING (true);  -- leaderboard view only exposes safe columns

-- === spin_history policies ===
CREATE POLICY "Users can view own spin history"
  ON public.spin_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spin history"
  ON public.spin_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- === transactions policies ===
CREATE POLICY "Users can view own transactions"
  ON public.transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own transactions"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- === game_stats policies ===
CREATE POLICY "Users can view own game stats"
  ON public.game_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own game stats"
  ON public.game_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- === ad_analytics policies ===
CREATE POLICY "Users can insert ad events"
  ON public.ad_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- === daily_rewards policies ===
CREATE POLICY "Users can view own daily rewards"
  ON public.daily_rewards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily rewards"
  ON public.daily_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_spin_history_user_id ON public.spin_history (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_total_earned ON public.users (total_earned DESC);
CREATE INDEX IF NOT EXISTS idx_users_tokens ON public.users (tokens DESC);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_user ON public.ad_analytics (user_id, created_at DESC);

-- ============================================================
-- SEED DATA (for testing — remove in production)
-- ============================================================
-- Note: These are placeholder users for local testing.
-- In production, remove this section. Real users are created via auth.

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spin_history;
