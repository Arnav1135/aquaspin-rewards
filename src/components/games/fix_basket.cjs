const fs = require('fs');

const file = 'd:/Web App - Aqua Blue/src/components/games/Basketball3DGame.tsx';
let content = fs.readFileSync(file, 'utf8');

const constants = `
const GEO_BACKBOARD = new THREE.BoxGeometry(4, 3, 0.2);
const MAT_BACKBOARD = new THREE.MeshStandardMaterial({ color: "#ffffff", metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.85 });

const GEO_BACKBOARD_BORDER = new THREE.BoxGeometry(4.2, 3.2, 0.1);
const MAT_BACKBOARD_BORDER = new THREE.MeshStandardMaterial({ color: "#222222", metalness: 0.9, roughness: 0.2 });

const GEO_RIM_BASE = new THREE.BoxGeometry(0.3, 0.2, 0.6);
const MAT_RIM_BASE = new THREE.MeshStandardMaterial({ color: "#ff4400", metalness: 0.6, roughness: 0.2 });

const GEO_RIM = new THREE.TorusGeometry(0.7, 0.05, 16, 32);
const MAT_RIM = new THREE.MeshStandardMaterial({ color: "#ff4400", metalness: 0.5, roughness: 0.2 });

const GEO_BALL = new THREE.SphereGeometry(0.4, 32, 32);
const MAT_BALL = new THREE.MeshStandardMaterial({ color: "#cc5500", metalness: 0.1, roughness: 0.8 });

const GEO_FLOOR = new THREE.PlaneGeometry(20, 20);
const MAT_FLOOR = new THREE.MeshStandardMaterial({ color: "#aa6633", metalness: 0.1, roughness: 0.4 });
`;

content = content.replace("function Hoop() {", constants + "\n\nfunction Hoop() {");

const replacements = [
  [/<mesh position={\\[0, 1, -0\.3\\]} castShadow receiveShadow>\s*<boxGeometry args={\\[4, 3, 0\.2\\]} \/>\s*<meshStandardMaterial color="#ffffff" metalness={0\.8} roughness={0\.1} transparent opacity={0\.85} \/>\s*<\/mesh>/g, '<mesh position={[0, 1, -0.3]} castShadow receiveShadow geometry={GEO_BACKBOARD} material={MAT_BACKBOARD} />'],
  
  [/<mesh position={\\[0, 1, -0\.2\\]}>\s*<boxGeometry args={\\[4\.2, 3\.2, 0\.1\\]} \/>\s*<meshStandardMaterial color="#222222" metalness={0\.9} roughness={0\.2} \/>\s*<\/mesh>/g, '<mesh position={[0, 1, -0.2]} geometry={GEO_BACKBOARD_BORDER} material={MAT_BACKBOARD_BORDER} />'],
  
  [/<mesh position={\\[0, 0, 0\\]} castShadow>\s*<boxGeometry args={\\[0\.3, 0\.2, 0\.6\\]} \/>\s*<meshStandardMaterial color="#ff4400" metalness={0\.6} roughness={0\.2} \/>\s*<\/mesh>/g, '<mesh position={[0, 0, 0]} castShadow geometry={GEO_RIM_BASE} material={MAT_RIM_BASE} />'],
  
  [/<mesh position={\\[0, 0, 0\.7\\]} rotation={\\[Math\.PI \/ 2, 0, 0\\]} castShadow>\s*<torusGeometry args={\\[0\.7, 0\.05, 16, 32\\]} \/>\s*<meshStandardMaterial color="#ff4400" metalness={0\.5} roughness={0\.2} \/>\s*<\/mesh>/g, '<mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow geometry={GEO_RIM} material={MAT_RIM} />'],
  
  [/<mesh castShadow receiveShadow>\s*<sphereGeometry args={\\[0\.4, 32, 32\\]} \/>\s*<meshStandardMaterial color="#cc5500" metalness={0\.1} roughness={0\.8} \/>\s*<\/mesh>/g, '<mesh castShadow receiveShadow geometry={GEO_BALL} material={MAT_BALL} />'],
  
  [/<mesh rotation={\\[-Math\.PI\/2, 0, 0\\]} receiveShadow position={\\[0, 0, 0\\]}>\s*<planeGeometry args={\\[20, 20\\]} \/>\s*<meshStandardMaterial color="#aa6633" metalness={0\.1} roughness={0\.4} \/>\s*<\/mesh>/g, '<mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0, 0, 0]} geometry={GEO_FLOOR} material={MAT_FLOOR} />'],
];

replacements.forEach(([pat, repl]) => {
  content = content.replace(pat, repl);
});

fs.writeFileSync(file, content);
console.log('Basketball fixed');
