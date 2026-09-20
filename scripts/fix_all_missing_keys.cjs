const fs = require('fs');
const registryFile = 'factory/games/registry/games.json';
let games = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
games.forEach(g => {
  if (!g.key) {
    if (g.title === 'Video Poker') g.key = 'videopoker';
    else if (g.title === 'Neon Snake') g.key = 'snake';
    else if (g.title === 'Poker 3D') g.key = 'poker-3d';
    else if (g.title === 'Keno 3D') g.key = 'keno-3d';
    else if (g.title === 'Sic Bo 3D') g.key = 'sicbo-3d';
    else if (g.title === '3D Horse Racing') g.key = 'horse-racing-3d';
    else if (g.title === 'Crypto Towers 3D') g.key = 'tower-3d';
  }
});
fs.writeFileSync(registryFile, JSON.stringify(games, null, 4));
console.log('Fixed missing keys in games.json');
