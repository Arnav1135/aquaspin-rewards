import fs from 'fs';

const files = [
  { path: 'd:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx', name: 'CoinFlipGame' },
  { path: 'd:/Web App - Aqua Blue/src/components/games/DragonTigerGame.tsx', name: 'DragonTigerGame' },
  { path: 'd:/Web App - Aqua Blue/src/components/games/LimboGame.tsx', name: 'LimboGame' }
];

for (const file of files) {
  let code = fs.readFileSync(file.path, 'utf8');

  code = code.replace(
    'export function () {\n  const { setSafeTimeout } = useSafeTimeout();',
    'export function ' + file.name + '({ onClose }: any) {\n  const { setSafeTimeout } = useSafeTimeout();'
  );

  fs.writeFileSync(file.path, code);
  console.log(file.path + ' fixed!');
}
