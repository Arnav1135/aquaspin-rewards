-- ============================================================
-- AquaSpin Rewards — Migration 003: Sign-In History
-- Run this in Supabase SQL Editor: Project → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- TABLE: sign_in_history
-- Logs every successful login per user, bound to their email account.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sign_in_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email          TEXT NOT NULL,                    -- Denormalized for display
  signed_in_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  device_type    TEXT,                             -- 'mobile' | 'tablet' | 'desktop'
  browser        TEXT,                             -- e.g. 'Chrome 125', 'Safari 17'
  os             TEXT,                             -- e.g. 'Windows', 'iOS', 'Android'
  ip_address     TEXT,                             -- Client IP (best-effort)
  sign_in_method TEXT DEFAULT 'email'              -- 'email' | 'google' | 'guest'
);

-- Enable RLS
ALTER TABLE public.sign_in_history ENABLE ROW LEVEL SECURITY;

-- Policy: users can only view their own sign-in history
DROP POLICY IF EXISTS "Users can view own sign-in history" ON public.sign_in_history;
CREATE POLICY "Users can view own sign-in history"
  ON public.sign_in_history FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: users (and service role) can insert their own records
DROP POLICY IF EXISTS "Users can insert own sign-in history" ON public.sign_in_history;
CREATE POLICY "Users can insert own sign-in history"
  ON public.sign_in_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Performance index
CREATE INDEX IF NOT EXISTS idx_signin_history_user
  ON public.sign_in_history (user_id, signed_in_at DESC);

-- ============================================================
-- Ensure free_trials / has_deposited columns exist on users
-- (safe to run even if already present)
-- ============================================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS free_trials   INTEGER DEFAULT 3,
  ADD COLUMN IF NOT EXISTS has_deposited BOOLEAN DEFAULT FALSE;
