import re
import os

file = r'd:\Web App - Aqua Blue\src\components\games\RouletteGame.tsx'
with open(file, 'r', encoding='utf-8') as f:
    content = f.read()

constants = """
const GEO_BOWL_BASE = new THREE.CylinderGeometry(4.6, 4.8, 0.8, 64, 1, True);
const MAT_BOWL_BASE = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#1a0a05", metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide });
const GEO_BOWL_TRIM = new THREE.TorusGeometry(4.5, 0.1, 16, 64);
const MAT_BOWL_TRIM = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#eab308", metalness: 0.9, roughness: 0.1 });
const GEO_BOWL_SLOPE = new THREE.CylinderGeometry(4.4, 3.2, 0.6, 64, 1, True);
const MAT_BOWL_SLOPE = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#111", metalness: 0.6, roughness: 0.4, side: THREE.DoubleSide });
const GEO_DEFLECTOR = new THREE.OctahedronGeometry(0.08, 0);
const MAT_DEFLECTOR = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#eab308", metalness: 1, roughness: 0.2 });

const GEO_WHEEL_BASE = new THREE.CylinderGeometry(3.2, 3.2, 0.1, 64);
const MAT_WHEEL_BASE = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#0a0a0a", metalness: 0.8, roughness: 0.3 });
const GEO_WHEEL_RING = new THREE.TorusGeometry(2.9, 0.03, 16, 64);
const MAT_WHEEL_RING = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#FFD700", metalness: 1.0, roughness: 0.1 });
const GEO_WHEEL_TURRET = new THREE.CylinderGeometry(1.2, 1.6, 0.4, 32);
const MAT_WHEEL_TURRET = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#111", metalness: 0.8, roughness: 0.2 });
const GEO_WHEEL_TURRET_TOP = new THREE.CylinderGeometry(0.3, 1.2, 0.15, 32);
const MAT_WHEEL_TURRET_TOP = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#d4af37", metalness: 1, roughness: 0.1 });
const GEO_SPINDLE = new THREE.CylinderGeometry(0.15, 0.2, 0.8, 16);
const MAT_SPINDLE = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#d4af37", metalness: 1, roughness: 0.1 });
const GEO_SPINDLE_TOP = new THREE.SphereGeometry(0.25, 32, 32);
const GEO_CROSSBAR = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
const GEO_NUMBER_PLATE = new THREE.BoxGeometry(0.42, 0.02, 0.5);
const GEO_POCKET = new THREE.BoxGeometry(0.33, 0.04, 0.5);
const MAT_POCKET = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#050505", metalness: 0.8, roughness: 0.2 });
const GEO_DIVIDER = new THREE.BoxGeometry(0.02, 0.1, 1.0);
const GEO_BALL = new THREE.SphereGeometry(0.12, 32, 32);
const MAT_BALL = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#ffffff", metalness: 1.0, roughness: 0.0 });
const MAT_NUMBER_PLATE_RED = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#dc2626", metalness: 0.3, roughness: 0.5 });
const MAT_NUMBER_PLATE_GREEN = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#16a34a", metalness: 0.3, roughness: 0.5 });
const MAT_NUMBER_PLATE_BLACK = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, transmission: 0, thickness: 0, color: "#111111", metalness: 0.3, roughness: 0.5 });
""".replace("True", "true")

content = content.replace("type GameState = 'BETTING' | 'SPINNING' | 'SETTLING' | 'PAYOUT';", constants + "\n\ntype GameState = 'BETTING' | 'SPINNING' | 'SETTLING' | 'PAYOUT';")

replacements = [
  (r'<mesh position={\[0, -0.2, 0\]} receiveShadow>\s*<cylinderGeometry args={\[4.6, 4.8, 0.8, 64, 1, true\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, -0.2, 0]} receiveShadow geometry={GEO_BOWL_BASE} material={MAT_BOWL_BASE} />'),
  (r'<mesh position={\[0, 0.22, 0\]} receiveShadow>\s*<torusGeometry args={\[4.5, 0.1, 16, 64\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.22, 0]} receiveShadow geometry={GEO_BOWL_TRIM} material={MAT_BOWL_TRIM} />'),
  (r'<mesh position={\[0, -0.1, 0\]} receiveShadow>\s*<cylinderGeometry args={\[4.4, 3.2, 0.6, 64, 1, true\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, -0.1, 0]} receiveShadow geometry={GEO_BOWL_SLOPE} material={MAT_BOWL_SLOPE} />'),
  (r'<mesh key={i} position={\[x, 0.05, z\]} rotation={\[Math.PI / 2, 0, angle\]} castShadow>\s*<octahedronGeometry args={\[0.08, 0\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh key={i} position={[x, 0.05, z]} rotation={[Math.PI / 2, 0, angle]} castShadow geometry={GEO_DEFLECTOR} material={MAT_DEFLECTOR} />'),

  (r'<mesh position={\[0, 0, 0\]} receiveShadow>\s*<cylinderGeometry args={\[3.2, 3.2, 0.1, 64\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0, 0]} receiveShadow geometry={GEO_WHEEL_BASE} material={MAT_WHEEL_BASE} />'),
  (r'<mesh position={\[0, 0.05, 0\]} receiveShadow>\s*<torusGeometry args={\[2.9, 0.03, 16, 64\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.05, 0]} receiveShadow geometry={GEO_WHEEL_RING} material={MAT_WHEEL_RING} />'),
  (r'<mesh position={\[0, 0.2, 0\]} receiveShadow castShadow>\s*<cylinderGeometry args={\[1.2, 1.6, 0.4, 32\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.2, 0]} receiveShadow castShadow geometry={GEO_WHEEL_TURRET} material={MAT_WHEEL_TURRET} />'),
  (r'<mesh position={\[0, 0.4, 0\]} receiveShadow castShadow>\s*<cylinderGeometry args={\[0.3, 1.2, 0.15, 32\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.4, 0]} receiveShadow castShadow geometry={GEO_WHEEL_TURRET_TOP} material={MAT_WHEEL_TURRET_TOP} />'),
  (r'<mesh position={\[0, 0.8, 0\]} receiveShadow castShadow>\s*<cylinderGeometry args={\[0.15, 0.2, 0.8, 16\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.8, 0]} receiveShadow castShadow geometry={GEO_SPINDLE} material={MAT_SPINDLE} />'),
  (r'<mesh position={\[0, 1.2, 0\]} receiveShadow castShadow>\s*<sphereGeometry args={\[0.25, 32, 32\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 1.2, 0]} receiveShadow castShadow geometry={GEO_SPINDLE_TOP} material={MAT_SPINDLE} />'),
  
  (r'<mesh key={i} position={\[Math.sin\(angle\) \* 0.4, 0.8, Math.cos\(angle\) \* 0.4\]} rotation={\[Math.PI / 2, 0, angle\]} castShadow>\s*<cylinderGeometry args={\[0.04, 0.04, 0.8, 8\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh key={i} position={[Math.sin(angle) * 0.4, 0.8, Math.cos(angle) * 0.4]} rotation={[Math.PI / 2, 0, angle]} castShadow geometry={GEO_CROSSBAR} material={MAT_SPINDLE} />'),
  
  (r'<mesh position={\[0, 0.06, -2.6\]} receiveShadow>\s*<boxGeometry args={\[0.42, 0.02, 0.5\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.06, -2.6]} receiveShadow geometry={GEO_NUMBER_PLATE} material={isRed ? MAT_NUMBER_PLATE_RED : isGreen ? MAT_NUMBER_PLATE_GREEN : MAT_NUMBER_PLATE_BLACK} />'),
  (r'<mesh position={\[0, 0.04, -2.1\]} receiveShadow>\s*<boxGeometry args={\[0.33, 0.04, 0.5\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0, 0.04, -2.1]} receiveShadow geometry={GEO_POCKET} material={MAT_POCKET} />'),
  (r'<mesh position={\[0.22, 0.08, -2.35\]} receiveShadow castShadow rotation={\[0, SECTOR_ANGLE / 2, 0\]}>\s*<boxGeometry args={\[0.02, 0.1, 1.0\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh position={[0.22, 0.08, -2.35]} receiveShadow castShadow rotation={[0, SECTOR_ANGLE / 2, 0]} geometry={GEO_DIVIDER} material={MAT_SPINDLE} />'),
  
  (r'<mesh ref={ballRef} castShadow receiveShadow position={\[0, 10, 0\]}>\s*<sphereGeometry args={\[0.12, 32, 32\]} />\s*<meshPhysicalMaterial [^>]+/>\s*</mesh>', r'<mesh ref={ballRef} castShadow receiveShadow position={[0, 10, 0]} geometry={GEO_BALL} material={MAT_BALL} />'),
]

for pat, repl in replacements:
    content = re.sub(pat, repl, content, flags=re.MULTILINE)

with open(file, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done Roulette")
