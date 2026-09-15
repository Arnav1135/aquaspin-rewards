-- 005_daily_streak_progression.sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS login_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMPTZ;
