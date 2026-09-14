import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', 'utf8');

// replace the first occurrence of the duplicate block
code = code.replace("import { Canvas } from '@react-three/fiber';\nimport * as THREE from 'three';", "import { Canvas } from '@react-three/fiber';");

fs.writeFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', code);
console.log('Duplicate import removed!');
