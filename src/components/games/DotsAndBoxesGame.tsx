// src/components/games/DotsAndBoxesGame.tsx — Premium Dots and Boxes
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

const GRID = 5; // 5x5 dots = 4x4 boxes
const PLAYER_COLOR = '#66bdf2';
const AI_COLOR = '#7b8bc1';

type LineKey = string;
function hKey(r: number, c: number): LineKey { return `h${r}_${c}`; }
function vKey(r: number, c: number): LineKey { return `v${r}_${c}`; }



function checkBox(lines: Set<LineKey>, r: number, c: number): boolean {
  return lines.has(hKey(r,c)) && lines.has(hKey(r+1,c)) && lines.has(vKey(r,c)) && lines.has(vKey(r,c+1));
}

function getNewBoxes(lines: Set<LineKey>, key: LineKey): number[][] {
  const newLines = new Set(lines); newLines.add(key);
  const boxes: number[][] = [];
  for (let r = 0; r < GRID-1; r++) {
    for (let c = 0; c < GRID-1; c++) {
      if (!checkBox(lines,r,c) && checkBox(newLines,r,c)) boxes.push([r,c]);
    }
  }
  return boxes;
}

function getAIMove(lines: Set<LineKey>): LineKey | null {
  // Try to complete a box
  const allLines: LineKey[] = [];
  for (let r=0;r<GRID;r++) for(let c=0;c<GRID-1;c++) allLines.push(hKey(r,c));
  for (let r=0;r<GRID-1;r++) for(let c=0;c<GRID;c++) allLines.push(vKey(r,c));
  const avail = allLines.filter(l => !lines.has(l));
  // 1. Take any completing move
  for (const l of avail) { if (getNewBoxes(lines,l).length > 0) return l; }
  // 2. Avoid 3-sided boxes (give opponent boxes)
  const safe = avail.filter(l => {
    const tmp = new Set(lines); tmp.add(l);
    for(let r=0;r<GRID-1;r++) for(let c=0;c<GRID-1;c++) {
      let count = 0;
      if(tmp.has(hKey(r,c)))count++; if(tmp.has(hKey(r+1,c)))count++;
      if(tmp.has(vKey(r,c)))count++; if(tmp.has(vKey(r,c+1)))count++;
      if(count===3)return false;
    }
    return true;
  });
  if (safe.length > 0) return safe[Math.floor(Math.random()*safe.length)];
  return avail[Math.floor(Math.random()*avail.length)] ?? null;
}

export function DotsAndBoxesGame({ onClose }: Props) {
  const [lines, setLines] = useState<Set<LineKey>>(new Set());
  const [boxes, setBoxes] = useState<('player'|'ai'|null)[][]>(Array.from({length:GRID-1},()=>Array(GRID-1).fill(null)));
  const [isPlayer, setIsPlayer] = useState(true);
  const [scores, setScores] = useState({ player: 0, ai: 0 });
  const [phase, setPhase] = useState<'idle'|'playing'|'done'>('idle');
  const [aiThinking, setAiThinking] = useState(false);
  const [hoveredLine, setHoveredLine] = useState<LineKey | null>(null);

  const reset = useCallback(() => {
    setLines(new Set()); setBoxes(Array.from({length:GRID-1},()=>Array(GRID-1).fill(null)));
    setIsPlayer(true); setScores({ player:0, ai:0 }); setPhase('playing'); setAiThinking(false);
  }, []);

  const playLine = useCallback((key: LineKey, byPlayer: boolean, currentLines: Set<LineKey>, currentBoxes: ('player'|'ai'|null)[][]): { newLines: Set<LineKey>; newBoxes: ('player'|'ai'|null)[][]; gained: number } => {
    const newLines = new Set(currentLines); newLines.add(key);
    const newBoxes = currentBoxes.map(row => [...row]) as ('player'|'ai'|null)[][];
    const owner = byPlayer ? 'player' : 'ai';
    let gained = 0;
    for(let r=0;r<GRID-1;r++) for(let c=0;c<GRID-1;c++) {
      if(newBoxes[r][c]===null && checkBox(newLines,r,c)) { newBoxes[r][c]=owner; gained++; }
    }
    return { newLines, newBoxes, gained };
  }, []);

  const handleLine = useCallback((key: LineKey) => {
    if (!isPlayer || lines.has(key) || phase !== 'playing' || aiThinking) return;
    const { newLines, newBoxes, gained } = playLine(key, true, lines, boxes);
    const pScore = newBoxes.flat().filter(b=>b==='player').length;
    const aScore = newBoxes.flat().filter(b=>b==='ai').length;
    setLines(newLines); setBoxes(newBoxes); setScores({ player:pScore, ai:aScore });
    playTone(gained>0?750:500, 0.05, 'sine', 0.08);
    if (gained>0) { vibrate(20); toast.success(`+${gained} box${gained>1?'es':''}!`); }
    const total = (GRID-1)*(GRID-1);
    if(pScore+aScore>=total) { setPhase('done'); return; }
    if (gained === 0) {
      setIsPlayer(false); setAiThinking(true);
      setTimeout(() => {
        const aiMove = getAIMove(newLines);
        if (!aiMove) { setAiThinking(false); setIsPlayer(true); return; }
        const { newLines:nl2, newBoxes:nb2, gained:g2 } = playLine(aiMove, false, newLines, newBoxes);
        const pS2 = nb2.flat().filter(b=>b==='player').length;
        const aS2 = nb2.flat().filter(b=>b==='ai').length;
        setLines(nl2); setBoxes(nb2); setScores({ player:pS2, ai:aS2 });
        playTone(g2>0?450:350, 0.04, 'sine', 0.07);
        if(pS2+aS2>=total) { setPhase('done'); return; }
        setIsPlayer(g2===0);
        setAiThinking(false);
        if(g2>0) { // AI gets another turn
          setTimeout(()=>{
            setIsPlayer(false); setAiThinking(true);
            const m2=getAIMove(nl2);
            if(!m2){setAiThinking(false);setIsPlayer(true);return;}
            const {newLines:nl3,newBoxes:nb3,gained:g3}=playLine(m2,false,nl2,nb2);
            const pS3=nb3.flat().filter(b=>b==='player').length;
            const aS3=nb3.flat().filter(b=>b==='ai').length;
            setLines(nl3);setBoxes(nb3);setScores({player:pS3,ai:aS3});
            if(pS3+aS3>=total){setPhase('done');return;}
            setIsPlayer(g3===0); setAiThinking(false);
          },300);
        }
      }, 400);
    }
  }, [lines, boxes, isPlayer, phase, aiThinking, playLine]);

  const DOT = 28, GAP = 58, PAD = 28;
  const getPos = (r: number, c: number) => ({ x: PAD + c*GAP, y: PAD + r*GAP });
  const winner = phase==='done' ? (scores.player>scores.ai?'You win! 🎉':scores.player<scores.ai?'AI wins 🤖':"It's a draw! 🤝") : null;

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen" style={{ background:'linear-gradient(135deg,#0a1628 0%,#7b8bc1 100%)' }}>
      {/* Scores */}
      <div className="flex gap-5 mt-2">
        {[{label:'You',val:scores.player,color:PLAYER_COLOR},{label:'AI',val:scores.ai,color:AI_COLOR}].map(s=>(
          <div key={s.label} className="flex flex-col items-center px-5 py-2 rounded-2xl" style={{background:'rgba(255,255,255,0.07)'}}>
            <span className="text-2xl font-bold" style={{color:s.color}}>{s.val}</span>
            <span className="text-xs text-white/50">{s.label}</span>
          </div>
        ))}
        <div className="flex flex-col items-center px-5 py-2 rounded-2xl" style={{background:'rgba(255,255,255,0.07)'}}>
          <span className="text-sm font-bold text-white">{(GRID-1)*(GRID-1)-scores.player-scores.ai}</span>
          <span className="text-xs text-white/50">Left</span>
        </div>
      </div>
      <div className="text-white/70 text-sm">{phase==='playing'?(isPlayer?'Your turn':'🤖 AI thinking...'):(winner||'')}</div>

      {/* Game board as SVG */}
      {phase!=='idle' && (
        <svg width={PAD*2+GAP*(GRID-1)} height={PAD*2+GAP*(GRID-1)} className="select-none touch-none">
          {/* Boxes */}
          {Array.from({length:GRID-1},(_, r)=>Array.from({length:GRID-1},(_,c)=>{
            const {x,y}=getPos(r,c);
            const owner=boxes[r]?.[c];
            if(!owner) return null;
            return (
              <rect key={`b${r}_${c}`} x={x+DOT/2} y={y+DOT/2} width={GAP-DOT} height={GAP-DOT}
                fill={owner==='player'?`${PLAYER_COLOR}35`:`${AI_COLOR}35`}
                rx={4}
              >
                <animate attributeName="opacity" from="0" to="1" dur="0.3s" fill="freeze"/>
              </rect>
            );
          }))}

          {/* Horizontal lines */}
          {Array.from({length:GRID},(_, r)=>Array.from({length:GRID-1},(_,c)=>{
            const key=hKey(r,c);
            const taken=lines.has(key);
            const hov=hoveredLine===key;
            const {x,y}=getPos(r,c);
            return (
              <line key={key} x1={x+DOT/2} y1={y+DOT/2} x2={getPos(r,c+1).x+DOT/2} y2={getPos(r,c+1).y+DOT/2}
                stroke={taken?(isPlayer?AI_COLOR:PLAYER_COLOR):hov?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.15)'}
                strokeWidth={taken?4:hov?3:2} strokeLinecap="round"
                style={{cursor:'pointer',transition:'stroke 0.15s'}}
                onClick={()=>handleLine(key)}
                onMouseEnter={()=>setHoveredLine(key)}
                onMouseLeave={()=>setHoveredLine(null)}
              />
            );
          }))}

          {/* Vertical lines */}
          {Array.from({length:GRID-1},(_, r)=>Array.from({length:GRID},(_,c)=>{
            const key=vKey(r,c);
            const taken=lines.has(key);
            const hov=hoveredLine===key;
            const {x,y}=getPos(r,c);
            return (
              <line key={key} x1={x+DOT/2} y1={y+DOT/2} x2={getPos(r+1,c).x+DOT/2} y2={getPos(r+1,c).y+DOT/2}
                stroke={taken?(isPlayer?AI_COLOR:PLAYER_COLOR):hov?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.15)'}
                strokeWidth={taken?4:hov?3:2} strokeLinecap="round"
                style={{cursor:'pointer',transition:'stroke 0.15s'}}
                onClick={()=>handleLine(key)}
                onMouseEnter={()=>setHoveredLine(key)}
                onMouseLeave={()=>setHoveredLine(null)}
              />
            );
          }))}

          {/* Dots */}
          {Array.from({length:GRID},(_, r)=>Array.from({length:GRID},(_,c)=>{
            const {x,y}=getPos(r,c);
            return <circle key={`d${r}_${c}`} cx={x+DOT/2} cy={y+DOT/2} r={6} fill="#c2e7fa"/>;
          }))}

          {/* Box labels */}
          {Array.from({length:GRID-1},(_, r)=>Array.from({length:GRID-1},(_,c)=>{
            const owner=boxes[r]?.[c];
            if(!owner)return null;
            const {x,y}=getPos(r,c);
            return <text key={`bl${r}_${c}`} x={x+GAP/2} y={y+GAP/2+5} textAnchor="middle" fontSize="16"
              fill={owner==='player'?PLAYER_COLOR:AI_COLOR} fontWeight="bold">
              {owner==='player'?'×':'○'}
            </text>;
          }))}
        </svg>
      )}

      <AnimatePresence>
        {phase==='done' && (
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-center">
            <p className="text-white font-bold text-xl mt-1">{winner}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3">
        {phase==='idle' && <Button variant="primary" onClick={reset}>🎮 Play vs AI</Button>}
        {(phase==='playing'||phase==='done') && <Button variant="primary" onClick={reset}>🔄 New Game</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
