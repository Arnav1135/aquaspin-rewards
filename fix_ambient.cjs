const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AmbientBackground.tsx', 'utf8');

if (!code.includes('useLocation')) {
  // Import useLocation
  code = code.replace(
    "import { useEffect, useRef } from 'react';",
    "import { useEffect, useRef } from 'react';\nimport { useLocation } from 'react-router-dom';"
  );

  // Add route check to disable background on heavy games
  code = code.replace(
    "const canvasRef = useRef<HTMLCanvasElement>(null);",
    "const canvasRef = useRef<HTMLCanvasElement>(null);\n  const location = useLocation();\n  const isPlayingHeavyGame = location.pathname.includes('/games/carrom') || location.pathname.includes('/games/candy-crunch');\n\n  if (isPlayingHeavyGame) return null;"
  );

  fs.writeFileSync('src/components/layout/AmbientBackground.tsx', code);
  console.log('Fixed ambient background!');
} else {
  console.log('Already fixed!');
}
