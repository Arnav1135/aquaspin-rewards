const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '../src/components/games/Chess3D/chess/board.ts');
let content = fs.readFileSync(boardPath, 'utf-8');

// The original board just created simple tiles. We want to add a premium wooden frame around it with beveled edges.
content = content.replace(
  /const boardGroup = new THREE\.Group\(\);/,
  `const boardGroup = new THREE.Group();
  
  // Add premium wooden frame
  const frameGeo = new THREE.BoxGeometry(9.0, 0.4, 9.0);
  const frameMat = createFrameMaterial();
  const frameMesh = new THREE.Mesh(frameGeo, frameMat);
  frameMesh.position.y = -0.25;
  frameMesh.receiveShadow = true;
  frameMesh.castShadow = true;
  boardGroup.add(frameMesh);
  `
);

fs.writeFileSync(boardPath, content);
console.log('board.ts updated with premium frame');
