import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/supabase/functions/spin/index.ts', 'utf8');

const oldUpdateBlock = "const { error: updateError } = await supabaseAdmin\n      .from('users')\n      .update({\n        tokens: userData.tokens + tokenDelta,\n        total_earned: (userData.tokens + tokenDelta),  // Track cumulative\n        xp: (userData.tokens + tokenDelta),\n      })\n      .eq('id', user.id);\n\n    if (updateError) throw updateError;";

const newUpdateBlock = "const betAmount = spinType === 'paid' ? SPIN_COST_TOKENS : 0;\n    const { data: newBalance, error: updateError } = await supabaseAdmin.rpc('record_game_result', {\n      p_user_id: user.id,\n      p_bet_amount: betAmount,\n      p_earned_amount: rewardTokens,\n      p_xp_earned: 5,\n    });\n\n    if (updateError) throw updateError;";

code = code.replace(oldUpdateBlock, newUpdateBlock);

const oldResponseBlock = "new_balance: userData.tokens + tokenDelta,";
const newResponseBlock = "new_balance: newBalance ?? (userData.tokens + tokenDelta),";

code = code.replace(oldResponseBlock, newResponseBlock);

fs.writeFileSync('d:/Web App - Aqua Blue/supabase/functions/spin/index.ts', code);
console.log('spin/index.ts patched');
