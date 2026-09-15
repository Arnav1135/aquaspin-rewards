import fs from 'fs';
const file = 'd:/Web App - Aqua Blue/src/components/games/VideoPoker.tsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/const \{ user \} = useAuthStore\(\);/g, 'const { profile } = useAuthStore();');
content = content.replace(/user\.id/g, 'profile?.id');
content = content.replace(/user\.tokens/g, 'profile?.tokens');
content = content.replace(/if \(\!user\)/g, 'if (!profile)');
content = content.replace(/secureUpdateTokens\([^\)]+\)/g, (match) => {
  if (match.includes('-betAmount')) return 'secureUpdateTokens(profile?.id || "", -betAmount)';
  if (match.includes('payout')) return 'secureUpdateTokens(profile?.id || "", payout)';
  return match;
});
content = content.replace(/secureRecordGameResult\([^\)]+\)/g, 'secureRecordGameResult({ userId: profile?.id || "", betAmount, earnedAmount: payout })');
content = content.replace(/setbetAmount/g, 'setBetAmount');
content = content.replace(/minbetAmount/g, 'minBet');
content = content.replace(/maxbetAmount/g, 'maxBet');
fs.writeFileSync(file, content);
