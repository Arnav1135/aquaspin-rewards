import re
import os

air_hockey_path = r"d:\Web App - Aqua Blue\src\components\games\AirHockey3DGame.tsx"
bowling_path = r"d:\Web App - Aqua Blue\src\components\games\Bowling3DGame.tsx"

with open(air_hockey_path, 'r', encoding='utf-8') as f:
    ah_content = f.read()

ah_globals = """
// --- GLOBALS ---
const tablePlaneGeo = new THREE.PlaneGeometry(TABLE_W, TABLE_H);
const tableSurfaceMat = new THREE.MeshPhysicalMaterial({ color: "#051224", metalness: 0.7, roughness: 0.1, emissive: "#020a14", emissiveIntensity: 0.5, clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 2.0 });

const centerLineGeo = new THREE.PlaneGeometry(TABLE_W, 0.05);
const centerLineMat = new THREE.MeshBasicMaterial({ color: "#00ffcc", transparent: true, opacity: 0.4 });

const centerRingGeo = new THREE.RingGeometry(1.5, 1.55, 64);

const wallHGeo = new THREE.BoxGeometry(0.5, 0.6, TABLE_H);
const wallHMat = new THREE.MeshStandardMaterial({ color: "#00aaff", emissive: "#004488", emissiveIntensity: 2, metalness: 0.8, roughness: 0.2 });

const wallWGeo = new THREE.BoxGeometry((TABLE_W - GOAL_W) / 2, 0.6, 0.5);
const wallWTopMat = new THREE.MeshStandardMaterial({ color: "#ff0055", emissive: "#880022", emissiveIntensity: 2, metalness: 0.8, roughness: 0.2 });
const wallWBotMat = new THREE.MeshStandardMaterial({ color: "#00ffcc", emissive: "#008866", emissiveIntensity: 2, metalness: 0.8, roughness: 0.2 });

const paddleBaseGeo = new THREE.CylinderGeometry(PADDLE_R, PADDLE_R * 1.1, 0.6, 64);
const paddleTopGeo = new THREE.SphereGeometry(PADDLE_R * 0.6, 32, 32);
const paddleTopMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.95, roughness: 0.05, clearcoat: 1.0, envMapIntensity: 3.0 });
const paddleBaseMatPlayer = new THREE.MeshPhysicalMaterial({ color: "#00ffcc", emissive: "#00ffcc", emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 2.5 });
const paddleBaseMatAI = new THREE.MeshPhysicalMaterial({ color: "#ff0055", emissive: "#ff0055", emissiveIntensity: 0.8, metalness: 0.9, roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 2.5 });
const paddleMats: Record<string, THREE.MeshPhysicalMaterial> = {
  "#00ffcc": paddleBaseMatPlayer,
  "#ff0055": paddleBaseMatAI
};

const puckGeo = new THREE.CylinderGeometry(PUCK_R, PUCK_R, 0.2, 64);
const puckMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 2.5, metalness: 0.8, roughness: 0.05, clearcoat: 1.0, transmission: 0.8, thickness: 0.5, ior: 1.5 });

const pointerPlaneGeo = new THREE.PlaneGeometry(TABLE_W, TABLE_H/2);
const tableBaseMat = new THREE.MeshStandardMaterial({ color: "#0a0a0f", metalness: 0.9, roughness: 0.1 });
// --- END GLOBALS ---

function AirHockeyTable() {
"""

ah_content = ah_content.replace('function AirHockeyTable() {', ah_globals)

# Replace table surface
ah_content = ah_content.replace('<planeGeometry args={[TABLE_W, TABLE_H]} />', '')
ah_content = ah_content.replace('<meshPhysicalMaterial \n          color="#051224" \n          metalness={0.7} \n          roughness={0.1} \n          emissive="#020a14" \n          emissiveIntensity={0.5} \n          clearcoat={1.0} \n          clearcoatRoughness={0.05} \n          envMapIntensity={2.0} \n        />', '')
ah_content = ah_content.replace('<mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>', '<mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} geometry={tablePlaneGeo} material={tableSurfaceMat}>')

# Replace center line
ah_content = ah_content.replace('<planeGeometry args={[TABLE_W, 0.05]} />\n        <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />', '')
ah_content = ah_content.replace('<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>\n      </mesh>', '<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={centerLineGeo} material={centerLineMat} />')

# Replace center ring
ah_content = ah_content.replace('<ringGeometry args={[1.5, 1.55, 64]} />\n        <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />', '')
ah_content = ah_content.replace('<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>\n      </mesh>', '<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} geometry={centerRingGeo} material={centerLineMat} />')

# Physics walls
ah_content = ah_content.replace('<boxGeometry args={[0.5, 0.6, TABLE_H]} />\n          <meshStandardMaterial color="#00aaff" emissive="#004488" emissiveIntensity={2} metalness={0.8} roughness={0.2} />', '')
ah_content = ah_content.replace('<mesh position={[-TABLE_W / 2 - 0.25, 0.3, 0]} receiveShadow castShadow>', '<mesh position={[-TABLE_W / 2 - 0.25, 0.3, 0]} receiveShadow castShadow geometry={wallHGeo} material={wallHMat}>')
ah_content = ah_content.replace('<mesh position={[TABLE_W / 2 + 0.25, 0.3, 0]} receiveShadow castShadow>', '<mesh position={[TABLE_W / 2 + 0.25, 0.3, 0]} receiveShadow castShadow geometry={wallHGeo} material={wallHMat}>')

ah_content = ah_content.replace('<boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />\n          <meshStandardMaterial color="#ff0055" emissive="#880022" emissiveIntensity={2} metalness={0.8} roughness={0.2} />', '')
ah_content = ah_content.replace('<mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow>', '<mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow geometry={wallWGeo} material={wallWTopMat}>')
ah_content = ah_content.replace('<mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow>', '<mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow geometry={wallWGeo} material={wallWTopMat}>')

ah_content = ah_content.replace('<boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />\n          <meshStandardMaterial color="#00ffcc" emissive="#008866" emissiveIntensity={2} metalness={0.8} roughness={0.2} />', '')
ah_content = ah_content.replace('<mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow>', '<mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow geometry={wallWGeo} material={wallWBotMat}>')
ah_content = ah_content.replace('<mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow>', '<mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow geometry={wallWGeo} material={wallWBotMat}>')

# Paddle
ah_content = ah_content.replace('<cylinderGeometry args={[PADDLE_R, PADDLE_R * 1.1, 0.6, 64]} />', '')
ah_content = ah_content.replace('<meshPhysicalMaterial \n            color={color} \n            emissive={color} \n            emissiveIntensity={0.8} \n            metalness={0.9} \n            roughness={0.05}\n            clearcoat={1.0}\n            clearcoatRoughness={0.1}\n            envMapIntensity={2.5}\n          />', '')
ah_content = ah_content.replace('<mesh position={[0, 0.3, 0]} castShadow>', '<mesh position={[0, 0.3, 0]} castShadow geometry={paddleBaseGeo} material={paddleMats[color]}>')

ah_content = ah_content.replace('<sphereGeometry args={[PADDLE_R * 0.6, 32, 32]} />\n          <meshPhysicalMaterial \n            color="#ffffff" \n            metalness={0.95} \n            roughness={0.05} \n            clearcoat={1.0}\n            envMapIntensity={3.0}\n          />', '')
ah_content = ah_content.replace('<mesh position={[0, 0.65, 0]} castShadow>', '<mesh position={[0, 0.65, 0]} castShadow geometry={paddleTopGeo} material={paddleTopMat}>')

# Puck
ah_content = ah_content.replace('<cylinderGeometry args={[PUCK_R, PUCK_R, 0.2, 64]} />\n        <meshPhysicalMaterial \n          color="#ffffff" \n          emissive="#ffffff" \n          emissiveIntensity={2.5} \n          metalness={0.8} \n          roughness={0.05} \n          clearcoat={1.0}\n          transmission={0.8}\n          thickness={0.5}\n          ior={1.5}\n        />', '')
ah_content = ah_content.replace('<mesh castShadow receiveShadow position={[0, 0.1, 0]}>', '<mesh castShadow receiveShadow position={[0, 0.1, 0]} geometry={puckGeo} material={puckMat}>')

# Pointer plane
ah_content = ah_content.replace('<planeGeometry args={[TABLE_W, TABLE_H/2]} />', '')
ah_content = ah_content.replace('<mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.5, TABLE_H/4]} onPointerMove={handlePointerMove} visible={false}>', '<mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.5, TABLE_H/4]} onPointerMove={handlePointerMove} visible={false} geometry={pointerPlaneGeo}>')

# Base RoundedBox material
ah_content = ah_content.replace('<meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.1} />', '')
ah_content = ah_content.replace('<RoundedBox args={[TABLE_W + 1, 0.4, TABLE_H + 1]} radius={0.2} smoothness={4} position={[0, -0.2, 0]}>', '<RoundedBox args={[TABLE_W + 1, 0.4, TABLE_H + 1]} radius={0.2} smoothness={4} position={[0, -0.2, 0]} material={tableBaseMat}>')


# Cleanup empty meshes
ah_content = ah_content.replace('>\n      </mesh>', ' />')

with open(air_hockey_path, 'w', encoding='utf-8') as f:
    f.write(ah_content)


# --- BOWLING ---

with open(bowling_path, 'r', encoding='utf-8') as f:
    bw_content = f.read()

bw_globals = """
// --- GLOBALS ---
const pinBaseGeo = new THREE.CylinderGeometry(0.08, 0.2, 0.8, 16);
const pinBaseMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", metalness: 0.1, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 });
const pinTopGeo = new THREE.SphereGeometry(0.15, 16, 16);
const pinTopMat = pinBaseMat;
const pinRingGeo = new THREE.TorusGeometry(0.12, 0.03, 8, 16);
const pinRingMat = new THREE.MeshPhysicalMaterial({ color: "#e94b4b", emissive: "#7d1111", emissiveIntensity: 0.5, clearcoat: 1.0 });

const laneGeo = new THREE.PlaneGeometry(4, 20);
const laneMat = new THREE.MeshPhysicalMaterial({ color: "#d39a5e", metalness: 0.1, roughness: 0.1, clearcoat: 1.0, clearcoatRoughness: 0.05 });

const gutterGeo = new THREE.BoxGeometry(0.6, 0.2, 20);
const gutterMat = new THREE.MeshPhysicalMaterial({ color: "#111", metalness: 0.5, roughness: 0.6 });

const bumperGeo = new THREE.BoxGeometry(0.2, 0.6, 20);
const bumperMat = new THREE.MeshPhysicalMaterial({ color: "#445", metalness: 0.5, roughness: 0.2, clearcoat: 0.5 });

const backWallGeo = new THREE.BoxGeometry(6, 2, 1);
const backWallMat = new THREE.MeshPhysicalMaterial({ color: "#112", metalness: 0.5, roughness: 0.5 });

const ballGeo = new THREE.SphereGeometry(0.3, 32, 32);
const ballMat = new THREE.MeshPhysicalMaterial({ color: "#17233a", metalness: 0.9, roughness: 0.05, emissive: "#0d1b38", emissiveIntensity: 0.2, clearcoat: 1.0, clearcoatRoughness: 0.05 });
// --- END GLOBALS ---

function Pin({ position, index }: { position: [number, number, number], index: number }) {
"""

bw_content = bw_content.replace('function Pin({ position, index }: { position: [number, number, number], index: number }) {', bw_globals)

# Pin geometries
bw_content = bw_content.replace('<cylinderGeometry args={[0.08, 0.2, 0.8, 16]} />\n          <meshPhysicalMaterial color="#ffffff" metalness={0.1} roughness={0.1} clearcoat={1.0} clearcoatRoughness={0.05} />', '')
bw_content = bw_content.replace('<mesh position={[0, 0.4, 0]} castShadow receiveShadow>', '<mesh position={[0, 0.4, 0]} castShadow receiveShadow geometry={pinBaseGeo} material={pinBaseMat}>')

bw_content = bw_content.replace('<sphereGeometry args={[0.15, 16, 16]} />\n          <meshPhysicalMaterial color="#ffffff" metalness={0.1} roughness={0.1} clearcoat={1.0} clearcoatRoughness={0.05} />', '')
bw_content = bw_content.replace('<mesh position={[0, 0.8, 0]} castShadow receiveShadow>', '<mesh position={[0, 0.8, 0]} castShadow receiveShadow geometry={pinTopGeo} material={pinTopMat}>')

bw_content = bw_content.replace('<torusGeometry args={[0.12, 0.03, 8, 16]} />\n          <meshPhysicalMaterial color="#e94b4b" emissive="#7d1111" emissiveIntensity: 0.5, clearcoat: 1.0} />', '')
bw_content = bw_content.replace('<mesh position={[0, 0.65, 0]}>', '<mesh position={[0, 0.65, 0]} geometry={pinRingGeo} material={pinRingMat}>')

# Fix torus replacement
bw_content = bw_content.replace('<torusGeometry args={[0.12, 0.03, 8, 16]} />\n          <meshPhysicalMaterial color="#e94b4b" emissive="#7d1111" emissiveIntensity={0.5} clearcoat={1.0} />', '')
bw_content = bw_content.replace('<mesh position={[0, 0.65, 0]} geometry={pinRingGeo} material={pinRingMat}>\n        </mesh>', '<mesh position={[0, 0.65, 0]} geometry={pinRingGeo} material={pinRingMat} />')


# Lane
bw_content = bw_content.replace('<planeGeometry args={[4, 20]} />\n          <meshPhysicalMaterial color="#d39a5e" metalness={0.1} roughness={0.1} clearcoat={1.0} clearcoatRoughness={0.05} />', '')
bw_content = bw_content.replace('<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} receiveShadow>', '<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} receiveShadow geometry={laneGeo} material={laneMat}>')

# Gutters
bw_content = bw_content.replace('<boxGeometry args={[0.6, 0.2, 20]} />\n          <meshPhysicalMaterial color="#111" metalness={0.5} roughness={0.6} />', '')
bw_content = bw_content.replace('<mesh position={[-2.3, -0.1, -5]} receiveShadow>', '<mesh position={[-2.3, -0.1, -5]} receiveShadow geometry={gutterGeo} material={gutterMat}>')
bw_content = bw_content.replace('<mesh position={[2.3, -0.1, -5]} receiveShadow>', '<mesh position={[2.3, -0.1, -5]} receiveShadow geometry={gutterGeo} material={gutterMat}>')

# Bumpers
bw_content = bw_content.replace('<boxGeometry args={[0.2, 0.6, 20]} />\n          <meshPhysicalMaterial color="#445" metalness={0.5} roughness={0.2} clearcoat={0.5} />', '')
bw_content = bw_content.replace('<mesh position={[-2.7, 0.2, -5]}>', '<mesh position={[-2.7, 0.2, -5]} geometry={bumperGeo} material={bumperMat}>')
bw_content = bw_content.replace('<mesh position={[2.7, 0.2, -5]}>', '<mesh position={[2.7, 0.2, -5]} geometry={bumperGeo} material={bumperMat}>')

# Back wall
bw_content = bw_content.replace('<boxGeometry args={[6, 2, 1]} />\n          <meshPhysicalMaterial color="#112" metalness={0.5} roughness={0.5} />', '')
bw_content = bw_content.replace('<mesh position={[0, 1, -15.5]}>', '<mesh position={[0, 1, -15.5]} geometry={backWallGeo} material={backWallMat}>')

# Ball
bw_content = bw_content.replace('<sphereGeometry args={[0.3, 32, 32]} />\n        <meshPhysicalMaterial color="#17233a" metalness={0.9} roughness={0.05} emissive="#0d1b38" emissiveIntensity={0.2} clearcoat={1.0} clearcoatRoughness={0.05} />', '')
bw_content = bw_content.replace('<mesh castShadow receiveShadow>', '<mesh castShadow receiveShadow geometry={ballGeo} material={ballMat}>')

# Cleanup empty meshes
bw_content = bw_content.replace('>\n      </mesh>', ' />')
bw_content = bw_content.replace('>\n        </mesh>', ' />')
bw_content = bw_content.replace('>\n          </mesh>', ' />')

with open(bowling_path, 'w', encoding='utf-8') as f:
    f.write(bw_content)

