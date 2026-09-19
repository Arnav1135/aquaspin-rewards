const fs = require('fs');
let data = fs.readFileSync('src/pages/MiniGames.tsx', 'utf8');

data = data.replace(
  'import { useEffect, useRef, useState, lazy, Suspense } from "react";',
  'import { useEffect, useRef, useState, lazy, Suspense } from "react";\nimport { useSearchParams } from "react-router-dom";'
);

data = data.replace(
  'export function MiniGames() {\n  const [activeGame, setActiveGame] = useState<string | null>(null);',
  'export function MiniGames() {\n  const [searchParams, setSearchParams] = useSearchParams();\n  const activeGame = searchParams.get("game") || null;\n  const setActiveGame = (key: string | null) => {\n    if (key) setSearchParams({game: key});\n    else setSearchParams({});\n  };'
);

fs.writeFileSync('src/pages/MiniGames.tsx', data);
console.log('Fixed MiniGames.tsx');
