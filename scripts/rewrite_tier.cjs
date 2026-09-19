const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, '../src/components/games/Chess3D/chess/deviceTier.ts');
let content = fs.readFileSync(devPath, 'utf-8');

content = content.replace(
  /switch \(tier\) \{[\s\S]*\}\s*return/,
  `switch (tier) {
    case 'low':
      return {
        tier,
        maxPixelRatio: 1.0,
        shadowMapEnabled: false,
        shadowMapType: THREE.BasicShadowMap,
        shadowMapSize: 512,
        useHDRI: false,
        useSSAO: false,
        targetFPS: 60,
        enableSoftShadows: false,
        pieceDetailScale: 0.25, // Aggressive LOD culling
        useInstancing: true
      };
    case 'mid':
      return {
        tier,
        maxPixelRatio: 1.5,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFShadowMap,
        shadowMapSize: 1024,
        useHDRI: true,
        useSSAO: false,
        targetFPS: 60,
        enableSoftShadows: false,
        pieceDetailScale: 0.5,
        useInstancing: true
      };
    case 'high':
    default:
      return {
        tier,
        maxPixelRatio: 2.0,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        shadowMapSize: 2048, // 4K internal shadow map
        useHDRI: true,
        useSSAO: true,
        targetFPS: 144, // 144 FPS Desktop
        enableSoftShadows: true,
        pieceDetailScale: 1.0,
        useInstancing: false // High end can afford draw calls for better culling
      };
  }

  return`
);

content = content.replace(
  /pieceDetailScale: number;/g,
  `pieceDetailScale: number;
  useInstancing: boolean;`
);

fs.writeFileSync(devPath, content);
console.log('deviceTier.ts updated');
