import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx', 'utf8');

if (!code.includes('secureUpdateTokens')) {
  code = code.replace(
    "import { supabase } from '@/lib/supabase';",
    "import { supabase } from '@/lib/supabase';\nimport { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';"
  );
}

const updateBalOld = "const { error } = await (supabase.from('users') as any)\n              .update(dbUpdates)\n              .eq('id', pr.id);";
            
const updateBalNew = "let error = null;\n          if (freeTrialsUsed) {\n            const res = await (supabase.from('users') as any).update(dbUpdates).eq('id', pr.id);\n            error = res.error;\n          } else {\n            const amountChange = newBalance - pr.tokens;\n            const res = await secureUpdateTokens(pr.id, amountChange);\n            error = res.error;\n          }";

code = code.replace(updateBalOld, updateBalNew);

const resultOld = "const { error: updateError } = await (supabase.from('users') as any)\n              .update({\n                tokens: finalBalance,\n                total_earned: pr.total_earned + (won ? Math.max(0, earned - betAmount) : 0),\n                xp: pr.xp + Math.floor(betAmount * 0.1),\n              })\n              .eq('id', pr.id);";

const resultNew = "const { error: updateError } = await secureRecordGameResult({\n            userId: pr.id,\n            betAmount: 0,\n            earnedAmount: won ? earned : 0,\n            xpEarned: Math.floor(betAmount * 0.1)\n          });";

code = code.replace(resultOld, resultNew);

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx', code);
console.log('CoinFlipGame patched safely');
