const fs = require('fs');
const path = require('path');

const gamesDir = "d:/Web App - Aqua Blue/src/components/games";
const minigamesFile = "d:/Web App - Aqua Blue/src/pages/MiniGames.tsx";

function getAllFiles(dir, fileList = []) {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        getAllFiles(filePath, fileList);
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        fileList.push(filePath);
      }
    });
  }
  return fileList;
}

function processFile(filepath) {
  const original = fs.readFileSync(filepath, 'utf8');
  let content = original;

  // 4. Eliminate ANY empty onClose
  content = content.replace(/onClose=\{\(\)\s*=>\s*\{\s*\}\}/g, 'onClose={onClose}');

  // 5. Cap renderer devicePixelRatio
  content = content.replace(/\.setPixelRatio\(.*?devicePixelRatio.*?\)/g, '.setPixelRatio(Math.min(window.devicePixelRatio, 2))');
  
  if (content.includes('<Canvas') && !content.includes('dpr=')) {
    content = content.replace(/<Canvas/g, "<Canvas dpr={[1, typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1]}");
  }

  // 2. Memory leaks
  let needsTimers = false;
  
  const replacements = [
    [/\bsetInterval\(/g, 'gameSetInterval('],
    [/\bsetTimeout\(/g, 'gameSetTimeout('],
    [/\brequestAnimationFrame\(/g, 'gameRequestAnimationFrame('],
    [/\bwindow\.addEventListener\(/g, 'gameAddEventListener(window, '],
    [/\bdocument\.addEventListener\(/g, 'gameAddEventListener(document, '],
    [/\bthis\.element\.addEventListener\(/g, 'gameAddEventListener(this.element, '],
    [/\bthis\.container\.addEventListener\(/g, 'gameAddEventListener(this.container, '],
    [/\bcanvas\.addEventListener\(/g, 'gameAddEventListener(canvas, '],
    [/\bthis\.renderer\.domElement\.addEventListener\(/g, 'gameAddEventListener(this.renderer.domElement, ']
  ];

  for (const [regex, replacement] of replacements) {
    if (regex.test(content)) {
      content = content.replace(regex, replacement);
      needsTimers = true;
    }
  }

  if (needsTimers) {
    const importStmt = "import { gameSetInterval, gameSetTimeout, gameRequestAnimationFrame, gameAddEventListener } from '@/lib/gameTimers';\n";
    if (!content.includes('gameSetInterval')) {
      // Just inject after the first import or at top
      const match = content.match(/^(?:import .*\n)+/m);
      if (match) {
        content = content.slice(0, match.index + match[0].length) + importStmt + content.slice(match.index + match[0].length);
      } else {
        content = importStmt + content;
      }
    }
  }

  if (content !== original) {
    fs.writeFileSync(filepath, content, 'utf8');
    return true;
  }
  return false;
}

let count = 0;
const files = getAllFiles(gamesDir);
files.push(minigamesFile);

files.forEach(f => {
  if (f.includes('gameTimers.ts') || f.includes('fix_memory.js')) return;
  try {
    if (processFile(f)) {
      count++;
      console.log(`Fixed ${f}`);
    }
  } catch (e) {
    console.error(`Error in ${f}:`, e);
  }
});

console.log(`Modified ${count} files.`);
