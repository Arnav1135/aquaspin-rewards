const fs = require('fs');
const file = 'src/components/AIGameEnginePanel.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix width so it doesn't cover whole screen on mobile
content = content.replace(
  /className="fixed right-0 top-0 bottom-0 w-full sm:w-\[480px\] bg-\[#090b11\]\/95/g,
  'className="fixed right-0 top-0 bottom-0 w-[85vw] max-w-[480px] bg-[#090b11]/95'
);

// 2. Redesign close button at the top
const oldCloseButton = <button onClick={onClose} className="p-1.5 hover:bg-rose-950/50 rounded-lg text-slate-400 hover:text-rose-400 transition-colors">\n          <X size={18} />\n        </button>;
const newCloseButton = <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-rose-500/20 rounded-lg text-slate-300 hover:text-rose-400 border border-transparent hover:border-rose-500/30 transition-all text-xs font-bold">\n          <X size={14} /> Close\n        </button>;
content = content.replace(oldCloseButton, newCloseButton);

fs.writeFileSync(file, content);
