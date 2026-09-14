const fs = require('fs');

const file = 'd:/Web App - Aqua Blue/src/components/games/ArcheryGame.tsx';
let content = fs.readFileSync(file, 'utf8');

const constants = `
const GEO_ARROW_SHAFT = new THREE.CylinderGeometry(0.02, 0.02, 0.8, 8);
const MAT_ARROW_SHAFT = new THREE.MeshStandardMaterial({ color: "#8B4513" });
const GEO_ARROW_HEAD = new THREE.CylinderGeometry(0.03, 0.001, 0.1, 8);
const MAT_ARROW_HEAD = new THREE.MeshStandardMaterial({ color: "#silver", metalness: 0.8, roughness: 0.2 });
const GEO_ARROW_FEATHER = new THREE.BoxGeometry(0.1, 0.1, 0.01);
const MAT_ARROW_FEATHER = new THREE.MeshStandardMaterial({ color: "#ff0000" });

const GEO_TARGET_1 = new THREE.CylinderGeometry(2, 2, 0.2, 32);
const MAT_TARGET_1 = new THREE.MeshStandardMaterial({ color: "white" });
const GEO_TARGET_2 = new THREE.CylinderGeometry(1.6, 1.6, 0.21, 32);
const MAT_TARGET_2 = new THREE.MeshStandardMaterial({ color: "black" });
const GEO_TARGET_3 = new THREE.CylinderGeometry(1.2, 1.2, 0.22, 32);
const MAT_TARGET_3 = new THREE.MeshStandardMaterial({ color: "#00a8ff" });
const GEO_TARGET_4 = new THREE.CylinderGeometry(0.8, 0.8, 0.23, 32);
const MAT_TARGET_4 = new THREE.MeshStandardMaterial({ color: "red" });
const GEO_TARGET_5 = new THREE.CylinderGeometry(0.4, 0.4, 0.24, 32);
const MAT_TARGET_5 = new THREE.MeshStandardMaterial({ color: "#FFD700" });

const GEO_STAND = new THREE.BoxGeometry(0.2, 3, 0.2);
const MAT_STAND = new THREE.MeshStandardMaterial({ color: "#5C4033" });

const GEO_GROUND = new THREE.BoxGeometry(100, 1, 100);
const MAT_GROUND = new THREE.MeshStandardMaterial({ color: "#2d4c1e", roughness: 0.9 });
`;

content = content.replace("interface Props { onClose: () => void; }", constants + "\n\ninterface Props { onClose: () => void; }");

const replacements = [
  [/<Cylinder args={\\[0\.02, 0\.02, 0\.8, 8\\]}>\s*<meshStandardMaterial color="#8B4513" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_ARROW_SHAFT} material={MAT_ARROW_SHAFT} />'],
  [/<Cylinder args={\\[0\.03, 0\.001, 0\.1, 8\\]} position={\\[0, -0\.45, 0\\]}>\s*<meshStandardMaterial color="#silver" metalness={0\.8} roughness={0\.2} \/>\s*<\/Cylinder>/g, '<mesh position={[0, -0.45, 0]} geometry={GEO_ARROW_HEAD} material={MAT_ARROW_HEAD} />'],
  [/<Box args={\\[0\.1, 0\.1, 0\.01\\]} position={\\[0, 0\.35, 0\\]}>\s*<meshStandardMaterial color="#ff0000" \/>\s*<\/Box>/g, '<mesh position={[0, 0.35, 0]} geometry={GEO_ARROW_FEATHER} material={MAT_ARROW_FEATHER} />'],
  
  [/<Cylinder args={\\[2, 2, 0\.2, 32\\]}>\s*<meshStandardMaterial color="white" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_TARGET_1} material={MAT_TARGET_1} />'],
  [/<Cylinder args={\\[1\.6, 1\.6, 0\.21, 32\\]}>\s*<meshStandardMaterial color="black" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_TARGET_2} material={MAT_TARGET_2} />'],
  [/<Cylinder args={\\[1\.2, 1\.2, 0\.22, 32\\]}>\s*<meshStandardMaterial color="#00a8ff" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_TARGET_3} material={MAT_TARGET_3} />'],
  [/<Cylinder args={\\[0\.8, 0\.8, 0\.23, 32\\]}>\s*<meshStandardMaterial color="red" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_TARGET_4} material={MAT_TARGET_4} />'],
  [/<Cylinder args={\\[0\.4, 0\.4, 0\.24, 32\\]}>\s*<meshStandardMaterial color="#FFD700" \/>\s*<\/Cylinder>/g, '<mesh geometry={GEO_TARGET_5} material={MAT_TARGET_5} />'],
  
  [/<Box args={\\[0\.2, 3, 0\.2\\]} position={\\[-1, 0, -1\.5\\]} rotation={\\[0, 0, Math\.PI\/2\\]}>\s*<meshStandardMaterial color="#5C4033" \/>\s*<\/Box>/g, '<mesh position={[-1, 0, -1.5]} rotation={[0, 0, Math.PI/2]} geometry={GEO_STAND} material={MAT_STAND} />'],
  [/<Box args={\\[0\.2, 3, 0\.2\\]} position={\\[1, 0, -1\.5\\]} rotation={\\[0, 0, Math\.PI\/2\\]}>\s*<meshStandardMaterial color="#5C4033" \/>\s*<\/Box>/g, '<mesh position={[1, 0, -1.5]} rotation={[0, 0, Math.PI/2]} geometry={GEO_STAND} material={MAT_STAND} />'],
  
  [/<Box args={\\[100, 1, 100\\]} position={\\[0, -0\.5, 0\\]}>\s*<meshStandardMaterial color="#2d4c1e" roughness={0\.9} \/>\s*<\/Box>/g, '<mesh position={[0, -0.5, 0]} geometry={GEO_GROUND} material={MAT_GROUND} />'],
];

replacements.forEach(([pat, repl]) => {
  content = content.replace(pat, repl);
});

fs.writeFileSync(file, content);
console.log('Archery fixed');
