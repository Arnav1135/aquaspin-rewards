import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/components/games/LimboGame.tsx', 'utf8');

// Import useSafeTimeout
code = code.replace(
  "import { useAuthStore } from '@/features/authStore';", 
  "import { useAuthStore } from '@/features/authStore';\nimport { useSafeTimeout } from '@/hooks/useSafeTimeout';"
);

// Add the hook to component
code = code.replace(
  "export function LimboGame({ onClose }: { onClose: () => void }) {",
  "export function LimboGame({ onClose }: { onClose: () => void }) {\n  const { setSafeTimeout } = useSafeTimeout();"
);

// Replace setTimeout with setSafeTimeout
code = code.replaceAll(
  "setTimeout(",
  "setSafeTimeout("
);

fs.writeFileSync('d:/Web App - Aqua Blue/src/components/games/LimboGame.tsx', code);
console.log('LimboGame patched!');
