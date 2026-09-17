
const fs = require('fs');
const file = 'src/components/ui/DailyRewardModal.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix the useEffect
content = content.replace(
  /const lastLoginRaw = profile\.streak_last \|\| profile\.last_login \|\| profile\.last_login_date;/g,
  'const lastLoginRaw = profile.streak_last;'
);

// Fix the dependency array
content = content.replace(
  /}, \[profile\?\.last_login_date\]\);/g,
  '}, [profile?.streak_last]);'
);

fs.writeFileSync(file, content);

