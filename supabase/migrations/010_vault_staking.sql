ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS staked_amount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS vault_last_claim TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION vault_deposit(p_user_id UUID, p_amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INT;
    current_tokens INT;
BEGIN
    SELECT tokens INTO current_tokens FROM public.users WHERE id = p_user_id;
    IF current_tokens < p_amount THEN
        RAISE EXCEPTION 'Insufficient tokens';
    END IF;

    UPDATE public.users 
    SET 
        tokens = tokens - p_amount,
        staked_amount = COALESCE(staked_amount, 0) + p_amount,
        vault_last_claim = NOW()
    WHERE id = p_user_id
    RETURNING tokens INTO new_balance;

    RETURN new_balance;
END;
$$;

CREATE OR REPLACE FUNCTION vault_claim(p_user_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_staked INT;
    v_last_claim TIMESTAMP WITH TIME ZONE;
    v_seconds_elapsed INT;
    v_yield INT;
    new_balance INT;
BEGIN
    SELECT COALESCE(staked_amount, 0), COALESCE(vault_last_claim, NOW())
    INTO v_staked, v_last_claim
    FROM public.users WHERE id = p_user_id;

    IF v_staked <= 0 THEN
        RETURN 0;
    END IF;

    -- Calculate yield: e.g., 0.1% per hour = (staked * 0.001) / 3600 per second
    -- For arcade fun, let us do 1% per hour to make it fast!
    v_seconds_elapsed := EXTRACT(EPOCH FROM (NOW() - v_last_claim));
    v_yield := FLOOR(v_staked * 0.01 * (v_seconds_elapsed / 3600.0));

    IF v_yield > 0 THEN
        UPDATE public.users 
        SET 
            tokens = tokens + v_yield,
            vault_last_claim = NOW()
        WHERE id = p_user_id
        RETURNING tokens INTO new_balance;
        RETURN v_yield;
    END IF;

    RETURN 0;
END;
$$;