const fs = require('fs');

const updateFile = (path) => {
  let code = fs.readFileSync(path, 'utf8');
  if (code.includes('isGameActive')) {
    console.log(`Already updated ${path}`);
    return;
  }

  code = code.replace(
    /const location = useLocation\(\);/,
    `const location = useLocation();\n  const isGameActive = location.pathname.includes('/games/') && location.pathname !== '/games';\n  if (isGameActive) return null;`
  );
  fs.writeFileSync(path, code);
  console.log(`Updated ${path}`);
};

updateFile('src/components/layout/BottomNav.tsx');
updateFile('src/components/layout/Header.tsx');
