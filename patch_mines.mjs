import fs from 'fs';
let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/MinesGame.tsx', 'utf8');

const constants = \
// --- Hoisted Geometries and Materials to fix GC stutter ---
const geoTile = new THREE.BoxGeometry(1.3, 0.4, 1.3);
const geoRim = new THREE.BoxGeometry(1.35, 0.35, 1.35);
const geoBase = new THREE.BoxGeometry(8, 0.4, 8);
const geoBomb = new THREE.SphereGeometry(0.5, 32, 32);
const geoGem = new THREE.OctahedronGeometry(0.4, 0);

const matBase = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#0a0a0a', metalness: 0.9, roughness: 0.1 });
const matRim = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#00f0ff', transparent: true, opacity: 0.1, wireframe: true });
const matTileMine = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#1a0505', metalness: 0.8, roughness: 0.2 });
const matTileSafe = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#051a1a', metalness: 0.8, roughness: 0.2 });
const matTileHover = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#1a3a4a', metalness: 0.8, roughness: 0.2, emissive: '#00f0ff', emissiveIntensity: 0.2 });
const matTileNormal = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#0f1a24', metalness: 0.8, roughness: 0.2, emissive: '#000000', emissiveIntensity: 0.2 });
const matBomb = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: '#550000', metalness: 0.5, roughness: 0.7 });
const matGem = new THREE.MeshPhysicalMaterial({ color: '#00ffff', metalness: 0.1, roughness: 0.1, transmission: 0.9, thickness: 0.5, emissive: '#0055ff', emissiveIntensity: 0.5 });
\;

code = code.replace(/import \{ Physics \} from '@react-three\/rapier';\r?\n/, "import { Physics } from '@react-three/rapier';\n" + constants + "\n");

code = code.replace(/<boxGeometry args=\{\\[1\\.3, 0\\.4, 1\\.3\\]\} \\/>/g, '');
code = code.replace(/<boxGeometry args=\{\\[1\\.35, 0\\.35, 1\\.35\\]\} \\/>/g, '');
code = code.replace(/<boxGeometry args=\{\\[8, 0\\.4, 8\\]\} \\/>/g, '');
code = code.replace(/<sphereGeometry args=\{\\[0\\.5, 32, 32\\]\} \\/>/g, '');
code = code.replace(/<octahedronGeometry args=\{\\[0\\.4, 0\\]\} \\/>/g, '');

code = code.replace(/<mesh position=\{\\[0, -0\\.4, 0\\]\} receiveShadow>/g, '<mesh position={[0, -0.4, 0]} receiveShadow geometry={geoBase} material={matBase}>');
code = code.replace(/<meshPhysicalMaterial clearcoat=\{1\\.0\} clearcoatRoughness=\{0\\.1\} envMapIntensity=\{1\\.5\} transmission=\{0\} thickness=\{0\} color="#0a0a0a" metalness=\{0\\.9\} roughness=\{0\\.1\} \\/>/g, '');

code = code.replace(/position=\{\\[0, 0, 0\\]\}\r?\\n\\s*>\r?\\n\\s*<meshPhysicalMaterial[\\s\\S]*?emissiveIntensity=\{0\\.2\}\\r?\\n\\s*\\/>/g, 'position={[0, 0, 0]}\n        geometry={geoTile}\n        material={tile.clicked ? (tile.isMine ? matTileMine : matTileSafe) : (hovered && isPlaying && !gameOver ? matTileHover : matTileNormal)}\n      >');

code = code.replace(/<mesh position=\{\\[0, 0\\.05, 0\\]\}>\r?\\n\\s*<meshPhysicalMaterial[\\s\\S]*?wireframe=\{true\} \\/>/g, '<mesh position={[0, 0.05, 0]} geometry={geoRim} material={matRim}>');

code = code.replace(/<mesh ref=\{bombRef\} castShadow>\r?\\n\\s*<meshPhysicalMaterial[\\s\\S]*?roughness=\{0\\.7\} \\/>/g, '<mesh ref={bombRef} castShadow geometry={geoBomb} material={matBomb}>');

code = code.replace(/<mesh ref=\{gemRef\} castShadow>\r?\\n\\s*<meshPhysicalMaterial[\\s\\S]*?emissiveIntensity=\{0\\.5\}\\r?\\n\\s*\\/>/g, '<mesh ref={gemRef} castShadow geometry={geoGem} material={matGem}>');

code = code.replace(/<mesh position=\{\\[0, 0, 0\\]\} receiveShadow>\r?\\n\\s*<meshPhysicalMaterial[\\s\\S]*?roughness=\{0\\.2\} \\/>/g, '<mesh position={[0, 0, 0]} receiveShadow geometry={geoTile} material={matTileNormal}>');

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/MinesGame.tsx', code);
console.log('Fixed MinesGame');
