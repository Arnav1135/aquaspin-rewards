import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/supabase/functions/ad-reward/index.ts', 'utf8');

const oldLogic = "if (tokensToAward > 0) {\n      const { data: userData } = await supabaseAdmin\n        .from('users')\n        .select('tokens, total_earned')\n        .eq('id', user.id)\n        .single();\n\n      if (userData) {\n        await supabaseAdmin\n          .from('users')\n          .update({\n            tokens: userData.tokens + tokensToAward,\n            total_earned: userData.total_earned + tokensToAward,\n          })\n          .eq('id', user.id);\n      }\n    }";

const newLogic = "if (tokensToAward > 0) {\n      // Use the newly deployed RPC to atomically handle token math\n      await supabaseAdmin.rpc('record_game_result', {\n        p_user_id: user.id,\n        p_bet_amount: 0,\n        p_earned_amount: tokensToAward,\n        p_xp_earned: 0\n      });\n    }";

code = code.replace(oldLogic, newLogic);

fs.writeFileSync('d:/Web App - Aqua Blue/supabase/functions/ad-reward/index.ts', code);
console.log('ad-reward edge function patched');
