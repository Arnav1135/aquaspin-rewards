-- Add referral tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- Generate unique referral codes for existing users
DO $do$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM users WHERE referral_code IS NULL LOOP
    UPDATE users SET referral_code = upper(substring(md5(random()::text) from 1 for 8)) WHERE id = r.id;
  END LOOP;
END;
$do$;
