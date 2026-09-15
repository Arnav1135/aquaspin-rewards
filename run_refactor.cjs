const fs = require('fs');

const files = [
  'src/components/games/ChickenGame.tsx',
  'src/components/games/FlipGame.tsx',
  'src/components/games/MinesGame.tsx',
  'src/components/games/RouletteGame.tsx',
  'src/features/coinflip/CoinFlipScene.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Ensure imports are added
  if (!content.includes('secureEconomy')) {
    content = content.replace(
      "import { supabase } from '@/lib/supabase';",
      "import { supabase } from '@/lib/supabase';\nimport { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';"
    );
  }

  // Replace start game deduction
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\.update\(\{\s*tokens:\s*(nb|newBalance)\s*\}\)\.eq\('id',\s*(profile\.id|currentProfile\.id)\);/g,
    (match, p1, p2) => {
      return `await secureUpdateTokens(${p2}, -actualBetAmount);`;
    }
  );

  // Replace ChickenGame payout
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\.update\(\{\s*tokens:\s*fb,\s*total_earned:\s*profile\.total_earned\s*\+\s*\(won\s*-\s*betAmount\),\s*xp:\s*profile\.xp\s*\+\s*Math\.floor\(betAmount\s*\*\s*0\.1\)\s*\}\)\.eq\('id',\s*profile\.id\);/g,
    "await secureRecordGameResult({ userId: profile.id, betAmount: betAmount, earnedAmount: won, xpEarned: Math.floor(betAmount * 0.1) });"
  );

  // Replace FlipGame payout
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\.update\(\{\s*tokens:\s*fb,\s*total_earned:\s*profile\.total_earned\s*\+\s*\(won\s*\?\s*payout\s*-\s*betAmount\s*:\s*0\),\s*xp:\s*profile\.xp\s*\+\s*Math\.floor\(betAmount\s*\*\s*0\.1\)\s*\}\)\.eq\('id',\s*profile\.id\);/g,
    "await secureRecordGameResult({ userId: profile.id, betAmount: betAmount, earnedAmount: won ? payout : 0, xpEarned: Math.floor(betAmount * 0.1) });"
  );

  // Replace MinesGame payout
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\.update\(\{\s*tokens:\s*fb,\s*total_earned:\s*profile\.total_earned\s*\+\s*profit,\s*xp:\s*profile\.xp\s*\+\s*Math\.floor\(betAmount\s*\*\s*0\.15\),\s*\}\)\.eq\('id',\s*profile\.id\);/g,
    "await secureRecordGameResult({ userId: profile.id, betAmount: betAmount, earnedAmount: won, xpEarned: Math.floor(betAmount * 0.15) });"
  );

  // Replace CoinFlip payout
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\s*\.update\(\{\s*tokens:\s*finalBalance,\s*total_earned:\s*currentProfile\.total_earned\s*\+\s*\(hasWon\s*\?\s*payout\s*-\s*betAmount\s*:\s*0\),\s*xp:\s*currentProfile\.xp\s*\+\s*Math\.floor\(betAmount\s*\*\s*0\.1\),\s*\}\)\s*\.eq\('id',\s*currentProfile\.id\);/g,
    "await secureRecordGameResult({ userId: currentProfile.id, betAmount: betAmount, earnedAmount: hasWon ? payout : 0, xpEarned: Math.floor(betAmount * 0.1) });"
  );

  // Replace RouletteGame payout (no xp/stats)
  // await (supabase.from('users') as any).update({ tokens: profile.tokens + earned }).eq('id', profile.id);
  content = content.replace(
    /await\s*\(supabase\.from\('users'\)\s*as\s*any\)\.update\(\{\s*tokens:\s*profile\.tokens\s*\+\s*earned\s*\}\)\.eq\('id',\s*profile\.id\);/g,
    "await secureUpdateTokens(profile.id, earned);"
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed', file);
}
