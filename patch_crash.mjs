import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/CrashGame.tsx', 'utf8');

if (!code.includes('secureUpdateTokens')) {
  code = code.replace(
    "import { supabase } from '@/lib/supabase';",
    "import { supabase } from '@/lib/supabase';\nimport { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';"
  );
}

const updateBalOld = "(supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id).then();";
const updateBalNew = "secureUpdateTokens(profile.id, -actualBetAmount).then();";
code = code.replace(updateBalOld, updateBalNew);

const resultOld = "await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (earned - betAmount), xp: profile.xp + Math.floor(betAmount * 0.15) }).eq('id', profile.id);";
const resultNew = "await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: earned, xpEarned: Math.floor(betAmount * 0.15) });";
code = code.replace(resultOld, resultNew);

const statsOld = "await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });";
code = code.replace(statsOld, "// stats handled by RPC");

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/CrashGame.tsx', code);
console.log('CrashGame patched safely');
