// src/components/games/LudoGame.tsx — Premium Ludo Board Game
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Props { onClose: () => void }

type Color = 'red' | 'blue' | 'green' | 'yellow';
type Token = { id: string; color: Color; pos: number; home: boolean; finished: boolean };

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_HEX: Record<Color, string> = { red:'#F44336', blue:'#2196F3', green:'#4CAF50', yellow:'#FFD700' };


// Simplified path: 52 main squares + safe squares
// Each token starts at home (-1), enters track at start pos, goes 51 steps to finish
const START_POS: Record<Color,number> = { red:0, blue:13, green:26, yellow:39 };
const SAFE_SQUARES = new Set([0,8,13,21,26,34,39,47]);

function makeTokens(): Token[] {
  const tokens: Token[] = [];
  COLORS.forEach(color => {
    for (let i = 0; i < 4; i++) {
      tokens.push({ id:`${color}-${i}`, color, pos: -1, home: true, finished: false });
    }
  });
  return tokens;
}

function canMove(token: Token, dice: number): boolean {
  if (token.finished) return false;
  if (token.home) return dice === 6;
  const newPos = token.pos + dice;
  return newPos <= START_POS[token.color] + 51;
}

function moveToken(token: Token, dice: number): Token {
  if (token.home && dice === 6) {
    return { ...token, home: false, pos: START_POS[token.color] };
  }
  const newPos = token.pos + dice;
  const finishPos = START_POS[token.color] + 51;
  if (newPos >= finishPos) {
    return { ...token, pos: finishPos, finished: true };
  }
  return { ...token, pos: newPos % 52 };
}

export function LudoGame({ onClose }: Props) {
  const [phase, setPhase] = useState<'idle'|'playing'|'done'>('idle');
  const [tokens, setTokens] = useState<Token[]>(makeTokens());
  const [currentColor, setCurrentColor] = useState<Color>('red');
  const [dice, setDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [movable, setMovable] = useState<string[]>([]);
  const [winner, setWinner] = useState<Color | null>(null);
  const animRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const rollDice = useCallback(() => {
    if (rolling || movable.length > 0) return;
    setRolling(true);
    let ticks = 0;
    animRef.current = setInterval(() => {
      setDice(Math.ceil(Math.random() * 6));
      ticks++;
      if (ticks >= 8) {
        clearInterval(animRef.current!);
        const finalDice = Math.ceil(Math.random() * 6);
        setDice(finalDice);
        setRolling(false);
        playTone(400 + finalDice * 40, 0.05, 'sine', 0.1); vibrate(20);
        // Find movable tokens for current color
        setTokens(tks => {
          const mv = tks.filter(t => t.color === currentColor && canMove(t, finalDice)).map(t => t.id);
          setMovable(mv);
          if (mv.length === 0) {
            // Auto-advance turn after 1s
            setTimeout(() => nextTurn(finalDice !== 6), finalDice !== 6 ? 800 : 0);
          }
          return tks;
        });
      }
    }, 100);
  }, [rolling, movable, currentColor]);

  const nextTurn = useCallback((advance: boolean) => {
    if (advance) {
      setCurrentColor(c => {
        const idx = COLORS.indexOf(c);
        return COLORS[(idx + 1) % 4];
      });
    }
    setMovable([]);
    setDice(0);
  }, []);

  const handleTokenClick = useCallback((tokenId: string) => {
    if (!movable.includes(tokenId)) return;
    setTokens(prev => {
      const newTokens = prev.map(t => {
        if (t.id !== tokenId) return t;
        const moved = moveToken(t, dice);
        if (moved.finished) {
          const finishedCount = prev.filter(tk => tk.color === t.color && tk.finished).length + 1;
          if (finishedCount >= 4) {
            setWinner(t.color); setPhase('done');
            toast.success(`🏆 ${t.color.toUpperCase()} wins!`);
          }
        }
        // Capture check
        if (!moved.home && !moved.finished && !SAFE_SQUARES.has(moved.pos % 52)) {
          const captured = prev.filter(other =>
            other.color !== t.color && !other.home && !other.finished &&
            !SAFE_SQUARES.has(other.pos % 52) && other.pos % 52 === moved.pos % 52
          );
          captured.forEach(cap => {
            toast.success(`💥 ${t.color} captured ${cap.color}!`);
          });
        }
        return moved;
      });
      // Also reset captured tokens
      const movedToken = newTokens.find(t => t.id === tokenId)!;
      return newTokens.map(t => {
        if (t.id === tokenId) return t;
        if (!t.home && !t.finished && !SAFE_SQUARES.has(t.pos % 52) &&
            movedToken && !movedToken.home && !movedToken.finished &&
            t.pos % 52 === movedToken.pos % 52 && t.color !== movedToken.color) {
          playTone(600, 0.08, 'sine', 0.15); vibrate(40);
          return { ...t, pos: -1, home: true };
        }
        return t;
      });
    });
    playTone(600, 0.06, 'sine', 0.1); vibrate(15);
    setMovable([]);
    nextTurn(dice !== 6);
  }, [movable, dice, nextTurn]);

  // AI turns for blue, green, yellow
  useEffect(() => {
    if (currentColor === 'red' || rolling || phase !== 'playing' || movable.length > 0) return;
    const timer = setTimeout(() => rollDice(), 800);
    return () => clearTimeout(timer);
  }, [currentColor, rolling, movable, phase, rollDice]);

  useEffect(() => {
    if (currentColor !== 'red' && movable.length > 0 && phase === 'playing') {
      const aiToken = movable[Math.floor(Math.random() * movable.length)];
      setTimeout(() => handleTokenClick(aiToken), 600);
    }
  }, [movable, currentColor, phase, handleTokenClick]);

  const startGame = useCallback(() => {
    setTokens(makeTokens()); setCurrentColor('red'); setDice(0);
    setRolling(false); setMovable([]); setWinner(null); setPhase('playing');
  }, []);

  const DICE_DOTS: Record<number, [number,number][]> = {
    1:[[50,50]], 2:[[25,25],[75,75]], 3:[[25,25],[50,50],[75,75]],
    4:[[25,25],[75,25],[25,75],[75,75]], 5:[[25,25],[75,25],[50,50],[25,75],[75,75]],
    6:[[25,20],[75,20],[25,50],[75,50],[25,80],[75,80]],
  };



  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen" style={{ background:'linear-gradient(135deg,#0a1628 0%,#7b8bc1 100%)' }}>
      {/* Header */}
      <div className="flex gap-3 mt-1 flex-wrap justify-center">
        {COLORS.map(c => {
          const finished = tokens.filter(t => t.color === c && t.finished).length;
          return (
            <div key={c} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm transition-all ${currentColor===c&&phase==='playing'?'ring-2 ring-white':''}`}
              style={{ background: currentColor===c ? COLOR_HEX[c]+'33' : 'rgba(255,255,255,0.06)', border:`1.5px solid ${COLOR_HEX[c]}50` }}>
              <span style={{ color: COLOR_HEX[c] }}>{c === 'red' ? '👤' : '🤖'}</span>
              <span className="text-white text-xs font-medium capitalize">{c}</span>
              <span className="text-white/70 text-xs">{finished}/4</span>
            </div>
          );
        })}
      </div>

      {/* Board */}
      {phase !== 'idle' && (
        <div className="relative" style={{ width: 320, height: 320 }}>
          <svg width={320} height={320}>
            {/* Grid of cells */}
            {Array.from({length:15},(_, r)=>Array.from({length:15},(_,c)=>{
              // Color zones
              let fill='rgba(255,255,255,0.04)';
              let stroke='rgba(255,255,255,0.06)';
              if(r<6&&c<6){fill=`${COLOR_HEX.red}22`;stroke=`${COLOR_HEX.red}40`;}
              else if(r<6&&c>=9){fill=`${COLOR_HEX.blue}22`;stroke=`${COLOR_HEX.blue}40`;}
              else if(r>=9&&c<6){fill=`${COLOR_HEX.yellow}22`;stroke=`${COLOR_HEX.yellow}40`;}
              else if(r>=9&&c>=9){fill=`${COLOR_HEX.green}22`;stroke=`${COLOR_HEX.green}40`;}
              else if(r===7&&c>=1&&c<=5){fill=`${COLOR_HEX.red}44`;}
              else if(r===7&&c>=9&&c<=13){fill=`${COLOR_HEX.blue}44`;}
              else if(c===7&&r>=1&&r<=5){fill=`${COLOR_HEX.blue}44`;}
              else if(c===7&&r>=9&&r<=13){fill=`${COLOR_HEX.yellow}44`;}
              if(r===7&&c===7){fill='#222';stroke='rgba(255,255,255,0.15)';}
              return <rect key={`${r}_${c}`} x={c*21.33} y={r*21.33} width={21.33} height={21.33} fill={fill} stroke={stroke} strokeWidth={0.5}/>;
            }))}

            {/* Home bases */}
            {COLORS.map((color,i)=>{
              const hx=i%2===0?1:9, hy=i<2?1:9;
              return (
                <rect key={color} x={hx*21.33+2} y={hy*21.33+2} width={5*21.33-4} height={5*21.33-4}
                  fill={COLOR_HEX[color]+'33'} rx={8} stroke={COLOR_HEX[color]} strokeWidth={1.5}/>
              );
            })}

            {/* Tokens on track */}
            {tokens.filter(t=>!t.home&&!t.finished).map(t=>{
              // Map pos to grid cell
              const trackPos = t.pos % 52;
              // Simplified: render as emoji positions
              const col = trackPos % 15, row2 = Math.floor(trackPos / 15);
              const x2 = (col * 21.33) + 10.67, y2 = (row2 * 21.33) + 10.67;
              const isMov = movable.includes(t.id) && currentColor === t.color;
              return (
                <motion.circle key={t.id} cx={x2} cy={y2} r={8}
                  fill={COLOR_HEX[t.color]} stroke={isMov?'#FFD700':'white'} strokeWidth={isMov?2:1}
                  onClick={()=>handleTokenClick(t.id)}
                  style={{ cursor:isMov?'pointer':'default' }}
                  animate={isMov?{scale:[1,1.3,1]}:{scale:1}}
                  transition={{ repeat:Infinity, duration:0.7 }}
                />
              );
            })}

            {/* Home tokens */}
            {COLORS.map((color,ci)=>{
              const homeTokens=tokens.filter(t=>t.color===color&&t.home);
              const hx=ci%2===0?1:9, hy=ci<2?1:9;
              return homeTokens.map((t,i)=>{
                const tx=(hx+(i%2)*2+0.5)*21.33+10.67, ty=(hy+(Math.floor(i/2)*2)+0.5)*21.33+10.67;
                const isMov=movable.includes(t.id);
                return (
                  <motion.circle key={t.id} cx={tx} cy={ty} r={9}
                    fill={COLOR_HEX[color]} stroke={isMov?'#FFD700':'rgba(255,255,255,0.4)'} strokeWidth={isMov?2.5:1.5}
                    onClick={()=>handleTokenClick(t.id)} style={{cursor:isMov?'pointer':'default'}}
                    animate={isMov?{scale:[1,1.25,1]}:{}} transition={{repeat:Infinity,duration:0.7}}
                  />
                );
              });
            })}
          </svg>
        </div>
      )}

      {/* Dice + Roll */}
      {phase === 'playing' && (
        <div className="flex items-center gap-5">
          <motion.div className="w-14 h-14 rounded-xl flex items-center justify-center cursor-pointer select-none"
            style={{ background:'rgba(255,255,255,0.1)', border:'2px solid rgba(255,255,255,0.2)' }}
            onClick={currentColor==='red'?rollDice:undefined}
            animate={rolling?{rotate:[0,90,180,270,360]}:{}}
            transition={{ duration:0.3, repeat:rolling?Infinity:0 }}
          >
            {dice === 0 ? <span className="text-white/30 text-sm">Roll</span> : (
              <svg width="40" height="40" viewBox="0 0 100 100">
                {(DICE_DOTS[dice]||[]).map(([dx,dy],j)=>(
                  <circle key={j} cx={dx} cy={dy} r={8} fill={COLOR_HEX[currentColor]}/>
                ))}
              </svg>
            )}
          </motion.div>
          <div className="flex flex-col">
            <span className="text-white font-semibold text-sm capitalize" style={{color:COLOR_HEX[currentColor]}}>{currentColor}'s turn {currentColor!=='red'&&'(AI)'}</span>
            {currentColor==='red' && movable.length===0 && !rolling && (
              <button onClick={rollDice} className="text-xs text-white/60 underline mt-0.5">Tap dice or click here</button>
            )}
            {movable.length > 0 && currentColor==='red' && (
              <span className="text-yellow-400 text-xs animate-pulse">Select a token to move!</span>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {phase==='done' && winner && (
          <motion.div initial={{scale:0.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-center">
            <div className="text-4xl mb-1">🏆</div>
            <p className="font-bold text-xl" style={{color:COLOR_HEX[winner]}}>{winner.toUpperCase()} WINS!</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-3 mt-auto">
        {phase==='idle' && <Button variant="primary" onClick={startGame}>🎮 Start</Button>}
        {phase!=='idle' && <Button variant="primary" onClick={startGame}>🔄 Restart</Button>}
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
