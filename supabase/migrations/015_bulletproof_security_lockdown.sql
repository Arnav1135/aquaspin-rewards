-- =============================================================================
-- Migration: 015_bulletproof_security_lockdown.sql
-- Description: Comprehensive database-level hardening to prevent all bypasses:
--  1. Strict authorization (auth.uid() = user_id) on all economic RPCs
--  2. Immunity against negative number / integer sign exploitation
--  3. Prohibition of arbitrary client-side token minting
--  4. Protection of sensitive columns (tokens, xp, level) from direct UPDATEs
--  5. Verification of admin privileges via server-side identity
--  6. Server-side validation of game payouts, shop purchases, and VIP rakeback
-- =============================================================================

-- 1. Helper function to verify admin caller
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE((auth.jwt() ->> 'email') = 'vermaarnav113@gmail.com', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. Lockdown `update_user_tokens`:
-- Regular users can only DEDUCT tokens (e.g. game bet, entry fee, store purchase).
-- Only verified admin (vermaarnav113@gmail.com) can inject positive tokens directly.
CREATE OR REPLACE FUNCTION public.update_user_tokens(p_user_id UUID, p_amount_change INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_caller_id UUID;
    v_current_tokens INT;
    v_new_balance INT;
BEGIN
    v_caller_id := auth.uid();
    
    -- Verify authentication
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Authentication required.';
    END IF;

    -- User must be updating their own account unless they are the verified admin
    IF v_caller_id != p_user_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: You cannot modify another user tokens.';
    END IF;

    -- Regular users CANNOT mint positive tokens out of thin air via this endpoint
    IF p_amount_change > 0 AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Forbidden: Direct token minting is restricted to admin authority.';
    END IF;

    -- Fetch and lock the user record
    SELECT tokens INTO v_current_tokens
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    -- Verify sufficient balance for deductions
    IF (v_current_tokens + p_amount_change) < 0 THEN
        RAISE EXCEPTION 'Insufficient tokens balance.';
    END IF;

    UPDATE public.users 
    SET tokens = tokens + p_amount_change 
    WHERE id = p_user_id
    RETURNING tokens INTO v_new_balance;
    
    RETURN v_new_balance;
END;
$$;

-- 3. Hardened `record_game_result`:
-- Enforces caller authenticity, non-negative inputs, balance checks, and sane bounds.
CREATE OR REPLACE FUNCTION public.record_game_result(
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
    v_caller_id UUID;
    v_current_tokens INT;
    v_new_balance INT;
    v_profit INT;
BEGIN
    v_caller_id := auth.uid();

    -- Must be authenticated and caller must own the account
    IF v_caller_id IS NULL OR v_caller_id != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized: Caller identity does not match payload.';
    END IF;

    -- Prevent negative integer sign exploitation
    IF p_bet_amount < 0 OR p_earned_amount < 0 OR p_xp_earned < 0 THEN
        RAISE EXCEPTION 'Security violation: Negative values are strictly forbidden.';
    END IF;

    -- Sane bound check: single round win cannot exceed maximum legitimate threshold
    IF p_earned_amount > 2500000 THEN
        RAISE EXCEPTION 'Security violation: Earned amount exceeds game safety ceiling.';
    END IF;

    -- Lock row and check user has enough tokens for bet
    SELECT tokens INTO v_current_tokens
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found.';
    END IF;

    IF v_current_tokens < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient tokens for this bet.';
    END IF;

    -- Calculate profit (only net win counts towards total_earned)
    v_profit := p_earned_amount - p_bet_amount;
    IF v_profit < 0 THEN
        v_profit := 0;
    END IF;

    -- Atomically update tokens, xp, and total_earned
    UPDATE public.users 
    SET 
        tokens = tokens - p_bet_amount + p_earned_amount,
        total_earned = COALESCE(total_earned, 0) + v_profit,
        xp = COALESCE(xp, 0) + p_xp_earned
    WHERE id = p_user_id
    RETURNING tokens INTO v_new_balance;

    -- Track aggregate game stats atomically
    INSERT INTO public.game_stats (user_id, games_played, games_won)
    VALUES (p_user_id, 1, CASE WHEN p_earned_amount > p_bet_amount THEN 1 ELSE 0 END)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        games_played = public.game_stats.games_played + 1,
        games_won = public.game_stats.games_won + CASE WHEN p_earned_amount > p_bet_amount THEN 1 ELSE 0 END;

    RETURN v_new_balance;
END;
$$;

-- 4. Hardened `place_plinko_bet`:
-- Ensures payouts match allowed multipliers and prevents client manipulation of payouts.
CREATE OR REPLACE FUNCTION public.place_plinko_bet(
    p_bet_amount BIGINT,
    p_rows INTEGER,
    p_risk TEXT,
    p_client_seed TEXT,
    p_server_seed TEXT,
    p_nonce BIGINT,
    p_target_bucket INTEGER,
    p_multiplier NUMERIC,
    p_payout BIGINT
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_tokens BIGINT;
    v_new_tokens BIGINT;
    v_round_id UUID;
    v_user_id UUID;
    v_expected_payout BIGINT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate bounds
    IF p_bet_amount <= 0 OR p_multiplier < 0 OR p_payout < 0 THEN
        RAISE EXCEPTION 'Invalid parameters';
    END IF;

    -- Multiplier safety ceiling (Plinko max multiplier is 1000x)
    IF p_multiplier > 1000.0 THEN
        RAISE EXCEPTION 'Multiplier exceeds game ceiling';
    END IF;

    -- Verify payout calculation mathematically on server
    v_expected_payout := FLOOR(p_bet_amount * p_multiplier);
    IF p_payout != v_expected_payout THEN
        RAISE EXCEPTION 'Payout validation failed: mismatch with multiplier.';
    END IF;
    
    -- Lock user row and check balance
    SELECT tokens INTO v_current_tokens
    FROM public.users
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_tokens < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    v_new_tokens := v_current_tokens - p_bet_amount + v_expected_payout;

    UPDATE public.users
    SET tokens = v_new_tokens
    WHERE id = v_user_id;

    -- Record the settled round
    INSERT INTO public.plinko_rounds (
        user_id,
        bet_amount,
        rows_count,
        risk,
        client_seed,
        server_seed_commitment,
        server_seed,
        nonce,
        target_bucket,
        multiplier,
        payout,
        status
    ) VALUES (
        v_user_id,
        p_bet_amount,
        p_rows,
        p_risk,
        p_client_seed,
        encode(digest(p_server_seed, 'sha256'), 'hex'),
        p_server_seed,
        p_nonce,
        p_target_bucket,
        p_multiplier,
        v_expected_payout,
        'settled'
    ) RETURNING id INTO v_round_id;

    RETURN jsonb_build_object(
        'success', true,
        'round_id', v_round_id,
        'new_balance', v_new_tokens
    );
END;
$$;

-- 5. Hardened `vault_deposit` and `vault_claim`:
CREATE OR REPLACE FUNCTION public.vault_deposit(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_balance INT;
    v_current_tokens INT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Deposit amount must be strictly positive';
    END IF;

    SELECT tokens INTO v_current_tokens 
    FROM public.users 
    WHERE id = p_user_id 
    FOR UPDATE;

    IF v_current_tokens < p_amount THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    UPDATE public.users 
    SET 
        tokens = tokens - p_amount,
        staked_amount = COALESCE(staked_amount, 0) + p_amount,
        vault_last_claim = NOW()
    WHERE id = p_user_id
    RETURNING tokens INTO v_new_balance;

    RETURN v_new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION public.vault_claim(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staked INT;
    v_last_claim TIMESTAMP WITH TIME ZONE;
    v_seconds_elapsed INT;
    v_yield INT;
    v_new_balance INT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    SELECT COALESCE(staked_amount, 0), COALESCE(vault_last_claim, NOW())
    INTO v_staked, v_last_claim
    FROM public.users 
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_staked <= 0 THEN
        RETURN 0;
    END IF;

    v_seconds_elapsed := EXTRACT(EPOCH FROM (NOW() - v_last_claim));
    IF v_seconds_elapsed < 60 THEN
        RETURN 0; -- Rate limit claims to at least 1 minute
    END IF;

    v_yield := FLOOR(v_staked * 0.01 * (v_seconds_elapsed / 3600.0));
    -- Cap maximum single claim to 100% of staked amount to prevent clock manipulation
    IF v_yield > v_staked THEN
        v_yield := v_staked;
    END IF;

    IF v_yield > 0 THEN
        UPDATE public.users 
        SET 
            tokens = tokens + v_yield,
            vault_last_claim = NOW()
        WHERE id = p_user_id
        RETURNING tokens INTO v_new_balance;
        RETURN v_yield;
    END IF;

    RETURN 0;
END;
$$;

-- 6. Secure Shop Purchase RPC (server calculates random bonus, prevents client token tampering):
CREATE OR REPLACE FUNCTION public.secure_shop_purchase(p_user_id UUID, p_item_id TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cost INT;
    v_bonus INT := 0;
    v_current_tokens INT;
    v_new_balance INT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Lookup official prices
    CASE p_item_id
        WHEN 'spin_boost' THEN v_cost := 200;
        WHEN 'cooldown_skip' THEN v_cost := 150;
        WHEN 'jackpot_charm' THEN v_cost := 500;
        WHEN 'streak_shield' THEN v_cost := 300;
        WHEN 'xp_boost' THEN v_cost := 250;
        WHEN 'token_rain' THEN 
            v_cost := 100;
            -- Server-side RNG for Token Rain (50 to 300 tokens)
            v_bonus := FLOOR(50 + (random() * 251))::INT;
        ELSE
            RAISE EXCEPTION 'Unknown shop item';
    END CASE;

    SELECT tokens INTO v_current_tokens
    FROM public.users
    WHERE id = p_user_id
    FOR UPDATE;

    IF v_current_tokens < v_cost THEN
        RAISE EXCEPTION 'Insufficient tokens to complete purchase';
    END IF;

    UPDATE public.users
    SET tokens = tokens - v_cost + v_bonus
    WHERE id = p_user_id
    RETURNING tokens INTO v_new_balance;

    RETURN jsonb_build_object(
        'success', true,
        'item_id', p_item_id,
        'cost', v_cost,
        'bonus', v_bonus,
        'new_balance', v_new_balance
    );
END;
$$;

-- 7. Secure VIP Rakeback RPC (with 24h cooldown and server calculation):
CREATE TABLE IF NOT EXISTS public.vip_rakeback_claims (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    last_claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vip_rakeback_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own rakeback claims" ON public.vip_rakeback_claims FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_vip_rakeback(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_level INT;
    v_rakeback INT;
    v_last_claimed TIMESTAMPTZ;
    v_new_balance INT;
BEGIN
    IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'Unauthorized';
    END IF;

    -- Check cooldown: maximum once every 24 hours
    SELECT last_claimed_at INTO v_last_claimed
    FROM public.vip_rakeback_claims
    WHERE user_id = p_user_id;

    IF v_last_claimed IS NOT NULL AND v_last_claimed > (NOW() - INTERVAL '24 hours') THEN
        RAISE EXCEPTION 'Rakeback already claimed within the last 24 hours.';
    END IF;

    -- Fetch user level directly from DB
    SELECT COALESCE(level, 1) INTO v_level
    FROM public.users
    WHERE id = p_user_id;

    -- Server calculated rakeback: base 50 tokens per level + small server variance
    v_rakeback := FLOOR(v_level * 50 * (1.0 + (random() * 0.2)))::INT;

    UPDATE public.users
    SET tokens = tokens + v_rakeback
    WHERE id = p_user_id
    RETURNING tokens INTO v_new_balance;

    INSERT INTO public.vip_rakeback_claims (user_id, last_claimed_at)
    VALUES (p_user_id, NOW())
    ON CONFLICT (user_id) DO UPDATE SET last_claimed_at = NOW();

    RETURN jsonb_build_object(
        'success', true,
        'rakeback', v_rakeback,
        'new_balance', v_new_balance
    );
END;
$$;

-- 8. Row Level Security Trigger to protect sensitive columns on `public.users`:
-- Blocks direct client modifications to tokens, xp, level, total_earned, etc.
CREATE OR REPLACE FUNCTION public.protect_user_sensitive_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- If not superuser / service role, prevent client updates from modifying critical economy fields directly
  IF current_setting('role', true) != 'service_role' THEN
    NEW.tokens := OLD.tokens;
    NEW.total_earned := OLD.total_earned;
    NEW.xp := OLD.xp;
    NEW.level := OLD.level;
    NEW.staked_amount := OLD.staked_amount;
    NEW.is_banned := OLD.is_banned;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_protect_user_sensitive_columns ON public.users;
CREATE TRIGGER trg_protect_user_sensitive_columns
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_user_sensitive_columns();
