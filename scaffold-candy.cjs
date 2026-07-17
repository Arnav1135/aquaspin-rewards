const fs = require('fs');
const path = require('path');

const dirs = [
  'public/candy-crunch/src/game',
  'public/candy-crunch/src/scenes',
  'public/candy-crunch/src/ui',
  'public/candy-crunch/src/audio',
  'public/candy-crunch/src/data',
  'public/candy-crunch/src/utils',
  'public/candy-crunch/src/styles',
  'public/candy-crunch/icons',
  'scripts'
];

dirs.forEach(d => {
  fs.mkdirSync(path.join(__dirname, d), { recursive: true });
});

console.log('Directories created!');
