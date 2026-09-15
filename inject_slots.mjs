import fs from 'fs';
// Inject into registry
const gamesJsonPath = 'd:/Web App - Aqua Blue/factory/games/registry/games.json';
let gamesJson = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));

if (!gamesJson.find(g => g.key === 'slots')) {
  gamesJson.unshift({
    key: 'slots',
    title: 'Lucky Slots',
    emoji: '??',
    category: 'Casino',
    reward: 'Up to 50x',
    difficulty: 'Easy',
    color: '#EAB308',
    desc: 'Classic Vegas-style slot machine. Match 3 symbols to win big!'
  });
  fs.writeFileSync(gamesJsonPath, JSON.stringify(gamesJson, null, 2));
}

const miniGamesPath = 'd:/Web App - Aqua Blue/src/pages/MiniGames.tsx';
let miniGames = fs.readFileSync(miniGamesPath, 'utf8');

if (!miniGames.includes('import("@/components/games/SlotsGame")')) {
  const slotsImport = "const SlotsGame = lazy(() => import('@/components/games/SlotsGame').then((m) => ({ default: m.default })));";
  miniGames = miniGames.replace('const ClickerGame = lazy', slotsImport + '\nconst ClickerGame = lazy');
  miniGames = miniGames.replace('case "blackjack":\n      return <BlackjackGame />;', 'case "blackjack":\n      return <BlackjackGame />;\n    case "slots":\n      return <SlotsGame />;');
  fs.writeFileSync(miniGamesPath, miniGames);
}
console.log('Injected Slots');
