const fs = require('fs');

function fixHooks(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Extract the early return block
  const isGameActiveBlockRegex = /const location = useLocation\(\);\n\s*const isGameActive = location\.pathname\.includes\('\/games\/'\) && location\.pathname !== '\/games';\n\s*if \(isGameActive\) return null;/;
  
  if (content.match(isGameActiveBlockRegex)) {
    // Remove it from current position
    content = content.replace(isGameActiveBlockRegex, 'const location = useLocation();\n  const isGameActive = location.pathname.includes(\'/games/\') && location.pathname !== \'/games\';');
    
    // Find the first `return (` or `return <` and insert the early return right before it
    content = content.replace(/(return \s*[\(<])/, 'if (isGameActive) return null;\n\n  $1');
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed hooks in ${filePath}`);
  }
}

fixHooks('src/components/layout/BottomNav.tsx');
fixHooks('src/components/layout/Header.tsx');

function fixAmbientHooks() {
  let content = fs.readFileSync('src/components/layout/AmbientBackground.tsx', 'utf8');
  
  const isGameActiveBlockRegex = /const location = useLocation\(\);\n\s*const isPlayingHeavyGame = location\.pathname\.includes\('\/games\/carrom'\) \|\| location\.pathname\.includes\('\/games\/candy-crunch'\);\n\s*if \(isPlayingHeavyGame\) return null;/;
  
  if (content.match(isGameActiveBlockRegex)) {
    content = content.replace(isGameActiveBlockRegex, 'const location = useLocation();\n  const isPlayingHeavyGame = location.pathname.includes(\'/games/carrom\') || location.pathname.includes(\'/games/candy-crunch\');');
    content = content.replace(/(return \s*\()/, 'if (isPlayingHeavyGame) return null;\n\n  $1');
    fs.writeFileSync('src/components/layout/AmbientBackground.tsx', content);
    console.log('Fixed hooks in AmbientBackground');
  }
}

fixAmbientHooks();
