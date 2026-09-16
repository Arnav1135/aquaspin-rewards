ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '[]'::jsonb;
