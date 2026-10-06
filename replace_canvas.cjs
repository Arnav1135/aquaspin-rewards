const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changedCount = 0;

for (const file of files) {
    if (file.includes('ResponsiveCanvas.tsx')) continue;
    let content = fs.readFileSync(file, 'utf8');
    
    const regex = /import\s+\{([^}]*?)\bCanvas\b([^}]*?)\}\s+from\s+['"]@react-three\/fiber['"]/g;
    
    if (regex.test(content)) {
        content = content.replace(regex, (match, p1, p2) => {
            const others = (p1 + p2).split(',').map(s => s.trim()).filter(Boolean);
            let replacement = `import { ResponsiveCanvas as Canvas } from '@/components/ui/ResponsiveCanvas';`;
            if (others.length > 0) {
                replacement += `\nimport { ${others.join(', ')} } from '@react-three/fiber';`;
            }
            return replacement;
        });
        fs.writeFileSync(file, content, 'utf8');
        console.log('Updated: ' + file);
        changedCount++;
    }
}
console.log('Done! Updated ' + changedCount + ' files.');
