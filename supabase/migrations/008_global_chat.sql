CREATE TABLE IF NOT EXISTS global_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON global_chat(created_at DESC);
ALTER TABLE global_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read chat" ON global_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert chat" ON global_chat FOR INSERT WITH CHECK (auth.uid() = user_id);