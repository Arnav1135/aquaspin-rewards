import fs from 'fs';

let code = fs.readFileSync('d:/Web App - Aqua Blue/src/App.tsx', 'utf8');

if (!code.includes('import { ErrorBoundary }')) {
  code = code.replace(
    "import { ViewTransitionWrapper } from '@/components/layout/ViewTransitionWrapper';",
    "import { ViewTransitionWrapper } from '@/components/layout/ViewTransitionWrapper';\nimport { ErrorBoundary } from '@/components/ui/ErrorBoundary';"
  );
}

const appRoutesOld = "<ViewTransitionWrapper>\n            <AppRoutes />\n          </ViewTransitionWrapper>";
const appRoutesNew = "<ViewTransitionWrapper>\n            <ErrorBoundary name=\"RootApp\">\n              <AppRoutes />\n            </ErrorBoundary>\n          </ViewTransitionWrapper>";

code = code.replace(appRoutesOld, appRoutesNew);

fs.writeFileSync('d:/Web App - Aqua Blue/src/App.tsx', code);
console.log('App.tsx patched');
