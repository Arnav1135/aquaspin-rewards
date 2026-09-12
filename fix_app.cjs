const fs = require('fs');

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Replace static imports with lazy imports for heavy games
appContent = appContent.replace(
  /import CandyCrunchApp from '@\/games\/candy-crunch\/CandyCrunchApp';\nimport CarromApp from '@\/games\/carrom\/CarromApp';/,
  `import { lazy, Suspense } from 'react';\n\nconst CandyCrunchApp = lazy(() => import('@/games/candy-crunch/CandyCrunchApp'));\nconst CarromApp = lazy(() => import('@/games/carrom/CarromApp'));\n\nfunction GameFallback() {\n  return (\n    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--c-navy)] text-white">\n      <div className="w-12 h-12 rounded-full border-4 border-white/20 border-t-white animate-spin mb-4" />\n      <p className="text-white/60 text-sm font-medium animate-pulse">Initializing Engine...</p>\n    </div>\n  );\n}`
);

// Wrap the route components in Suspense
appContent = appContent.replace(
  /<Route path="\/games\/candy-crunch" element={<ProtectedRoute><CandyCrunchApp \/><\/ProtectedRoute>} \/>/,
  `<Route path="/games/candy-crunch" element={<ProtectedRoute><Suspense fallback={<GameFallback />}><CandyCrunchApp /></Suspense></ProtectedRoute>} />`
);

appContent = appContent.replace(
  /<Route path="\/games\/carrom" element={<ProtectedRoute><CarromApp \/><\/ProtectedRoute>} \/>/,
  `<Route path="/games/carrom" element={<ProtectedRoute><Suspense fallback={<GameFallback />}><CarromApp /></Suspense></ProtectedRoute>} />`
);

fs.writeFileSync('src/App.tsx', appContent);
console.log('App.tsx updated for code splitting!');
