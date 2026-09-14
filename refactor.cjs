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
  
  if (content.includes('GameEngine3D')) {
    // Remove old import
    content = content.replace(/import\s*\{\s*GameEngine3D\s*\}\s*from\s*['\"](?:@|\.\.?)[\/a-zA-Z0-9_-]*GameEngine3D['\"];?\r?\n?/g, '');
    
    if (content.includes('<GameEngine3D')) {
      const newImports = `import { Canvas } from '@react-three/fiber';\nimport { Physics } from '@react-three/rapier';\nimport { QualityManager } from '@/engine/QualityManager';\nimport { PostFXManager } from '@/engine/PostFXManager';\nimport { VFXManager } from '@/engine/VFXManager';\nimport { ParticleManager } from '@/engine/ParticleManager';\n`;
      
      content = newImports + content;
      
      const openTagRegex = /<GameEngine3D\s*([^>]*)>/g;
      
      content = content.replace(openTagRegex, (match, propsString) => {
        let canvasProps = [];
        let hasPhysics = false;
        
        const cameraMatch = propsString.match(/cameraPosition=\{([^}]+)\}/);
        if (cameraMatch) {
            canvasProps.push(`camera={{ position: ${cameraMatch[1]} }}`);
        }
        
        if (propsString.includes('enablePhysics={true}')) {
            hasPhysics = true;
        }
        
        let out = `<Canvas ${canvasProps.join(' ')}>\n<QualityManager />\n<PostFXManager />\n<VFXManager />\n<ParticleManager />`;
        if (hasPhysics) {
            out += `\n<Physics>`;
        }
        
        return out;
      });
      
      const closeTagRegex = /<\/GameEngine3D>/g;
      content = content.replace(closeTagRegex, (match) => {
         return originalContent.includes('enablePhysics={true}') ? `</Physics>\n</Canvas>` : `</Canvas>`; 
      });
    }
    
    fs.writeFileSync(file, content);
    console.log('Modified', file);
  }
}
