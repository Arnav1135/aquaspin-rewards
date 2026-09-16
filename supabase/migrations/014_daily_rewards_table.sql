-- Create daily_rewards tracking table
CREATE TABLE IF NOT EXISTS public.daily_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    tokens INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.daily_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily rewards"
    ON public.daily_rewards FOR SELECT
    USING (auth.uid() = user_id);