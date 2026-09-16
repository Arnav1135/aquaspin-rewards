
import fs from "fs";
import path from "fs";

// 1. Create SQL Migration
const sql = `
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
`;
fs.writeFileSync("supabase/migrations/008_global_chat.sql", sql.trim());

// 2. Update uiStore
let uiStore = fs.readFileSync("src/features/uiStore.ts", "utf-8");
if (!uiStore.includes("chatOpen: boolean;")) {
  uiStore = uiStore.replace(
    "sidebarOpen: boolean;",
    "sidebarOpen: boolean;\n  chatOpen: boolean;"
  );
  uiStore = uiStore.replace(
    "setSidebarOpen: (open: boolean) => void;",
    "setSidebarOpen: (open: boolean) => void;\n  toggleChat: () => void;"
  );
  uiStore = uiStore.replace(
    "sidebarOpen: false,",
    "sidebarOpen: false,\n        chatOpen: false,"
  );
  uiStore = uiStore.replace(
    "setSidebarOpen: (open) => set({ sidebarOpen: open }),",
    "setSidebarOpen: (open) => set({ sidebarOpen: open }),\n        toggleChat: () => set((state) => ({ chatOpen: !state.chatOpen })),"
  );
  fs.writeFileSync("src/features/uiStore.ts", uiStore);
}

console.log("Migration and Store built.");

