-- Update handle_new_user to properly capture referral data and grant 500 tokens to both
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $do
DECLARE
  ref_uuid UUID := NULL;
BEGIN
  -- Safely parse referred_by UUID
  BEGIN
    ref_uuid := NULLIF(NEW.raw_user_meta_data->>'referred_by', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    ref_uuid := NULL;
  END;

  -- Insert the new user
  INSERT INTO public.users (
    id, 
    email, 
    username, 
    avatar_url,
    referred_by,
    referral_code,
    tokens
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    ref_uuid,
    'AQUA-' || upper(substring(NEW.id::text from 1 for 6)),
    CASE WHEN ref_uuid IS NOT NULL THEN 500 ELSE 0 END
  );

  -- Also create empty game_stats row
  INSERT INTO public.game_stats (user_id) VALUES (NEW.id);
  
  -- Grant referrer 500 tokens if applicable
  IF ref_uuid IS NOT NULL THEN
    UPDATE public.users 
    SET tokens = tokens + 500,
        total_earned = total_earned + 500
    WHERE id = ref_uuid;
  END IF;
  
  RETURN NEW;
END;
$do LANGUAGE plpgsql SECURITY DEFINER;