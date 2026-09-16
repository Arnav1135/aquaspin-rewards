CREATE OR REPLACE VIEW public_profiles AS
SELECT id, username, avatar_url, level, created_at, xp, streak, total_earned 
FROM users;

GRANT SELECT ON public_profiles TO anon, authenticated;