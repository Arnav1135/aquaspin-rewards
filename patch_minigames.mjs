import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/pages/MiniGames.tsx', 'utf8');

if (!code.includes('ErrorBoundary')) {
  code = code.replace(
    "import { motion, AnimatePresence } from \"framer-motion\";",
    "import { motion, AnimatePresence } from \"framer-motion\";\nimport { ErrorBoundary } from \"@/components/ui/ErrorBoundary\";"
  );
}

const suspOld = "<Suspense fallback={<GameSkeleton />}>\n                  {renderGame(activeGame)}\n                </Suspense>";

const suspNew = "<ErrorBoundary name={'GameEngine-' + activeGame}>\n                  <Suspense fallback={<GameSkeleton />}>\n                    {renderGame(activeGame)}\n                  </Suspense>\n                </ErrorBoundary>";

code = code.replace(suspOld, suspNew);

fs.writeFileSync('d:/Web App - Aqua Blue/src/pages/MiniGames.tsx', code);
console.log('MiniGames.tsx patched');
