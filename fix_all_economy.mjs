import fs from 'fs';
import path from 'path';

const gamesDir = 'd:/Web App - Aqua Blue/src/components/games';
const files = fs.readdirSync(gamesDir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  const filePath = path.join(gamesDir, file);
  let code = fs.readFileSync(filePath, 'utf8');
  
  if (code.includes('supabase.from(\'users\')')) {
    console.log('Patching: ' + file);
    // Find lines with supabase.from('users')
    code = code.replace(/await \(supabase\.from\('users'\) as any\)\.update\({[^}]+}\)\.eq\('[^']+', [^)]+\);/g, '// REMOVED INSECURE CLIENT UPDATE');
    code = code.replace(/\(supabase\.from\('users'\) as any\)\.update\({[^}]+}\)\.eq\('[^']+', [^)]+\);/g, '// REMOVED INSECURE CLIENT UPDATE');
    
    fs.writeFileSync(filePath, code);
  }
}
console.log('Done sweeping remaining games.');
