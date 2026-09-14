import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', 'utf8');

// The file had:
// import * as THREE from 'three';
// and I added another one.
code = code.replace("import * as THREE from 'three';\\n\\nconst GEO_CYLINDER", "\\nconst GEO_CYLINDER");

fs.writeFileSync('d:/Web App - Aqua Blue/src/pages/WheelGame.tsx', code);
console.log('WheelGame import fixed!');
