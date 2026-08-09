-- Enable pgcrypto for digest()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Plinko rounds table
CREATE TABLE IF NOT EXISTS public.plinko_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id),
    bet_amount BIGINT NOT NULL,
    rows_count INTEGER NOT NULL,
    risk TEXT NOT NULL,
    client_seed TEXT NOT NULL,
    server_seed_commitment TEXT NOT NULL,
    server_seed TEXT, -- Revealed after round
    nonce BIGINT NOT NULL,
    target_bucket INTEGER NOT NULL,
    multiplier NUMERIC NOT NULL,
    payout BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'settled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    settled_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for user's rounds
CREATE INDEX IF NOT EXISTS idx_plinko_rounds_user_id ON public.plinko_rounds(user_id);

-- Atomic bet placement and settlement RPC
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
BEGIN
    -- Get current authenticated user
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Validate inputs
    IF p_bet_amount <= 0 THEN
        RAISE EXCEPTION 'Invalid bet amount';
    END IF;
    
    -- Lock user row and check balance
    SELECT tokens INTO v_current_tokens
    FROM public.users
    WHERE id = v_user_id
    FOR UPDATE;

    IF v_current_tokens < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    -- Calculate new balance atomically: subtract bet, add payout
    v_new_tokens := v_current_tokens - p_bet_amount + p_payout;

    -- Update user balance
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
        p_payout,
        'settled'
    ) RETURNING id INTO v_round_id;

    RETURN jsonb_build_object(
        'success', true,
        'round_id', v_round_id,
        'new_balance', v_new_tokens
    );
END;
$$;
