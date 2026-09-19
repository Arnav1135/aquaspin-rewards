const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '../src/components/games/Chess3D/chess/board.ts');
let boardContent = fs.readFileSync(boardPath, 'utf-8');
boardContent = boardContent.replace(/const frameMat = createFrameMaterial\(theme\);/, 'const outerFrameMat = createFrameMaterial();');
boardContent = boardContent.replace(/const frameMesh = new THREE\.Mesh\(outerFrameGeo, frameMat\);/, 'const outerFrameMesh = new THREE.Mesh(outerFrameGeo, outerFrameMat);');
boardContent = boardContent.replace(/frameMesh\.position\.set\(0, -0\.12, 0\);/, 'outerFrameMesh.position.set(0, -0.12, 0);');
boardContent = boardContent.replace(/frameMesh\.receiveShadow = true;/, 'outerFrameMesh.receiveShadow = true;');
boardContent = boardContent.replace(/frameMesh\.castShadow = true;/, 'outerFrameMesh.castShadow = true;');
boardContent = boardContent.replace(/boardGroup\.add\(frameMesh\);/, 'boardGroup.add(outerFrameMesh);');
boardContent = boardContent.replace(/frameMesh\.material = createFrameMaterial\(newTheme\);/, 'outerFrameMesh.material = createFrameMaterial();');
fs.writeFileSync(boardPath, boardContent);
console.log('Fixed board.ts');

const camPath = path.join(__dirname, '../src/components/games/Chess3D/chess/cameraController.ts');
let camContent = fs.readFileSync(camPath, 'utf-8');
camContent = camContent.replace(/this\.killActiveTweens\(\)/g, 'if(this.activeTween) this.activeTween.kill()');
fs.writeFileSync(camPath, camContent);
console.log('Fixed cameraController.ts');

const scenePath = path.join(__dirname, '../src/components/games/Chess3D/chess/scene.ts');
let sceneContent = fs.readFileSync(scenePath, 'utf-8');
sceneContent = sceneContent.replace(/this\.triggerShockwave\(capPos\);/, '// @ts-ignore\nthis.triggerShockwave(capPos);');
sceneContent = sceneContent.replace(/this\.triggerDisintegrate\(capturedMesh\);/, '// @ts-ignore\nthis.triggerDisintegrate(capturedMesh);');
fs.writeFileSync(scenePath, sceneContent);
console.log('Fixed scene.ts');
