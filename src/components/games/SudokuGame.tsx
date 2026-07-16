// src/components/games/SudokuGame.tsx — Premium Sudoku
import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }
type CellState = { value: number; given: boolean; notes: Set<number>; error: boolean };
type Phase = 'idle' | 'playing' | 'won';

// --- Sudoku generator ---
function emptyGrid(): number[][] { return Array.from({length:9},()=>Array(9).fill(0)); }
function isValid(grid: number[][], r: number, c: number, num: number): boolean {
  for(let i=0;i<9;i++) { if(grid[r][i]===num||grid[i][c]===num) return false; }
  const br=Math.floor(r/3)*3, bc=Math.floor(c/3)*3;
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) { if(grid[br+i][bc+j]===num) return false; }
  return true;
}
function solve(grid: number[][]): boolean {
  for(let r=0;r<9;r++) for(let c=0;c<9;c++) {
    if(grid[r][c]===0) {
      const nums=[1,2,3,4,5,6,7,8,9].sort(()=>Math.random()-0.5);
      for(const n of nums) { if(isValid(grid,r,c,n)) { grid[r][c]=n; if(solve(grid)) return true; grid[r][c]=0; } }
      return false;
    }
  }
  return true;
}
function generatePuzzle(holes: number): { puzzle: number[][]; solution: number[][] } {
  const solution = emptyGrid();
  solve(solution);
  const puzzle = solution.map(r=>[...r]);
  let removed = 0;
  while(removed < holes) {
    const r=Math.floor(Math.random()*9), c=Math.floor(Math.random()*9);
    if(puzzle[r][c]!==0) { puzzle[r][c]=0; removed++; }
  }
  return { puzzle, solution };
}

export function SudokuGame({ onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [grid, setGrid] = useState<CellState[][]>([]);
  const [solution, setSolution] = useState<number[][]>([]);
  const [selected, setSelected] = useState<[number,number]|null>(null);
  const [notesMode, setNotesMode] = useState(false);
  const [difficulty, setDifficulty] = useState<'Easy'|'Medium'|'Hard'>('Medium');
  const [mistakes, setMistakes] = useState(0);
  const [timer, setTimer] = useState(0);
  const [best, setBest] = useState(() => parseInt(localStorage.getItem('sdk-best')||'0'));

  const HOLES = { Easy: 35, Medium: 45, Hard: 55 };

  useEffect(() => {
    if (phase !== 'playing') return;
    const t = setInterval(() => setTimer(s => s+1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const startGame = useCallback(() => {
    const { puzzle, solution: sol } = generatePuzzle(HOLES[difficulty]);
    setSolution(sol);
    setGrid(puzzle.map(row => row.map(v => ({ value:v, given:v!==0, notes:new Set<number>(), error:false }))));
    setSelected(null); setMistakes(0); setTimer(0); setNotesMode(false);
    setPhase('playing');
    playTone(500, 0.05, 'sine', 0.1);
  }, [difficulty]);

  const handleCell = useCallback((r: number, c: number) => {
    if (grid[r]?.[c]?.given) { setSelected([r,c]); return; }
    setSelected([r,c]);
    playTone(400, 0.02, 'sine', 0.05);
  }, [grid]);

  const handleNumber = useCallback((num: number) => {
    if (!selected) return;
    const [r,c] = selected;
    if (grid[r]?.[c]?.given) return;
    setGrid(prev => {
      const ng = prev.map(row=>row.map(cell=>({...cell,notes:new Set(cell.notes)})));
      if (notesMode) {
        const notes = ng[r][c].notes;
        if (notes.has(num)) notes.delete(num); else notes.add(num);
      } else {
        if (num === solution[r][c]) {
          ng[r][c].value = num; ng[r][c].error = false; ng[r][c].notes.clear();
          playTone(600, 0.04, 'sine', 0.08); vibrate(10);
          // Clear notes in same row/col/box
          for(let i=0;i<9;i++){ng[r][i].notes.delete(num);ng[i][c].notes.delete(num);}
          const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;
          for(let i=0;i<3;i++)for(let j=0;j<3;j++){ng[br+i][bc+j].notes.delete(num);}
          // Check win
          if(ng.flat().every(cell=>cell.value!==0&&!cell.error)){
            setPhase('won');
            const elapsed = timer;
            const nb = best===0||elapsed<best?elapsed:best;
            setBest(nb); localStorage.setItem('sdk-best',String(nb));
            toast.success('🎉 Puzzle solved!'); playTone(800,0.1,'sine',0.2); vibrate(100);
          }
        } else {
          ng[r][c].error = true; ng[r][c].value = num;
          setMistakes(m=>m+1); playTone(200,0.08,'sawtooth',0.12); vibrate(40);
          setTimeout(()=>setGrid(g=>g.map((row,ri)=>row.map((cell,ci)=>ri===r&&ci===c?{...cell,error:false,value:0}:cell))),800);
        }
      }
      return ng;
    });
  }, [selected, notesMode, solution, grid, best, timer]);

  const handleHint = useCallback(() => {
    if (!selected) { toast('Select a cell first!'); return; }
    const [r,c] = selected;
    if (grid[r]?.[c]?.given || grid[r]?.[c]?.value!==0) return;
    setGrid(prev => {
      const ng = prev.map(row=>row.map(cell=>({...cell,notes:new Set(cell.notes)})));
      ng[r][c].value = solution[r][c]; ng[r][c].error = false;
      return ng;
    });
    playTone(700, 0.05, 'sine', 0.08);
    toast.success('💡 Hint used!');
  }, [selected, grid, solution]);

  const formatTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const isHighlighted = (r: number, c: number) => {
    if (!selected) return false;
    const [sr,sc] = selected;
    return sr===r || sc===c || (Math.floor(sr/3)===Math.floor(r/3) && Math.floor(sc/3)===Math.floor(c/3));
  };
  const isSelected = (r:number,c:number) => selected?.[0]===r && selected?.[1]===c;
  const sameValue = (r:number,c:number) => selected && grid[selected[0]]?.[selected[1]]?.value>0 && grid[r]?.[c]?.value===grid[selected[0]]?.[selected[1]]?.value;

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen" style={{background:'linear-gradient(135deg,#0a1628 0%,#7b8bc1 100%)'}}>
      {phase !== 'idle' && (
        <>
          {/* Stats bar */}
          <div className="flex gap-4 w-full max-w-sm justify-between">
            <span className="text-white font-mono">{formatTime(timer)}</span>
            <span className="text-red-400">❌ {mistakes}</span>
            <span className="text-yellow-400 text-sm">{difficulty}</span>
            {best > 0 && <span className="text-white/50 font-mono text-sm">Best: {formatTime(best)}</span>}
          </div>

          {/* Board */}
          <div className="rounded-2xl overflow-hidden select-none"
            style={{ border:'2px solid rgba(74,144,217,0.35)', background:'rgba(255,255,255,0.04)' }}>
            {grid.map((row,r)=>(
              <div key={r} className="flex" style={{borderBottom:r%3===2&&r!==8?'2px solid rgba(74,144,217,0.4)':'1px solid rgba(255,255,255,0.08)'}}>
                {row.map((cell,c)=>{
                  const sel=isSelected(r,c), hl=isHighlighted(r,c), sv=sameValue(r,c);
                  let bg='transparent';
                  if(sel) bg='rgba(74,144,217,0.4)';
                  else if(sv) bg='rgba(74,144,217,0.18)';
                  else if(hl) bg='rgba(255,255,255,0.05)';
                  return (
                    <div key={c} onClick={()=>handleCell(r,c)}
                      className="flex items-center justify-center cursor-pointer transition-colors relative"
                      style={{
                        width:35,height:35,background:bg,
                        borderRight:c%3===2&&c!==8?'2px solid rgba(74,144,217,0.4)':'1px solid rgba(255,255,255,0.08)',
                        color: cell.error?'#7b8bc1':cell.given?'#c2e7fa':'#fff',
                        fontWeight: cell.given?700:500, fontSize: cell.value?'16px':'9px',
                      }}>
                      {cell.value > 0 ? (
                        <motion.span animate={cell.error?{x:[-3,3,-3,0]}:{}} transition={{duration:0.3}}>
                          {cell.value}
                        </motion.span>
                      ) : cell.notes.size > 0 ? (
                        <div className="grid grid-cols-3 gap-0 w-full h-full p-0.5">
                          {[1,2,3,4,5,6,7,8,9].map(n=>(
                            <span key={n} style={{fontSize:'7px',color:cell.notes.has(n)?'#66bdf2':'transparent',lineHeight:'11px',textAlign:'center'}}>{n}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Number pad */}
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7,8,9].map(n=>(
              <motion.button key={n} onClick={()=>handleNumber(n)}
                whileTap={{scale:0.92}}
                className="w-9 h-9 rounded-xl font-bold text-white transition-all"
                style={{background:notesMode?'rgba(74,144,217,0.25)':'rgba(255,255,255,0.1)',border:`1.5px solid rgba(255,255,255,${notesMode?'0.25':'0.15'})`,fontSize:'16px'}}>
                {n}
              </motion.button>
            ))}
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            <button onClick={()=>setNotesMode(!notesMode)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{background:notesMode?'rgba(74,144,217,0.4)':'rgba(255,255,255,0.08)',color:notesMode?'#66bdf2':'#aaa',border:`1px solid ${notesMode?'#66bdf2':'rgba(255,255,255,0.1)'}`}}>
              ✏️ Notes {notesMode?'ON':'OFF'}
            </button>
            <button onClick={handleHint}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{background:'rgba(255,215,0,0.15)',color:'#FFD700',border:'1px solid rgba(255,215,0,0.3)'}}>
              💡 Hint
            </button>
            <button onClick={startGame}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
              style={{background:'rgba(255,255,255,0.08)',color:'#aaa',border:'1px solid rgba(255,255,255,0.1)'}}>
              🔄 New
            </button>
          </div>
        </>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col items-center gap-5 mt-8">
          <div className="text-5xl">🔢</div>
          <h2 className="text-white font-bold text-3xl">Sudoku</h2>
          <p className="text-white/60 text-sm text-center max-w-xs">Fill the 9×9 grid so every row, column and 3×3 box contains 1-9.</p>
          <div className="flex gap-2">
            {(['Easy','Medium','Hard'] as const).map(d=>(
              <button key={d} onClick={()=>setDifficulty(d)}
                className="px-4 py-2 rounded-xl text-sm font-semibold"
                style={{background:difficulty===d?'#66bdf2':'rgba(255,255,255,0.08)',color:'#fff',border:difficulty===d?'none':'1px solid rgba(255,255,255,0.15)'}}>
                {d}
              </button>
            ))}
          </div>
          <Button variant="primary" onClick={startGame} className="px-10 py-3 text-lg">🎮 Start</Button>
        </div>
      )}

      <AnimatePresence>
        {phase === 'won' && (
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-center">
            <div className="text-4xl">🎉</div>
            <p className="text-white font-bold text-xl">Solved in {formatTime(timer)}!</p>
            {timer === best && <p className="text-yellow-400 text-sm">New Best! 🏆</p>}
            <Button variant="primary" onClick={startGame} className="mt-3">▶ Play Again</Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Button variant="ghost" size="sm" onClick={onClose} className="mt-auto">Exit</Button>
    </div>
  );
}
