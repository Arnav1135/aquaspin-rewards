const fs = require('fs');
const file = 'factory/games/registry/games.json';
let data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.forEach(g => {
  if (g.title === 'Mines' && !g.key) {
    g.key = 'mines';
  }
});
fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('Fixed mines key');
