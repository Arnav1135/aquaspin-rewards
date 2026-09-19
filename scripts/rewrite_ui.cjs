const fs = require('fs');
const path = require('path');

const uiPath = path.join(__dirname, '../src/components/games/Chess3D/components/UIOverlay.tsx');
let content = fs.readFileSync(uiPath, 'utf-8');

// Modernize UI layout
content = content.replace(
  /bg-slate-900\/60/g,
  'bg-slate-900/40 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border-white/20'
);
content = content.replace(
  /bg-slate-800\/80/g,
  'bg-white/10 backdrop-blur-xl border-white/20 shadow-lg'
);
content = content.replace(
  /from-black\/90 to-transparent/g,
  'from-black/80 via-black/40 to-transparent backdrop-blur-sm'
);
content = content.replace(
  /bg-slate-900\/95/g,
  'bg-slate-900/80 backdrop-blur-2xl border-white/10'
);
content = content.replace(
  /rounded-2xl/g,
  'rounded-3xl'
);
content = content.replace(
  /border-slate-700/g,
  'border-white/10'
);

// Add environment selector
content = content.replace(
  /\{\/\* Ambient Mode Toggle \*\/\}/,
  `
    {/* Environment Selector */}
    <div className="relative group">
      <button
        className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/10 backdrop-blur-xl px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-white/20 transition"
        title="Select Environment"
      >
        <Moon className="h-3 w-3 text-cyan-400" />
        <span className="whitespace-nowrap capitalize">{ambientMode}</span>
      </button>
      <div className="absolute top-full right-0 mt-2 hidden group-hover:flex flex-col bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 gap-1 z-50">
        {['palace', 'castle', 'tournament', 'temple', 'cyber', 'sky'].map(env => (
          <button
            key={env}
            onClick={() => onSetAmbientMode(env as any)}
            className="text-left px-3 py-1.5 text-xs text-white hover:bg-white/20 rounded-lg transition capitalize"
          >
            {env}
          </button>
        ))}
      </div>
    </div>
  `
);

fs.writeFileSync(uiPath, content);
console.log('UIOverlay updated for Luxury UI');
