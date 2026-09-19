const fs = require('fs');
const path = require('path');

const devPath = path.join(__dirname, '../src/components/games/Chess3D/chess/deviceTier.ts');
let content = fs.readFileSync(devPath, 'utf-8');

content = content.replace(
  /switch \(tier\) \{[\s\S]*/,
  `switch (tier) {
    case 'low':
      return {
        tier: 'low',
        maxPixelRatio: 1.0,
        shadowMapEnabled: true,
        shadowMapType: THREE.BasicShadowMap,
        shadowMapSize: 512,
        useHDRI: false,
        useSSAO: false,
        targetFPS: 60,
        enableSoftShadows: false,
        pieceDetailScale: 0.25,
        useInstancing: true,
      };
    case 'mid':
      return {
        tier: 'mid',
        maxPixelRatio: 1.5,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFShadowMap,
        shadowMapSize: 1024,
        useHDRI: true,
        useSSAO: false,
        targetFPS: 60,
        enableSoftShadows: true,
        pieceDetailScale: 0.5,
        useInstancing: true,
      };
    case 'high':
    default:
      return {
        tier: 'high',
        maxPixelRatio: 2.0,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        shadowMapSize: 2048,
        useHDRI: true,
        useSSAO: true,
        targetFPS: 144,
        enableSoftShadows: true,
        pieceDetailScale: 1.0,
        useInstancing: false,
      };
  }
}`
);

fs.writeFileSync(devPath, content);
console.log('Fixed deviceTier.ts');
