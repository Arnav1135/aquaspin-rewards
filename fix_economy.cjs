const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = glob.sync('src/components/games/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // 1. Remove secureUpdateTokens for positive wins (where they add tokens back before calling recordGameResult)
  // E.g. await secureUpdateTokens(profile.id, win);
  // E.g. await secureUpdateTokens(profile.id, totalWin);
  // We'll replace it with empty string. We can use a regex that matches secureUpdateTokens(..., > 0 variable)
  // Actually, it's safer to just look for secureUpdateTokens(..., tokenChange/win/payout) where it's not negative.
  
  content = content.replace(/await\s+secureUpdateTokens\([^,]+,\s*(?:totalWin|win|payout)\);?/g, '');

  // For Blackjack / DragonTiger which do: secureUpdateTokens(pr.id, tokensChange)
  // It's trickier. 

  // 2. Change secureRecordGameResult({ ..., betAmount: <var>, earnedAmount: <var> }) 
  // to betAmount: 0
  // Note: we ONLY want to change betAmount to 0 if the game already pre-deducted the bet.
  // We can just blindly set betAmount: 0 for all secureRecordGameResult calls in these specific files because they all pre-deduct.
  content = content.replace(/(secureRecordGameResult\(\{.*?betAmount:\s*)([a-zA-Z0-9_]+)(,.*?\}\))/gs, (match, p1, p2, p3) => {
    if (p2 !== '0') {
      return p1 + '0' + p3 + ' /* AUTOFIX: bet=0 to prevent double charge */';
    }
    return match;
  });

  if (original !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed:', file);
  }
});
