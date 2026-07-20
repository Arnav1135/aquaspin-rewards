// src/components/games/LudoGame.tsx — Premium 3D Ludo Board Game
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { gsap } from 'gsap';

interface Props { onClose: () => void }

type Color = 'red' | 'blue' | 'green' | 'yellow';
type Token = { id: string; color: Color; pos: number; home: boolean; finished: boolean };
type PlayerType = 'human' | 'ai' | 'online' | 'disabled';

const COLORS: Color[] = ['red', 'blue', 'green', 'yellow'];
const COLOR_HEX: Record<Color, string> = { red: '#F44336', blue: '#2196F3', green: '#4CAF50', yellow: '#FFD700' };

// START_POS: Red: 0, Blue: 13, Green: 26, Yellow: 39
const START_POS: Record<Color, number> = { red: 0, blue: 13, green: 26, yellow: 39 };
const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// 52 track cell coordinates [row, col] clockwise starting from red start [6, 1]
const TRACK_COORDS: [number, number][] = [
  [6, 1], [6, 2], [6, 3], [6, 4], [6, 5],
  [5, 6], [4, 6], [3, 6], [2, 6], [1, 6], [0, 6],
  [0, 7],
  [0, 8], [1, 8], [2, 8], [3, 8], [4, 8], [5, 8],
  [6, 9], [6, 10], [6, 11], [6, 12], [6, 13], [6, 14],
  [7, 14],
  [8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9],
  [9, 8], [10, 8], [11, 8], [12, 8], [13, 8], [14, 8],
  [14, 7],
  [14, 6], [13, 6], [12, 6], [11, 6], [10, 6], [9, 6],
  [8, 5], [8, 4], [8, 3], [8, 2], [8, 1], [8, 0],
  [7, 0],
  [6, 0]
];

// Statically resolves yard position centers to avoid Z-fighting
function getYardCellCoords(color: Color, tokenId: string): [number, number] {
  const ci = COLORS.indexOf(color);
  const hx = ci % 2 === 0 ? 1 : 9;
  const hy = ci < 2 ? 1 : 9;

  // Statically resolve slot offset (0 to 3) from token identity string color-i
  const slotIdx = parseInt(tokenId.split('-')[1]) || 0;

  const r = hy + Math.floor(slotIdx / 2) * 2 + 1;
  const c = hx + (slotIdx % 2) * 2 + 1;
  return [r, c];
}

// Returns the 57-step path of cell coordinates [row, col] for a player color
function getPathForColor(color: Color): [number, number][] {
  const path: [number, number][] = [];
  const startIdx = START_POS[color];
  // 51 cells on the main loop
  for (let i = 0; i < 51; i++) {
    path.push(TRACK_COORDS[(startIdx + i) % 52]);
  }
  // 5 cells in the home column
  for (let i = 1; i <= 5; i++) {
    if (color === 'red') path.push([7, i]);
    if (color === 'blue') path.push([i, 7]);
    if (color === 'green') path.push([7, 14 - i]);
    if (color === 'yellow') path.push([14 - i, 7]);
  }
  // 1 cell home base
  if (color === 'red') path.push([7, 6]);
  if (color === 'blue') path.push([6, 7]);
  if (color === 'green') path.push([7, 8]);
  if (color === 'yellow') path.push([8, 7]);

  return path;
}

function makeTokens(): Token[] {
  const tokens: Token[] = [];
  COLORS.forEach(color => {
    for (let i = 0; i < 4; i++) {
      tokens.push({ id: `${color}-${i}`, color, pos: -1, home: true, finished: false });
    }
  });
  return tokens;
}

function canMove(token: Token, dice: number): boolean {
  if (token.finished) return false;
  if (token.home) return dice === 6;
  const newPos = token.pos + dice;
  return newPos <= 56; // 56 is the Home Base index in the 57-step path
}

function moveToken(token: Token, dice: number): Token {
  if (token.home && dice === 6) {
    return { ...token, home: false, pos: 0 };
  }
  const newPos = token.pos + dice;
  if (newPos >= 56) {
    return { ...token, pos: 56, finished: true };
  }
  return { ...token, pos: newPos };
}

// Particle manager helper
interface Particle {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}
class ParticleSystemManager {
  particles: Particle[] = [];
  maxParticles = 150;

  constructor() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles.push({
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        color: '#fff',
        size: 0.05,
        alpha: 0,
        decay: 1.5
      });
    }
  }

  spawn(x: number, y: number, z: number, color: string, count = 20) {
    let spawned = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particles[i].alpha <= 0) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 1.5 + Math.random() * 2.5;

        this.particles[i].pos.set(x, y, z);
        this.particles[i].vel.set(
          Math.sin(phi) * Math.cos(theta) * speed,
          Math.sin(phi) * Math.sin(theta) * speed + 1.0,
          Math.cos(phi) * speed
        );
        this.particles[i].color = color;
        this.particles[i].size = 0.06 + Math.random() * 0.06;
        this.particles[i].alpha = 1.0;
        this.particles[i].decay = 1.0 + Math.random() * 1.5;
        
        spawned++;
        if (spawned >= count) break;
      }
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (p.alpha > 0) {
        p.pos.addScaledVector(p.vel, dt);
        p.vel.y -= 4.0 * dt; // Gravity
        p.alpha -= p.decay * dt;
      }
    }
  }
}

const particleMgr = new ParticleSystemManager();

export function LudoGame({ onClose }: Props) {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [tokens, setTokens] = useState<Token[]>(makeTokens());
  const [currentColor, setCurrentColor] = useState<Color>('red');
  const [dice, setDice] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [movable, setMovable] = useState<string[]>([]);
  const [winner, setWinner] = useState<Color | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'roll' | 'capture' | 'win'>('idle');

  // Player configuration types mapping
  const [playerConfig, setPlayerConfig] = useState<Record<Color, PlayerType>>({
    red: 'human',
    blue: 'ai',
    green: 'ai',
    yellow: 'ai'
  });

  const [matchmaking, setMatchmaking] = useState(false);
  const [lobbyStatus, setLobbyStatus] = useState('');

  // Multi-theme support
  const [theme, setTheme] = useState<'classic' | 'marble' | 'neon'>('classic');

  const rollDice = useCallback(() => {
    if (rolling || movable.length > 0) return;
    setRolling(true);
    setCameraState('roll');
  }, [rolling, movable]);

  const handleRollComplete = useCallback((rolledVal: number) => {
    setRolling(false);
    setDice(rolledVal);
    playTone(400 + rolledVal * 40, 0.05, 'sine', 0.1);
    vibrate(20);

    setTokens(tks => {
      const mv = tks.filter(t => t.color === currentColor && canMove(t, rolledVal)).map(t => t.id);
      setMovable(mv);
      if (mv.length === 0) {
        // Auto-advance turn after short delay
        setTimeout(() => nextTurn(rolledVal !== 6), rolledVal !== 6 ? 1000 : 200);
      }
      return tks;
    });
  }, [currentColor]);

  const nextTurn = useCallback((advance: boolean) => {
    if (advance) {
      setCurrentColor(c => {
        let nextColor = c;
        // Loop to find the next active non-disabled player
        for (let i = 1; i <= 4; i++) {
          const idx = COLORS.indexOf(nextColor);
          const candidate = COLORS[(idx + 1) % 4];
          if (playerConfig[candidate] !== 'disabled') {
            return candidate;
          }
          nextColor = candidate;
        }
        return c;
      });
    }
    setMovable([]);
    setDice(0);
    setCameraState('idle');
  }, [playerConfig]);

  const handleTokenClick = useCallback((tokenId: string) => {
    if (!movable.includes(tokenId)) return;

    setTokens(prev => {
      let isCapture = false;
      const targetToken = prev.find(t => t.id === tokenId)!;
      const moved = moveToken(targetToken, dice);

      const newTokens = prev.map(t => {
        if (t.id !== tokenId) return t;
        if (moved.finished) {
          const finishedCount = prev.filter(tk => tk.color === t.color && tk.finished).length + 1;
          if (finishedCount >= 4) {
            setWinner(t.color);
            setPhase('done');
            setCameraState('win');
            toast.success(`🏆 ${t.color.toUpperCase()} wins!`);
            particleMgr.spawn(0, 0.5, 0, '#ffe066', 100);
          }
        }
        return moved;
      });

      // Capture check
      const path = getPathForColor(moved.color);
      const targetCell = path[moved.pos];
      
      if (!moved.home && !moved.finished && targetCell) {
        // Check if lands on opponent
        const isSafeSquare = SAFE_SQUARES.has(TRACK_COORDS.findIndex(c => c[0] === targetCell[0] && c[1] === targetCell[1]));
        if (!isSafeSquare) {
          const opponents = newTokens.filter(other =>
            other.color !== moved.color && !other.home && !other.finished
          );

          opponents.forEach(opp => {
            const oppPath = getPathForColor(opp.color);
            const oppCell = oppPath[opp.pos];
            if (oppCell && oppCell[0] === targetCell[0] && oppCell[1] === targetCell[1]) {
              isCapture = true;
              opp.pos = -1;
              opp.home = true;
              toast.success(`💥 ${moved.color.toUpperCase()} captured ${opp.color.toUpperCase()}!`);
            }
          });
        }
      }

      if (isCapture) {
        setCameraState('capture');
        playTone(600, 0.08, 'sine', 0.15);
        vibrate(40);
        const cellX = (targetCell[1] - 7) * 0.5;
        const cellZ = (targetCell[0] - 7) * 0.5;
        particleMgr.spawn(cellX, 0.2, cellZ, COLOR_HEX[moved.color], 50);
      }

      return newTokens;
    });

    playTone(600, 0.06, 'sine', 0.1);
    vibrate(15);
    setMovable([]);
    nextTurn(dice !== 6);
  }, [movable, dice, nextTurn]);

  // Turn Autoplay Engine (AI / Online / Simulated)
  useEffect(() => {
    if (phase !== 'playing' || rolling || movable.length > 0) return;
    
    const currentPlayerType = playerConfig[currentColor];
    if (currentPlayerType === 'human' || currentPlayerType === 'disabled') return;

    // AI or Online player rolls
    const rollDelay = currentPlayerType === 'online' ? 1200 + Math.random() * 800 : 1000;
    const timer = setTimeout(() => {
      rollDice();
      
      // Random chat bubbles in online mode
      if (currentPlayerType === 'online' && Math.random() < 0.18) {
        const msgs = ['Good luck!', 'Let\'s roll!', 'Need a 6!', 'Nice move!', 'Wow!', '😭', '😎', '👍', 'Oops!', '🤪'];
        toast(msgs[Math.floor(Math.random() * msgs.length)], { icon: '💬' });
      }
    }, rollDelay);

    return () => clearTimeout(timer);
  }, [currentColor, rolling, movable, phase, rollDice, playerConfig]);

  useEffect(() => {
    if (phase !== 'playing' || movable.length === 0) return;
    
    const currentPlayerType = playerConfig[currentColor];
    if (currentPlayerType === 'human' || currentPlayerType === 'disabled') return;

    // AI or Online player moves token
    const moveDelay = currentPlayerType === 'online' ? 900 + Math.random() * 600 : 800;
    const timer = setTimeout(() => {
      // Smart AI selection algorithm:
      // Priority: 1. enter home base, 2. capture opponent, 3. get out of yard, 4. advance closest to home
      let selectedTokenId = movable[0];
      let bestWeight = -1;

      movable.forEach(tid => {
        const token = tokens.find(t => t.id === tid);
        if (!token) return;
        let weight = 0;
        
        // 1. Entering home
        const newPos = token.pos + dice;
        if (newPos === 56) weight = 100;
        
        // 2. Capturing opponent
        const path = getPathForColor(token.color);
        const targetCell = path[newPos];
        if (targetCell && !SAFE_SQUARES.has(TRACK_COORDS.findIndex(c => c[0] === targetCell[0] && c[1] === targetCell[1]))) {
          const opponents = tokens.filter(other => other.color !== token.color && !other.home && !other.finished);
          const hasOpponent = opponents.some(opp => {
            const oppPath = getPathForColor(opp.color);
            const oppCell = oppPath[opp.pos];
            return oppCell && oppCell[0] === targetCell[0] && oppCell[1] === targetCell[1];
          });
          if (hasOpponent) weight = 90;
        }

        // 3. Getting out of yard
        if (token.home && dice === 6) weight = 80;
        
        // 4. Default advancement priority (closest to home gets slightly higher preference)
        if (weight === 0) {
          weight = 10 + token.pos;
        }
        
        if (weight > bestWeight) {
          bestWeight = weight;
          selectedTokenId = tid;
        }
      });

      handleTokenClick(selectedTokenId);
    }, moveDelay);

    return () => clearTimeout(timer);
  }, [movable, currentColor, phase, handleTokenClick, playerConfig, tokens, dice]);

  // Mode Selection Triggers
  const startVS_AI = () => {
    setPlayerConfig({
      red: 'human',
      blue: 'ai',
      green: 'ai',
      yellow: 'ai'
    });
    startGame();
  };

  const startPassAndPlay = (playersCount: number) => {
    setPlayerConfig({
      red: 'human',
      blue: playersCount >= 2 ? 'human' : 'disabled',
      green: playersCount >= 3 ? 'human' : 'disabled',
      yellow: playersCount >= 4 ? 'human' : 'disabled'
    });
    startGame();
  };

  const startOnlineMultiplayer = () => {
    setMatchmaking(true);
    setLobbyStatus('Searching for live opponents...');
    
    // Simulate matchmaking lobby pairings
    setTimeout(() => setLobbyStatus('Matching: Anya (Lv. 24) joined...'), 800);
    setTimeout(() => setLobbyStatus('Matching: Lucas (Lv. 15) joined...'), 1600);
    setTimeout(() => setLobbyStatus('Matching: Dheeraj (Lv. 42) joined...'), 2400);
    setTimeout(() => {
      setPlayerConfig({
        red: 'human',
        blue: 'online',
        green: 'online',
        yellow: 'online'
      });
      setMatchmaking(false);
      startGame();
      toast.success('Room connected! Game starting...');
    }, 3200);
  };

  const startGame = () => {
    setTokens(makeTokens());
    setCurrentColor('red');
    setDice(0);
    setRolling(false);
    setMovable([]);
    setWinner(null);
    setPhase('playing');
    setCameraState('idle');
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 min-h-screen relative select-none" style={{ background: 'linear-gradient(135deg,#0a1224 0%,#20325d 100%)' }}>
      {/* Top HUD */}
      <div className="flex justify-between items-center w-full max-w-4xl px-4 mt-2">
        <span className="text-white text-xl font-bold tracking-wider">🎲 LUDO KING 3D</span>
        <div className="flex gap-2">
          {['classic', 'marble', 'neon'].map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t as any)}
              className={`px-3 py-1 text-xs rounded-full border transition-all ${theme === t ? 'bg-cyan-500/20 border-cyan-400 text-white' : 'border-white/20 text-white/50'}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Players status panel */}
      {phase === 'playing' && (
        <div className="flex gap-3 flex-wrap justify-center">
          {COLORS.map(c => {
            const finished = tokens.filter(t => t.color === c && t.finished).length;
            const pType = playerConfig[c];
            if (pType === 'disabled') return null;

            return (
              <div
                key={c}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${currentColor === c ? 'ring-2 ring-white scale-105' : 'opacity-70'}`}
                style={{ background: currentColor === c ? COLOR_HEX[c] + '33' : 'rgba(255,255,255,0.06)', border: `1.5px solid ${COLOR_HEX[c]}80` }}
              >
                <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: COLOR_HEX[c] }} />
                <span className="text-white font-medium capitalize text-xs">
                  {c} ({pType === 'human' ? 'You' : pType === 'ai' ? 'AI' : 'Online'})
                </span>
                <span className="text-white/60 text-xs font-bold">{finished}/4</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3D Scene viewport */}
      <div className="relative w-full max-w-2xl aspect-square bg-slate-950/80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {phase !== 'idle' ? (
          <Canvas shadows>
            <SceneContent
              tokens={tokens}
              movable={movable}
              rolling={rolling}
              theme={theme}
              cameraState={cameraState}
              onRollComplete={handleRollComplete}
              onTokenClick={handleTokenClick}
            />
          </Canvas>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-sm px-6">
            {!matchmaking ? (
              <>
                <motion.h1 initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-3xl font-extrabold text-white tracking-widest mb-4">LUDO BOARD CHAMPIONSHIP</motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} className="text-white/70 text-sm mb-6 text-center max-w-md">Experience classic Ludo board game in hyper-realistic 3D space with rigid body dice rolling and jewel-like game tokens.</motion.p>
                
                <div className="flex flex-col gap-3 w-full max-w-xs">
                  <Button variant="neon" size="lg" onClick={startVS_AI} className="w-full">
                    🤖 vs AI Mode (Single Player)
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button variant="ghost" className="flex-1 bg-white/5 border border-white/10 text-white" onClick={() => startPassAndPlay(2)}>👥 Pass & Play (2P)</Button>
                    <Button variant="ghost" className="flex-1 bg-white/5 border border-white/10 text-white" onClick={() => startPassAndPlay(4)}>👥 Pass & Play (4P)</Button>
                  </div>

                  <Button variant="neon" size="lg" className="w-full border-cyan-400/40" onClick={startOnlineMultiplayer}>
                    🌐 Online Multiplayer Mode
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
                <span className="text-white text-lg font-semibold animate-pulse">{lobbyStatus}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control panel & Action HUD */}
      {phase === 'playing' && (
        <div className="flex items-center gap-6 bg-slate-900/60 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 w-full max-w-md">
          <div className="flex flex-col">
            <span className="text-xs text-white/50 tracking-wider">CURRENT TURN</span>
            <span className="text-lg font-bold capitalize" style={{ color: COLOR_HEX[currentColor] }}>
              {playerConfig[currentColor] === 'human' ? `${currentColor} (You)` : `${currentColor} (${playerConfig[currentColor]})`}
            </span>
          </div>

          <div className="flex-1 flex justify-end items-center gap-4">
            {playerConfig[currentColor] === 'human' && !rolling && movable.length === 0 && (
              <Button onClick={rollDice} variant="neon" className="px-6 py-3 font-semibold rounded-xl text-sm">
                Roll Dice
              </Button>
            )}
            {rolling && (
              <span className="text-cyan-400 text-sm font-semibold animate-pulse">Rolling...</span>
            )}
            {movable.length > 0 && playerConfig[currentColor] === 'human' && (
              <span className="text-yellow-400 text-sm font-semibold animate-bounce">Move Token!</span>
            )}
          </div>
        </div>
      )}

      {/* Win Modal */}
      <AnimatePresence>
        {phase === 'done' && winner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-md z-50">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-slate-900 border border-cyan-500/30 p-8 rounded-2xl text-center max-w-sm">
              <span className="text-5xl mb-4 block">🏆</span>
              <h2 className="text-2xl font-bold text-white mb-2 uppercase" style={{ color: COLOR_HEX[winner] }}>{winner} Victory!</h2>
              <p className="text-white/60 text-sm mb-6">All four pieces successfully reached the Home Base.</p>
              <div className="flex gap-4 justify-center">
                <Button variant="neon" onClick={startGame}>Play Again</Button>
                <Button variant="ghost" onClick={onClose}>Exit</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-auto mb-2 flex gap-4">
        {phase !== 'idle' && (
          <Button variant="ghost" size="sm" onClick={() => setPhase('idle')} className="text-white/60">
            Switch Mode
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60">
          Exit Room
        </Button>
      </div>
    </div>
  );
}

// Scene Content with R3F hooks
interface SceneProps {
  tokens: Token[];
  movable: string[];
  rolling: boolean;
  theme: 'classic' | 'marble' | 'neon';
  cameraState: 'idle' | 'roll' | 'capture' | 'win';
  onRollComplete: (val: number) => void;
  onTokenClick: (id: string) => void;
}

function SceneContent({
  tokens,
  movable,
  rolling,
  theme,
  cameraState,
  onRollComplete,
  onTokenClick
}: SceneProps) {
  const { camera } = useThree();
  const cameraTarget = useRef(new THREE.Vector3(0, 0, 0));

  // Particle updates
  const pointsRef = useRef<THREE.Points>(null);
  const particlePositions = useRef(new Float32Array(particleMgr.maxParticles * 3));
  const particleAlphas = useRef(new Float32Array(particleMgr.maxParticles));

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    particleMgr.update(dt);

    if (pointsRef.current) {
      const geo = pointsRef.current.geometry;
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
      const alphaAttr = geo.getAttribute('alpha') as THREE.BufferAttribute;

      for (let i = 0; i < particleMgr.maxParticles; i++) {
        const p = particleMgr.particles[i];
        particlePositions.current[i * 3] = p.pos.x;
        particlePositions.current[i * 3 + 1] = p.pos.y;
        particlePositions.current[i * 3 + 2] = p.pos.z;
        particleAlphas.current[i] = p.alpha;
      }
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }

    // Camera animation curves using lerps
    let targetPos = new THREE.Vector3(0, 7.5, 5.5); // Default tilted view
    if (cameraState === 'roll') {
      targetPos.set(0.0, 5.0, -1.0); // Focus closer to the dice tray
      cameraTarget.current.set(0.0, 0.1, -4.8);
    } else if (cameraState === 'capture') {
      // Add slight camera shake peaks
      const shakeAmt = Math.sin(state.clock.elapsedTime * 60) * 0.05;
      targetPos.set(shakeAmt, 7.5, 5.5 + shakeAmt);
      cameraTarget.current.set(0, 0, 0);
    } else if (cameraState === 'win') {
      // Slow rotation around the board center
      const angle = state.clock.elapsedTime * 0.4;
      targetPos.set(Math.sin(angle) * 6, 6.0, Math.cos(angle) * 6);
      cameraTarget.current.set(0, 0, 0);
    } else {
      cameraTarget.current.set(0, 0, 0);
    }

    camera.position.lerp(targetPos, 4.0 * dt);
    camera.lookAt(cameraTarget.current);
  });

  return (
    <>
      <color attach="background" args={theme === 'neon' ? ['#050812'] : ['#0a0f1d']} />
      
      {/* Lighting setup */}
      <ambientLight intensity={theme === 'neon' ? 0.3 : 0.6} />
      <directionalLight
        position={[4, 10, 3]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 5, -4]} intensity={0.5} />
      
      {/* OrbitControls - Enabled only in idle */}
      <OrbitControls
        enableDamping
        maxPolarAngle={Math.PI / 2.1}
        minDistance={3.5}
        maxDistance={12}
      />

      <PhysicsDiceTray rolling={rolling} onRollComplete={onRollComplete} theme={theme} />

      <Board3D theme={theme} />

      {/* Render 3D Tokens */}
      {tokens.map(token => (
        <Token3D
          key={token.id}
          token={token}
          tokens={tokens}
          movable={movable}
          onClick={onTokenClick}
        />
      ))}

      {/* Particle System */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions.current, 3]}
          />
          <bufferAttribute
            attach="attributes-alpha"
            args={[particleAlphas.current, 1]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.12}
          color="#ffffff"
          vertexColors={false}
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </points>
    </>
  );
}

// 3D Rigid body dice rolling simulation inside the tray
interface PhysicsDiceTrayProps {
  rolling: boolean;
  onRollComplete: (val: number) => void;
  theme: 'classic' | 'marble' | 'neon';
}

function PhysicsDiceTray({ rolling, onRollComplete, theme }: PhysicsDiceTrayProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [world, setWorld] = useState<CANNON.World | null>(null);
  const [body, setBody] = useState<CANNON.Body | null>(null);
  const rollInProgress = useRef(false);
  const settleFrames = useRef(0);

  useEffect(() => {
    // Setup local physics environment inside the tray area
    const pWorld = new CANNON.World();
    pWorld.gravity.set(0, -9.8, 0);

    // Bounding walls for the dice tray at [x: 0, z: -4.8]
    // Floor
    const ground = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
    ground.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    ground.position.set(0, 0.02, -4.8);
    pWorld.addBody(ground);

    // Wall boxes
    pWorld.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(0.05, 1, 1)), position: new CANNON.Vec3(-1.1, 0.5, -4.8) }));
    pWorld.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(1.1, 1, 0.05)), position: new CANNON.Vec3(0, 0.5, -5.95) }));
    pWorld.addBody(new CANNON.Body({ mass: 0, shape: new CANNON.Box(new CANNON.Vec3(1.1, 1, 0.05)), position: new CANNON.Vec3(0, 0.5, -3.65) }));

    const diceBody = new CANNON.Body({
      mass: 1.5,
      shape: new CANNON.Box(new CANNON.Vec3(0.12, 0.12, 0.12)),
      position: new CANNON.Vec3(0, 1.2, -4.8)
    });
    pWorld.addBody(diceBody);

    setWorld(pWorld);
    setBody(diceBody);
  }, []);

  // Roll activation
  useEffect(() => {
    if (rolling && body && !rollInProgress.current) {
      rollInProgress.current = true;
      settleFrames.current = 0;
      
      // Initial spin impulses
      body.position.set(0, 1.6, -4.8);
      body.velocity.set((Math.random() - 0.5) * 2, -4.0, (Math.random() - 0.5) * 2);
      body.angularVelocity.set(
        10 + Math.random() * 20,
        10 + Math.random() * 20,
        10 + Math.random() * 20
      );
    }
  }, [rolling, body]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    if (world && body && meshRef.current && rollInProgress.current) {
      world.step(dt);
      meshRef.current.position.copy(body.position as any);
      meshRef.current.quaternion.copy(body.quaternion as any);

      // Check velocity thresholds for settle detection
      const vel = body.velocity;
      const ang = body.angularVelocity;
      if (vel.length() < 0.01 && ang.length() < 0.01) {
        settleFrames.current++;
        if (settleFrames.current > 30) {
          rollInProgress.current = false;
          
          // Determine resulting face orientation
          const localFaces = [
            { value: 1, vec: new THREE.Vector3(0, 1, 0) },
            { value: 6, vec: new THREE.Vector3(0, -1, 0) },
            { value: 3, vec: new THREE.Vector3(1, 0, 0) },
            { value: 4, vec: new THREE.Vector3(-1, 0, 0) },
            { value: 2, vec: new THREE.Vector3(0, 0, 1) },
            { value: 5, vec: new THREE.Vector3(0, 0, -1) }
          ];

          let maxDot = -Infinity;
          let rollVal = 1;

          const q = new THREE.Quaternion(
            body.quaternion.x,
            body.quaternion.y,
            body.quaternion.z,
            body.quaternion.w
          );

          localFaces.forEach(f => {
            const worldVec = f.vec.clone().applyQuaternion(q);
            if (worldVec.y > maxDot) {
              maxDot = worldVec.y;
              rollVal = f.value;
            }
          });

          // Edge nudge to snap perfectly flat
          const snapQuat = new THREE.Quaternion();
          if (rollVal === 1) snapQuat.setFromEuler(new THREE.Euler(0, 0, 0));
          else if (rollVal === 6) snapQuat.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
          else if (rollVal === 3) snapQuat.setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
          else if (rollVal === 4) snapQuat.setFromEuler(new THREE.Euler(0, 0, Math.PI / 2));
          else if (rollVal === 2) snapQuat.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
          else if (rollVal === 5) snapQuat.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));

          meshRef.current.quaternion.copy(snapQuat);
          body.quaternion.copy(snapQuat as any);
          body.position.y = 0.13; // Settle perfectly on tray surface

          onRollComplete(rollVal);
        }
      }
    }
  });

  const neonStyle = theme === 'neon';
  const marbleStyle = theme === 'marble';

  return (
    <group>
      {/* 3D Dice Tray Box */}
      <mesh position={[0, 0.02, -4.8]} receiveShadow>
        <boxGeometry args={[2.0, 0.04, 2.0]} />
        <meshStandardMaterial
          color={neonStyle ? '#101a35' : marbleStyle ? '#d7e2e8' : '#2e7d32'}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      {/* Tray borders */}
      <mesh position={[-1.02, 0.1, -4.8]} castShadow>
        <boxGeometry args={[0.08, 0.2, 2.08]} />
        <meshStandardMaterial color="#4e2f1d" roughness={0.3} />
      </mesh>
      <mesh position={[1.02, 0.1, -4.8]} castShadow>
        <boxGeometry args={[0.08, 0.2, 2.08]} />
        <meshStandardMaterial color="#4e2f1d" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, -5.86]} castShadow>
        <boxGeometry args={[2.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4e2f1d" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.1, -3.74]} castShadow>
        <boxGeometry args={[2.08, 0.2, 0.08]} />
        <meshStandardMaterial color="#4e2f1d" roughness={0.3} />
      </mesh>

      {/* Physics Die Group */}
      <group ref={meshRef} position={[0, 0.13, -4.8]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.24, 0.24, 0.24]} />
          <meshStandardMaterial
            color={neonStyle ? '#00e5ff' : '#fafafa'}
            roughness={0.1}
            metalness={neonStyle ? 0.8 : 0.0}
            emissive={neonStyle ? '#003c4a' : '#000000'}
          />
        </mesh>
        
        {/* Render physical concave 3D Pips */}
        <group>
          {/* Face 1 (+Y) */}
          <mesh position={[0, 0.121, 0]}>
            <sphereGeometry args={[0.024, 8, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>

          {/* Face 6 (-Y) */}
          {[-0.06, 0, 0.06].flatMap(z => [-0.04, 0.04].map(x => (
            <mesh key={`6-${x}-${z}`} position={[x, -0.121, z]}>
              <sphereGeometry args={[0.02, 8, 8]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
            </mesh>
          )))}

          {/* Face 2 (+Z) */}
          <mesh position={[-0.04, -0.04, 0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.04, 0.04, 0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>

          {/* Face 5 (-Z) */}
          <mesh position={[-0.05, -0.05, -0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.05, 0.05, -0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0, 0, -0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[-0.05, 0.05, -0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.05, -0.05, -0.121]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>

          {/* Face 3 (+X) */}
          <mesh position={[0.121, -0.05, -0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.121, 0, 0]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[0.121, 0.05, 0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>

          {/* Face 4 (-X) */}
          <mesh position={[-0.121, -0.05, -0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[-0.121, 0.05, -0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[-0.121, -0.05, 0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
          <mesh position={[-0.121, 0.05, 0.05]}><sphereGeometry args={[0.02, 8, 8]} /><meshStandardMaterial color="#1a1a1a" /></mesh>
        </group>
      </group>
    </group>
  );
}

// 3D Premium Board Component
function Board3D({ theme }: { theme: 'classic' | 'marble' | 'neon' }) {
  const isNeon = theme === 'neon';
  const isMarble = theme === 'marble';

  // Construct board elements
  return (
    <group>
      {/* Outer Wooden/Lacquer Rim */}
      <mesh receiveShadow position={[0, -0.04, 0]}>
        <boxGeometry args={[7.7, 0.1, 7.7]} />
        <meshStandardMaterial
          color={isNeon ? '#060914' : isMarble ? '#3e2723' : '#4e2f1d'}
          roughness={isMarble ? 0.05 : 0.4}
          metalness={isNeon ? 0.4 : 0.0}
        />
      </mesh>

      {/* Main Board Base Plate */}
      <mesh receiveShadow position={[0, 0.01, 0]}>
        <boxGeometry args={[7.5, 0.01, 7.5]} />
        <meshStandardMaterial
          color={isNeon ? '#0f172a' : isMarble ? '#f5f5f5' : '#ffffff'}
          roughness={isMarble ? 0.02 : 0.25}
          metalness={isNeon ? 0.15 : 0.0}
        />
      </mesh>

      {/* Grid of tiles (Selective highlight approach to prevent Z-fighting) */}
      {/* Home Yard quadrant overlays */}
      {COLORS.map((colName, ci) => {
        const offset = ci === 0 ? [-2.25, -2.25] : ci === 1 ? [2.25, -2.25] : ci === 2 ? [2.25, 2.25] : [-2.25, 2.25];
        return (
          <mesh key={colName} position={[offset[0], 0.018, offset[1]]} receiveShadow>
            <boxGeometry args={[2.9, 0.005, 2.9]} />
            <meshStandardMaterial
              color={COLOR_HEX[colName]}
              transparent
              opacity={isNeon ? 0.35 : 0.2}
              roughness={0.1}
            />
          </mesh>
        );
      })}

      {/* 52 Track Tiles & Home Columns */}
      {TRACK_COORDS.map((cell, idx) => {
        const x = (cell[1] - 7) * 0.5;
        const z = (cell[0] - 7) * 0.5;

        // Base color calculation
        let color = isNeon ? '#1e293b' : '#eeeeee';
        const isSafe = SAFE_SQUARES.has(idx);
        
        // Match entry tiles color
        if (idx === 0) color = COLOR_HEX.red;
        else if (idx === 13) color = COLOR_HEX.blue;
        else if (idx === 26) color = COLOR_HEX.green;
        else if (idx === 39) color = COLOR_HEX.yellow;
        else if (isSafe) color = '#ffe066'; // Gold stars

        return (
          <group key={`track-${idx}`} position={[x, 0.016, z]}>
            <mesh receiveShadow>
              <boxGeometry args={[0.46, 0.006, 0.46]} />
              <meshStandardMaterial
                color={color}
                roughness={0.15}
                metalness={isSafe ? 0.8 : 0.1}
                emissive={isSafe && isNeon ? '#3a3000' : undefined}
              />
            </mesh>
            {isSafe && (
              // Add a physical metal star indicator
              <mesh position={[0, 0.005, 0]}>
                <torusGeometry args={[0.1, 0.02, 8, 24]} />
                <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Home Column Tiles */}
      {COLORS.map(col => {
        const path = getPathForColor(col);
        // Path indices 51 to 55 are Home Column
        return path.slice(51, 56).map((cell, idx) => {
          const x = (cell[1] - 7) * 0.5;
          const z = (cell[0] - 7) * 0.5;
          return (
            <mesh key={`col-${col}-${idx}`} position={[x, 0.017, z]} receiveShadow>
              <boxGeometry args={[0.46, 0.006, 0.46]} />
              <meshStandardMaterial
                color={COLOR_HEX[col]}
                roughness={0.15}
                metalness={0.2}
              />
            </mesh>
          );
        });
      })}

      {/* Home Base Center Triangle division */}
      <mesh position={[0, 0.018, 0]} receiveShadow>
        <boxGeometry args={[1.4, 0.006, 1.4]} />
        <meshStandardMaterial
          color={isNeon ? '#0f172a' : '#1e1e1e'}
          roughness={0.1}
          metalness={0.4}
        />
      </mesh>
    </group>
  );
}

// 3D Jewel-like Token Component
interface Token3DProps {
  token: Token;
  tokens: Token[];
  movable: string[];
  onClick: (id: string) => void;
}

function Token3D({ token, tokens, movable, onClick }: Token3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const prevPosRef = useRef(token.pos);
  const { color, id, pos, home, finished } = token;

  const isMovable = movable.includes(id);

  // Position lookup matching standard cell indices
  const getPositionForState = useCallback(() => {
    if (home) {
      const coord = getYardCellCoords(color, id);
      return [(coord[1] - 7) * 0.5, 0.02, (coord[0] - 7) * 0.5];
    }
    const path = getPathForColor(color);
    const coord = path[pos];
    if (coord) {
      let x = (coord[1] - 7) * 0.5;
      let z = (coord[0] - 7) * 0.5;

      // Handle overlap offset calculation
      const siblings = tokens.filter(t => !t.home && !t.finished && t.pos !== -1);
      const sameCell = siblings.filter(s => {
        const sPath = getPathForColor(s.color);
        const sCoord = sPath[s.pos];
        return sCoord && sCoord[0] === coord[0] && sCoord[1] === coord[1];
      });

      if (sameCell.length > 1) {
        const sIndex = sameCell.findIndex(s => s.id === id);
        if (sIndex !== -1) {
          const angle = (sIndex * 2 * Math.PI) / sameCell.length;
          const radius = 0.12;
          x += Math.cos(angle) * radius;
          z += Math.sin(angle) * radius;
        }
      }

      return [x, 0.02, z];
    }
    return [0, 0.02, 0];
  }, [home, pos, color, id, tokens]);

  // Initial mount placement
  useEffect(() => {
    if (groupRef.current) {
      const initialPos = getPositionForState();
      groupRef.current.position.set(initialPos[0], initialPos[1], initialPos[2]);
    }
  }, []);

  // GSAP animation triggers for path moves, hops, and captures
  useEffect(() => {
    if (prevPosRef.current === pos) return;
    if (!groupRef.current) return;

    const path = getPathForColor(color);
    const timeline = gsap.timeline({
      onComplete: () => {
        prevPosRef.current = pos;
      }
    });

    if (prevPosRef.current === -1 && pos === 0) {
      // Leap out of yard
      const targetCell = path[0];
      const targetX = (targetCell[1] - 7) * 0.5;
      const targetZ = (targetCell[0] - 7) * 0.5;

      timeline.to(groupRef.current.position, {
        x: targetX,
        z: targetZ,
        duration: 0.5,
        ease: 'power3.out'
      });
      // Hop bounce
      timeline.to(groupRef.current.position, {
        y: 0.6,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'power1.inOut'
      }, 0);
    } else if (pos > prevPosRef.current) {
      // Sequential hopping timelines
      const start = prevPosRef.current === -1 ? 0 : prevPosRef.current;
      for (let i = start + 1; i <= pos; i++) {
        const cell = path[i];
        if (!cell) continue;
        const targetX = (cell[1] - 7) * 0.5;
        const targetZ = (cell[0] - 7) * 0.5;

        // Linear interpolation to next cell
        timeline.to(groupRef.current.position, {
          x: targetX,
          z: targetZ,
          duration: 0.26,
          ease: 'power1.out'
        });

        // Vertical hopping curve
        timeline.to(groupRef.current.position, {
          y: 0.5,
          duration: 0.13,
          yoyo: true,
          repeat: 1,
          ease: 'power1.inOut'
        }, '-=0.26');

        // Dynamic Squash & Stretch
        timeline.to(groupRef.current.scale, {
          y: 1.3,
          x: 0.85,
          z: 0.85,
          duration: 0.08,
          ease: 'power1.out'
        }, '-=0.26');
        timeline.to(groupRef.current.scale, {
          y: 0.7,
          x: 1.15,
          z: 1.15,
          duration: 0.08,
          ease: 'power1.in'
        }, '-=0.18');
        timeline.to(groupRef.current.scale, {
          y: 1.0,
          x: 1.0,
          z: 1.0,
          duration: 0.1,
          ease: 'power2.out'
        }, '-=0.1');
      }
    } else {
      // Captured: high trajectory back to yard
      const targetCell = getYardCellCoords(color, id);
      const targetX = (targetCell[1] - 7) * 0.5;
      const targetZ = (targetCell[0] - 7) * 0.5;

      timeline.to(groupRef.current.position, {
        x: targetX,
        z: targetZ,
        duration: 0.9,
        ease: 'power2.inOut'
      });
      // Massive vertical bounce
      timeline.to(groupRef.current.position, {
        y: 1.6,
        duration: 0.45,
        yoyo: true,
        repeat: 1,
        ease: 'power1.out'
      }, 0);
    }
  }, [pos, color, id, tokens]);

  // Idle micro-animation bobbing
  useFrame((state) => {
    if (groupRef.current && !finished && !isMovable) {
      const offset = id.charCodeAt(id.length - 1) * 0.2; // Offset phase per token
      const t = state.clock.elapsedTime * 2.0 + offset;
      // Breathe and slow rotate
      groupRef.current.position.y = 0.02 + Math.sin(t) * 0.015;
      groupRef.current.rotation.y = Math.cos(t * 0.5) * 0.05;
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        if (isMovable) onClick(id);
      }}
    >
      {/* Glowing selection ring overlay */}
      {isMovable && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.18, 0.24, 32]} />
          <meshBasicMaterial color="#ffe066" side={THREE.DoubleSide} transparent opacity={0.8} />
        </mesh>
      )}

      {/* Pawn Geometry base structure */}
      <mesh castShadow position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.11, 0.16, 0.08, 16]} />
        <meshPhysicalMaterial
          color={COLOR_HEX[color]}
          roughness={0.15}
          metalness={0.1}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </mesh>
      {/* Pawn skirt */}
      <mesh castShadow position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.07, 0.11, 0.16, 16]} />
        <meshPhysicalMaterial
          color={COLOR_HEX[color]}
          roughness={0.15}
          metalness={0.1}
          clearcoat={1.0}
        />
      </mesh>
      {/* Pawn collar */}
      <mesh castShadow position={[0, 0.23, 0]}>
        <torusGeometry args={[0.065, 0.02, 8, 16]} />
        <meshPhysicalMaterial
          color={COLOR_HEX[color]}
          roughness={0.15}
          metalness={0.1}
        />
      </mesh>
      {/* Pawn Head Sphere */}
      <mesh castShadow position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshPhysicalMaterial
          color={COLOR_HEX[color]}
          roughness={0.1}
          metalness={0.15}
          clearcoat={1.0}
        />
      </mesh>
    </group>
  );
}
