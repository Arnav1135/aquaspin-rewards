import fs from 'fs';
import path from 'path';

const gamesJsonPath = 'd:/Web App - Aqua Blue/factory/games/registry/games.json';
let gamesJson = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));

if (!gamesJson.find(g => g.key === 'baccarat')) {
  gamesJson.unshift({
    key: 'baccarat',
    title: 'Baccarat',
    emoji: '??',
    category: 'Casino',
    reward: 'Up to 9x',
    difficulty: 'Medium',
    color: '#8B5CF6',
    desc: 'Classic Casino Baccarat. Bet on Player, Banker, or Tie!'
  });
  fs.writeFileSync(gamesJsonPath, JSON.stringify(gamesJson, null, 2));
}

const miniGamesPath = 'd:/Web App - Aqua Blue/src/pages/MiniGames.tsx';
let miniGames = fs.readFileSync(miniGamesPath, 'utf8');

if (!miniGames.includes('import("@/components/games/BaccaratGame")')) {
  const baccaratImport = "const BaccaratGame = lazy(() => import('@/components/games/BaccaratGame').then((m) => ({ default: m.default })));";
  miniGames = miniGames.replace('const ClickerGame = lazy', baccaratImport + '\nconst ClickerGame = lazy');
  miniGames = miniGames.replace('case "blackjack":\n      return <BlackjackGame />;', 'case "blackjack":\n      return <BlackjackGame />;\n    case "baccarat":\n      return <BaccaratGame />;');
  fs.writeFileSync(miniGamesPath, miniGames);
}

console.log('Injected Baccarat');
