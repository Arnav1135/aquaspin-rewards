import fs from 'fs';
import path from 'path';

const file = 'd:/Web App - Aqua Blue/src/pages/Profile.tsx';
let code = fs.readFileSync(file, 'utf8');

// Insert import
if (!code.includes('import { Achievements }')) {
  code = code.replace(
    'import { CashoutModal } from \'./CashoutModal\';',
    'import { CashoutModal } from \'./CashoutModal\';\nimport { Achievements } from \'@/components/ui/Achievements\';'
  );
}

// Insert Component
if (!code.includes('<Achievements')) {
  code = code.replace(
    '{/* -- Sign-in History -- */}',
    '<Achievements stats={gameStats} />\n\n        {/* -- Sign-in History -- */}'
  );
}
// Handle weird encoding in comment if any
if (!code.includes('<Achievements')) {
  code = code.replace(
    '{/* ── Sign-in History ── */}',
    '<Achievements stats={gameStats} />\n\n        {/* -- Sign-in History -- */}'
  );
}

fs.writeFileSync(file, code);
console.log('Injected');
