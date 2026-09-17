
const fs = require('fs');
const file = 'src/components/ui/DailyRewardModal.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /const currentStreak = profile\?\.login_streak \|\| 0;/g,
  'const currentStreak = profile?.streak || 0;'
);

fs.writeFileSync(file, content);

