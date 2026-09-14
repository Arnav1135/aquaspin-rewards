import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', 'utf8');

const hoistCode = "\nconst GEO_CYLINDER = new THREE.CylinderGeometry(2.8, 2.8, 0.4, 64);\nconst GEO_CIRCLE = new THREE.CircleGeometry(2.8, 64);\nconst GEO_TORUS = new THREE.TorusGeometry(2.8, 0.08, 16, 100);\nconst GEO_CONE = new THREE.ConeGeometry(0.3, 0.6, 4);\n\nconst MAT_BASE = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 0.2, roughness: 0.8 });\n// wheel face material is handled below\n";

code = code.replace("import { Canvas } from '@react-three/fiber';", "import { Canvas } from '@react-three/fiber';\nimport * as THREE from 'three';" + hoistCode);

code = code.replace(/<mesh rotation=\{\[Math\.PI \/ 2, 0, 0\]\} receiveShadow castShadow>[\s\S]*?<cylinderGeometry args=\{\[2\.8, 2\.8, 0\.4, 64\]\} \/>[\s\S]*?<meshStandardMaterial[\s\S]*?color="#ffffff"[\s\S]*?metalness=\{0\.2\}[\s\S]*?roughness=\{0\.8\}[\s\S]*?\/>[\s\S]*?<\/mesh>/g, 
  '<mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow geometry={GEO_CYLINDER} material={MAT_BASE} />'
);

code = code.replace(/<mesh position=\{\[0, 0, 0\.21\]\} receiveShadow>[\s\S]*?<circleGeometry args=\{\[2\.8, 64\]\} \/>[\s\S]*?<meshStandardMaterial[\s\S]*?map=\{wheelTexture\}[\s\S]*?metalness=\{0\.3\}[\s\S]*?roughness=\{0\.4\}[\s\S]*?emissive=\{theme\.borderColor\}[\s\S]*?emissiveIntensity=\{0\.2\}[\s\S]*?\/>[\s\S]*?<\/mesh>/g,
  '<mesh position={[0, 0, 0.21]} receiveShadow geometry={GEO_CIRCLE}>\n              <meshStandardMaterial map={wheelTexture} metalness={0.3} roughness={0.4} emissive={theme.borderColor} emissiveIntensity={0.2} />\n            </mesh>'
);

code = code.replace(/<mesh position=\{\[0, 0, 0\.2\]\} receiveShadow castShadow>[\s\S]*?<torusGeometry args=\{\[2\.8, 0\.08, 16, 100\]\} \/>[\s\S]*?<meshStandardMaterial color=\{theme\.borderColor\} metalness=\{0\.8\} roughness=\{0\.2\} \/>[\s\S]*?<\/mesh>/g,
  '<mesh position={[0, 0, 0.2]} receiveShadow castShadow geometry={GEO_TORUS}>\n              <meshStandardMaterial color={theme.borderColor} metalness={0.8} roughness={0.2} />\n            </mesh>'
);

code = code.replace(/<mesh position=\{\[0, 3, 0\.3\]\} rotation=\{\[Math\.PI \/ 2, 0, 0\]\} receiveShadow castShadow>[\s\S]*?<coneGeometry args=\{\[0\.3, 0\.6, 4\]\} \/>[\s\S]*?<meshStandardMaterial color=\{theme\.pointerColor\} metalness=\{0\.9\} roughness=\{0\.1\} \/>[\s\S]*?<\/mesh>/g,
  '<mesh position={[0, 3, 0.3]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow geometry={GEO_CONE}>\n              <meshStandardMaterial color={theme.pointerColor} metalness={0.9} roughness={0.1} />\n            </mesh>'
);

fs.writeFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', code);
console.log('WheelGame patched!');
