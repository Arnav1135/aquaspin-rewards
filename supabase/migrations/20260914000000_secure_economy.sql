-- Migration: Secure Economy RPCs
-- Description: Replaces vulnerable client-side token math with atomic Postgres functions.

-- 1. Secure Token Update
CREATE OR REPLACE FUNCTION update_user_tokens(p_user_id UUID, p_amount_change INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INT;
BEGIN
    UPDATE public.users 
    SET tokens = tokens + p_amount_change 
    WHERE id = p_user_id
    RETURNING tokens INTO new_balance;
    
    RETURN new_balance;
END;
$$;

-- 2. Secure Game Result Recorder
CREATE OR REPLACE FUNCTION record_game_result(
    p_user_id UUID, 
    p_bet_amount INT, 
    p_earned_amount INT, 
    p_xp_earned INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INT;
    profit INT;
BEGIN
    -- Calculate profit (only positive amounts count towards total_earned)
    profit := p_earned_amount - p_bet_amount;
    IF profit < 0 THEN
        profit := 0;
    END IF;

    -- Atomically update tokens, xp, and total_earned
    UPDATE public.users 
    SET 
        tokens = tokens - p_bet_amount + p_earned_amount,
        total_earned = COALESCE(total_earned, 0) + profit,
        xp = COALESCE(xp, 0) + p_xp_earned
    WHERE id = p_user_id
    RETURNING tokens INTO new_balance;

    -- Also track aggregate game stats atomically
    INSERT INTO public.game_stats (user_id, games_played, games_won)
    VALUES (p_user_id, 1, CASE WHEN p_earned_amount > p_bet_amount THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        games_played = public.game_stats.games_played + 1,
        games_won = public.game_stats.games_won + CASE WHEN p_earned_amount > p_bet_amount THEN 1 ELSE 0 END;

    RETURN new_balance;
END;
$$;
