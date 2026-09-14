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
  content = content.replace(/import\s*\{\s*QualityManager\s*\}\s*from\s*'@\/engine\/aaa\/QualityManager';\n/g, '');
  content = content.replace(/import\s*\{\s*PostFXManager\s*\}\s*from\s*'@\/engine\/aaa\/PostFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*VFXManager\s*\}\s*from\s*'@\/engine\/aaa\/VFXManager';\n/g, '');
  content = content.replace(/import\s*\{\s*ParticleManager\s*\}\s*from\s*'@\/engine\/aaa\/ParticleManager';\n/g, '');
  // Also clean old engine import if present
  content = content.replace(/import\s*\{\s*GameEngine3D\s*\}\s*from\s*['\"](?:@|\.\.?)[\/a-zA-Z0-9_-]*GameEngine3D['\"];?\r?\n?/g, '');

  if (content.includes('<Canvas')) {
      // First, we need to revert the changes I made to tags.
      // Wait, what did I do? I changed `<GameEngine3D` to `<Canvas`, `<QualityManager />`, `<PostFXManager />`, `<VFXManager />`, `<ParticleManager />`, `<Physics>`.
      // Let's replace the whole block I added back to `<GameEngine3D>` and then re-do it properly, or just fix it.
      
      const openTagRegex = /<Canvas([^>]*)>\s*<QualityManager \/>\s*<PostFXManager \/>\s*<VFXManager \/>\s*<ParticleManager \/>(\s*<Physics>)?/g;
      
      content = content.replace(openTagRegex, (match, canvasProps, physicsTag) => {
          let hasPhysics = !!physicsTag;
          
          let out = `<Canvas${canvasProps}>\n<QualityManager>\n<VFXManager>\n<PostFXManager />\n<ParticleManager />`;
          if (hasPhysics) {
              out += `\n<Physics>`;
          }
          return out;
      });
      
      const closeTagRegex = /(<\/Physics>\s*)?<\/Canvas>/g;
      
      content = content.replace(closeTagRegex, (match, physicsClose) => {
          // If the match happens in a file where we actually replaced it (not some other Canvas)
          // Actually, this might break other Canvas tags.
          // Since I know these 8 files only had GameEngine3D, it should be fine.
          
          if (physicsClose) {
              return `</Physics>\n</VFXManager>\n</QualityManager>\n</Canvas>`;
          } else {
              return `</VFXManager>\n</QualityManager>\n</Canvas>`;
          }
      });

      const newImports = `import { Canvas } from '@react-three/fiber';\nimport { Physics } from '@react-three/rapier';\nimport { QualityManager } from '@/engine/aaa/QualityManager';\nimport { PostFXManager } from '@/engine/aaa/PostFXManager';\nimport { VFXManager } from '@/engine/aaa/VFXManager';\nimport { ParticleManager } from '@/engine/aaa/ParticleManager';\n`;
      content = newImports + content;
  } else {
      // PlinkoGame has no Canvas tag, just imports maybe.
      // Already cleaned up.
  }
  
  fs.writeFileSync(file, content);
  console.log('Fixed tags in', file);
}
