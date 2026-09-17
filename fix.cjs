const fs = require('fs');
const file = 'src/components/games/RouletteGame.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('Environment')) {
  content = content.replace(
    /import \{ Text \} from '@react-three\/drei';/,
    "import { Text, Environment, ContactShadows } from '@react-three/drei';"
  );
}

content = content.replace(/color: "#1a0a05"/g, 'color: "#f8fafc"');
content = content.replace(/color: "#111"/g, 'color: "#e2e8f0"');
content = content.replace(/color: "#0a0a0a"/g, 'color: "#ffffff"');
content = content.replace(/color: "#050505"/g, 'color: "#cbd5e1"');
content = content.replace(/color: "#111111"/g, 'color: "#1e293b"');
content = content.replace(/color="white"/g, 'color="#1e293b"');

content = content.replace(/bg-navy-950\/90/g, 'bg-slate-200/90');
content = content.replace(/bg-navy-900/g, 'bg-white');
content = content.replace(/bg-navy-950/g, 'bg-slate-50');
content = content.replace(/border-navy-600/g, 'border-slate-300');
content = content.replace(/text-white/g, 'text-slate-900');
content = content.replace(/text-slate-400/g, 'text-slate-500');

const lights = "<ambientLight intensity={0.7} />\n  <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />\n  <Environment preset=\"city\" />\n  <ContactShadows position={[0, -0.4, 0]} opacity={0.4} scale={20} blur={2} far={4} />";
content = content.replace(/<QualityManager>/, lights + '\n  <QualityManager>');

content = content.replace(/text-slate-900\/90/g, 'text-slate-800');
content = content.replace(/text-slate-900\/80/g, 'text-slate-700');
content = content.replace(/text-emerald-400/g, 'text-emerald-600');
content = content.replace(/text-yellow-400/g, 'text-amber-600');
content = content.replace(/bg-navy-800\/50/g, 'bg-slate-100');
content = content.replace(/bg-navy-800/g, 'bg-slate-100');
content = content.replace(/border-navy-500/g, 'border-slate-300');
content = content.replace(/hover:bg-navy-700/g, 'hover:bg-slate-200');

fs.writeFileSync(file, content);
