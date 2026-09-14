import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/pages/Shop.tsx', 'utf8');

if (!code.includes('secureUpdateTokens')) {
  code = code.replace(
    "import { supabase } from '@/lib/supabase';",
    "import { supabase } from '@/lib/supabase';\nimport { secureUpdateTokens } from '@/lib/secureEconomy';"
  );
}

const oldLogic = "const newBalance = profile.tokens - confirmItem.cost + bonusTokens;\n      await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);\n      updateProfile({ tokens: newBalance });";

const newLogic = "const amountChange = -confirmItem.cost + bonusTokens;\n      const { data: newTokens } = await secureUpdateTokens(profile.id, amountChange);\n      if (newTokens !== null) {\n        updateProfile({ tokens: newTokens });\n      } else {\n        throw new Error('Transaction failed');\n      }";

code = code.replace(oldLogic, newLogic);

fs.writeFileSync('d:/Web App - Aqua Blue/src/pages/Shop.tsx', code);
console.log('Shop.tsx patched');
