const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '../src/components/games/Chess3D/chess/board.ts');
let content = fs.readFileSync(boardPath, 'utf-8');

// I will just checkout the file and rewrite it safely
