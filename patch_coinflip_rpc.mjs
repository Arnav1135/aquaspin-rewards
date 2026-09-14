import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx', 'utf8');

// Import secure API
code = code.replace(
  "import { supabase } from '@/lib/supabase';",
  "import { supabase } from '@/lib/supabase';\nimport { secureRecordGameResult } from '@/lib/secureEconomy';"
);

// Replace the updateGameResult function body
const oldUpdateStr = \const dbUpdates: any = { tokens: finalBalance };
            if (freeTrialsUsed) {
              const currentTrials = pr.free_trials ?? 3;
              dbUpdates.free_trials = Math.max(0, currentTrials - 1);
            }
            if (won) {
              dbUpdates.total_earned = (pr.total_earned || 0) + (earned - betAmount);
            }
            dbUpdates.xp = (pr.xp || 0) + Math.floor(betAmount * 0.1);

            const { error: gameError } = await (supabase.from('users') as any)
              .update(dbUpdates)
              .eq('id', pr.id);\;

const newUpdateStr = \// Use secure RPC for token transactions
            const { error: gameError } = await secureRecordGameResult({
              userId: pr.id,
              betAmount: betAmount,
              earnedAmount: earned,
              xpEarned: Math.floor(betAmount * 0.1)
            });\;

// We use string manipulation to safely replace it without breaking the rest
code = code.replace(oldUpdateStr, newUpdateStr);

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx', code);
console.log('CoinFlipGame RPC patched!');
