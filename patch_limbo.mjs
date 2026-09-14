import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/LimboGame.tsx', 'utf8');

if (!code.includes('secureUpdateTokens')) {
  code = code.replace(
    "import { supabase } from '@/lib/supabase';",
    "import { supabase } from '@/lib/supabase';\nimport { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';"
  );
}

const updateBalOld = "await (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id);";
const updateBalNew = "await secureUpdateTokens(profile.id, -actualBetAmount);";
code = code.replace(updateBalOld, updateBalNew);

const resultOld = "await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? Math.floor(betAmount * (targetMultiplier - 1)) : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);";
const resultNew = "await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: isWin ? Math.floor(betAmount * targetMultiplier) : 0, xpEarned: Math.floor(betAmount * 0.1) });";
code = code.replace(resultOld, resultNew);

// Optionally remove the separate game_stats upsert because secureRecordGameResult handles it!
const statsOld = "await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });";
code = code.replace(statsOld, "// stats handled by RPC");

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/LimboGame.tsx', code);
console.log('LimboGame patched safely');
