import fs from 'fs';

const files = [
  'd:/Web App - Aqua Blue/src/components/games/CoinFlipGame.tsx',
  'd:/Web App - Aqua Blue/src/components/games/DragonTigerGame.tsx',
  'd:/Web App - Aqua Blue/src/components/games/LimboGame.tsx'
];

for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');

  // Import useSafeTimeout
  code = code.replace(
    "import { useAuthStore } from '@/features/authStore';", 
    "import { useAuthStore } from '@/features/authStore';\nimport { useSafeTimeout } from '@/hooks/useSafeTimeout';"
  );

  // Add the hook inside the component
  code = code.replace(
    /export function ([A-Za-z]+)\((.*?)\) \{/,
    "export function \(\) {\n  const { setSafeTimeout } = useSafeTimeout();"
  );

  // Replace all setTimeout with setSafeTimeout
  code = code.replaceAll(
    "setTimeout(",
    "setSafeTimeout("
  );

  fs.writeFileSync(file, code);
  console.log(file + ' patched!');
}
