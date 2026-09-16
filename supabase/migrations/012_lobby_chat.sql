
CREATE TABLE IF NOT EXISTS public.lobby_chat (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.lobby_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lobby chat"
ON public.lobby_chat FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert lobby chat"
ON public.lobby_chat FOR INSERT
WITH CHECK (auth.uid() = user_id);

