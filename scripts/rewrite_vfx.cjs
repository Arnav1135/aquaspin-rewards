const fs = require('fs');
const path = require('path');

const boardPath = path.join(__dirname, '../src/components/games/Chess3D/chess/board.ts');
let content = fs.readFileSync(boardPath, 'utf-8');

// Replace createHighlightMesh
content = content.replace(
  /export function createHighlightMesh\(\): THREE\.Mesh \{[\s\S]*?\n\}/,
  `export function createHighlightMesh(): THREE.Mesh {
  const geo = new THREE.TorusGeometry(0.4, 0.05, 16, 64);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffcc00,
    transparent: true,
    opacity: 0.8,
    depthTest: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = Math.PI / 2;
  mesh.position.y = 0.06;
  
  // Add pulsating glow animation
  const animate = () => {
    if (!mesh.parent) return; // only animate if active
    const time = Date.now() * 0.003;
    mesh.scale.setScalar(1.0 + Math.sin(time) * 0.1);
    mat.opacity = 0.6 + Math.sin(time) * 0.4;
    requestAnimationFrame(animate);
  };
  animate();
  
  return mesh;
}`
);

// Replace createDestinationMarkerMesh
content = content.replace(
  /export function createDestinationMarkerMesh\(\): THREE\.Mesh \{[\s\S]*?\n\}/,
  `export function createDestinationMarkerMesh(): THREE.Mesh {
  const geo = new THREE.CircleGeometry(0.2, 32);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x00ffcc,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.06;
  
  const animate = () => {
    if (!mesh.parent) return;
    const time = Date.now() * 0.005;
    mat.opacity = 0.3 + Math.sin(time) * 0.2;
    requestAnimationFrame(animate);
  };
  animate();
  
  return mesh;
}`
);

fs.writeFileSync(boardPath, content);
console.log('board.ts updated with VFX markers');
