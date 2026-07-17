// src/engine/ai/CommitBot.ts
import { execSync } from 'child_process';

console.log("🤖 [AI] CommitBot initiated.");

try {
  // Check if there are changes
  const status = execSync('git status --porcelain').toString();
  if (status.trim().length === 0) {
    console.log("🤖 [AI] No autonomous changes detected to commit.");
    process.exit(0);
  }

  console.log("🤖 [AI] Changes detected. Preparing autonomous commit...");
  
  execSync('git add .');
  execSync('git commit -m "🤖 AI Auto-Evolution: Layout tuning & Level generation [skip ci]"');
  execSync('git push origin master');
  
  console.log("🤖 [AI] Autonomous code evolution committed and pushed to Vercel.");
} catch (e) {
  console.error("🤖 [AI] Failed to commit:", (e as Error).message);
}
