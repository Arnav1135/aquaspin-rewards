const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AmbientBackground.tsx', 'utf8');

// Remove the bad early return from inside useEffect
code = code.replace(/if \(isPlayingHeavyGame\) return null;\n\n  return \(\) =>/g, 'return () =>');

// Put it before the render return
code = code.replace(/return \(\n    <div className="fixed/g, 'if (isPlayingHeavyGame) return null;\n\n  return (\n    <div className="fixed');

fs.writeFileSync('src/components/layout/AmbientBackground.tsx', code);
