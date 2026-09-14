import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/lib/secureEconomy.ts', 'utf8');

code = code.replace(
  "const { data: user } = await supabase.from('users').select('tokens').eq('id', userId).single();",
  "const { data: user } = await supabase.from('users').select('tokens').eq('id', userId).single() as any;"
);

code = code.replace(
  "const { data: user } = await supabase.from('users').select('tokens, total_earned, xp').eq('id', payload.userId).single();",
  "const { data: user } = await supabase.from('users').select('tokens, total_earned, xp').eq('id', payload.userId).single() as any;"
);

fs.writeFileSync('d:/Web App - Aqua Blue/src/lib/secureEconomy.ts', code);
