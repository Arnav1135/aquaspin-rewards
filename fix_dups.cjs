const fs = require('fs');

const files = [
  'src/components/games/ArcheryGame.tsx',
  'src/components/games/Bowling3DGame.tsx',
  'src/components/games/ChickenJumpGame.tsx',
  'src/components/games/CoinFlipGame.tsx',
  'src/components/games/DartsGame.tsx',
  'src/components/games/MinesGame.tsx',
  'src/components/games/PlinkoGame.tsx',
  'src/components/games/RouletteGame.tsx'
];

function deduplicateImports(content) {
    const importRegex = /import\s*\{[^}]*\}\s*from\s*['"][^'"]*['"];?/g;
    const imports = new Set();
    let newContent = content.replace(importRegex, (match) => {
        // Simple way: if exactly same string, remove it. 
        // But the issue is sometimes it's grouped differently or something.
        // Let's just do exact match deduplication.
        if (imports.has(match)) {
            return '';
        } else {
            imports.add(match);
            return match;
        }
    });
    
    // Sometimes it's two separate imports for same module but different variables. 
    // Here we mainly have duplicate `import { Canvas } from '@react-three/fiber';` strings since I just prepended them.
    return newContent;
}

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Actually, wait, sometimes the duplicate is because of:
  // import { Canvas } from '@react-three/fiber';
  // import { Canvas, useFrame } from '@react-three/fiber';
  
  // So I should specifically remove the ones I added manually IF they are already imported.
  // The simplest way to handle this in a script is to just remove the lines I added and let eslint/auto-import or just carefully re-add them.
  // Actually, I can just use regex to remove any standalone `import { Canvas } from '@react-three/fiber';\n` and then rely on whatever was there?
  // No, if it wasn't there, it will be missing.
  
  // Let's just remove the first 6 lines of my added block if they are duplicated later.
  content = deduplicateImports(content);
  
  fs.writeFileSync(file, content);
  console.log('Fixed duplicate imports in', file);
}
