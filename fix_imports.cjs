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

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Clean up duplicate imports from my previous run
  content = content.replace(/import\s*\{\s*Canvas\s*\}\s*from\s*'@react-three\/fiber';\n/g, '');
  content = content.replace(/import\s*\{\s*Physics\s*\}\s*from\s*'@react-three\/rapier';\n/g, '');
  content = content.replace(/import\s*\{\s*QualityManager\s*\}\s*from\s*'@\/engine\/QualityManager';\n/g, '');
  content = content.replace(/import\s*\{\s*PostFXManager\s*\}\s*from\s*'@\/engine\/PostFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*VFXManager\s*\}\s*from\s*'@\/engine\/VFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*ParticleManager\s*\}\s*from\s*'@\/engine\/ParticleManager';\n/g, '');

  content = content.replace(/import\s*\{\s*QualityManager\s*\}\s*from\s*'@\/engine\/aaa\/QualityManager';\n/g, '');
  content = content.replace(/import\s*\{\s*PostFXManager\s*\}\s*from\s*'@\/engine\/aaa\/PostFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*VFXManager\s*\}\s*from\s*'@\/engine\/aaa\/VFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*ParticleManager\s*\}\s*from\s*'@\/engine\/aaa\/ParticleManager';\n/g, '');

  // Add them back exactly once if needed
  if (content.includes('<Canvas')) {
      const newImports = `import { Canvas } from '@react-three/fiber';\nimport { Physics } from '@react-three/rapier';\nimport { QualityManager } from '@/engine/aaa/QualityManager';\nimport { PostFXManager } from '@/engine/aaa/PostFXManager';\nimport { VFXManager } from '@/engine/aaa/VFXManager';\nimport { ParticleManager } from '@/engine/aaa/ParticleManager';\n`;
      content = newImports + content;
  }
  
  fs.writeFileSync(file, content);
  console.log('Fixed imports in', file);
}
