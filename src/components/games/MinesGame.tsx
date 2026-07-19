import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertTriangle, Trophy, HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { GameEngine3D } from '@/engine/GameEngine3D';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface MinesGameProps { onClose: () => void; }
type TileState = { id: number; isMine: boolean; clicked: boolean; exploding: boolean; revealed: boolean; };

function combinations(n: number, k: number): number {
  if (k < 0 || k > n) return 0; if (k === 0 || k === n) return 1;
  let r = 1; for (let i = 1; i <= k; i++) r *= (n - k + i) / i; return Math.round(r);
}

function getMinesMultiplier(mines: number, clicks: number): number {
  if (clicks === 0) return 1.0;
  const total = combinations(25, clicks), win = combinations(25 - mines, clicks);
  if (win === 0) return 0;
  return Math.round((total / win) * 0.97 * 100) / 100;
}

// --- 3D Components ---

function MineTile3D({ 
  tile, 
  isPlaying, 
  gameOver, 
  onClick 
}: { 
  tile: TileState; 
  isPlaying: boolean; 
  gameOver: boolean; 
  onClick: (id: number) => void 
}) {
  const col = tile.id % 5;
  const row = Math.floor(tile.id / 5);
  
  // Center grid at origin: 5x5 grid means coords go from -2 to 2
  const x = (col - 2) * 1.5;
  const z = (row - 2) * 1.5;
  const y = tile.clicked ? -0.2 : 0;
  
  const meshRef = useRef<any>(null);
  const gemRef = useRef<any>(null);
  const bombRef = useRef<any>(null);
  
  const [hovered, setHovered] = useState(false);
  
  useFrame((state, delta) => {
    // Animate safe gem rotation
    if (tile.clicked && !tile.isMine && gemRef.current) {
      gemRef.current.rotation.y += delta * 2;
    }
    
    // Animate bomb if detonated
    if (tile.clicked && tile.isMine && bombRef.current) {
      if (tile.exploding) {
        bombRef.current.scale.setScalar(Math.sin(state.clock.elapsedTime * 20) * 0.2 + 1.2);
        bombRef.current.material.color.setHex(Math.random() > 0.5 ? 0xff0000 : 0xaa0000);
      } else {
        bombRef.current.scale.setScalar(1);
        bombRef.current.material.color.setHex(0x550000);
      }
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* Base Tile Block */}
      <mesh 
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(tile.id);
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        receiveShadow
        castShadow
        position={[0, 0, 0]}
      >
        <boxGeometry args={[1.3, 0.4, 1.3]} />
        <meshStandardMaterial 
          color={
            tile.clicked 
              ? (tile.isMine ? '#1a0505' : '#051a1a') // Darken when clicked
              : (hovered && isPlaying && !gameOver ? '#1a3a4a' : '#0f1a24') // Base unclicked color
          } 
          metalness={0.8} 
          roughness={0.2}
          emissive={hovered && !tile.clicked && isPlaying && !gameOver ? new THREE.Color('#00f0ff') : new THREE.Color('#000000')}
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Tile Border/Rim */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.35, 0.35, 1.35]} />
        <meshStandardMaterial color="#00f0ff" transparent opacity={0.1} wireframe={true} />
      </mesh>

      {/* Revealed Contents */}
      {tile.clicked && (
        <group position={[0, 0.6, 0]}>
          {tile.isMine ? (
            // Bomb Object
            <mesh ref={bombRef} castShadow>
              <sphereGeometry args={[0.5, 32, 32]} />
              <meshStandardMaterial color="#550000" metalness={0.5} roughness={0.7} />
              
              {tile.exploding && (
                <pointLight color="#ff0000" intensity={5} distance={10} />
              )}
            </mesh>
          ) : (
            // Gem Object
            <mesh ref={gemRef} castShadow>
              <octahedronGeometry args={[0.4, 0]} />
              <meshPhysicalMaterial 
                color="#00ffff"
                metalness={0.1}
                roughness={0.1}
                transmission={0.9}
                thickness={0.5}
                emissive="#0055ff"
                emissiveIntensity={0.5}
              />
              <pointLight color="#00ffff" intensity={2} distance={3} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
}

// --- Main Game Component ---

export function MinesGame({ onClose }: MinesGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [mineCount, setMineCount] = useState(3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [clicks, setClicks] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [displayMult, setDisplayMult] = useState(1.0);
  
  const [vinnitusActive, setVinnitusActive] = useState(false);
  const [screenJolt, setScreenJolt] = useState<{ x: number; y: number } | null>(null);

  const balance = profile?.tokens ?? 0;
  const currentMultiplier = getMinesMultiplier(mineCount, clicks);

  const heartRateInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      const bpm = 60 + clicks * 25;
      const intervalMs = (60 / bpm) * 1000;
      
      heartRateInterval.current = setInterval(() => {
        playTone(90, 0.08, 'sine', 0.15);
      }, intervalMs);
    } else {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    }
    return () => {
      if (heartRateInterval.current) clearInterval(heartRateInterval.current);
    };
  }, [isPlaying, clicks, gameOver]);

  useEffect(() => {
    const target = currentMultiplier;
    const steps = 15;
    let step = 0;
    const start = displayMult;
    const diff = target - start;
    const id = setInterval(() => {
      step++;
      setDisplayMult(Math.round((start + diff * (step / steps)) * 100) / 100);
      if (step >= steps) clearInterval(id);
    }, 25);
    return () => clearInterval(id);
  }, [currentMultiplier]);

  const startNewGame = async () => {
    if (isPlaying) return;
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile: currentProfile, isOwner } = useAuthStore.getState();
    const freeTrials = currentProfile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProfile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProfile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit real cash to play unlimited.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    const nb = balance - actualBetAmount;
    if (currentProfile && !currentProfile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', currentProfile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    (updateProfile as any)({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
    
    const mineIdx = new Set<number>();
    while (mineIdx.size < mineCount) mineIdx.add(Math.floor(Math.random() * 25));
    
    setTiles(Array.from({ length: 25 }, (_, i) => ({ id: i, isMine: mineIdx.has(i), clicked: false, exploding: false, revealed: false })));
    setIsPlaying(true);
    setClicks(0);
    setGameOver(false);
    setHasWon(false);
    setEarnedTokens(0);
    setDisplayMult(1.0);
    setVinnitusActive(false);
    setScreenJolt(null);
    
    playTone(180, 0.1, 'sawtooth', 0.25);
    setTimeout(() => playTone(360, 0.15, 'sine', 0.2), 100);
  };

  const handleTileClick = useCallback(async (id: number) => {
    if (!isPlaying || gameOver) return;
    const tile = tiles[id];
    if (tile.clicked) return;

    const newTiles = [...tiles];
    newTiles[id] = { ...tile, clicked: true, revealed: true };

    if (tile.isMine) {
      newTiles[id].exploding = true;
      setTiles(newTiles);
      setGameOver(true);
      setIsPlaying(false);
      setHasWon(false);

      const mineCol = id % 5;
      const joltX = mineCol < 2.5 ? 40 : -40;
      setScreenJolt({ x: joltX, y: 15 });
      setTimeout(() => setScreenJolt(null), 300);

      setVinnitusActive(true);
      setTimeout(() => setVinnitusActive(false), 2000);

      playTone(100, 0.8, 'sawtooth', 0.4);
      playTone(50, 1.2, 'sine', 0.5); 
      vibrate([150, 75, 200, 75, 300]);
      
      toast.error('💥 DETONATED! Hit a live mine!', { duration: 3000 });

      // Reveal other mines
      const mineIds = newTiles.filter(t => t.isMine && t.id !== id).map(t => t.id);
      mineIds.forEach((mid, i) => {
        setTimeout(() => {
          setTiles(prev => {
            const copy = [...prev];
            copy[mid] = { ...copy[mid], clicked: true };
            return copy;
          });
          playTone(90 + i * 20, 0.05, 'sawtooth', 0.1);
        }, (i + 1) * 80);
      });

      if (profile && !profile.id.startsWith('guest')) {
        try { 
          await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 0 });
        } catch (e) {
          console.error('Failed to update game stats:', e);
        }
      }
    } else {
      setTiles(newTiles);
      const nc = clicks + 1;
      setClicks(nc);

      playTone(400 + nc * 50, 0.15, 'sine', 0.2);
      vibrate([40, 20, 50]);

      if (nc === 25 - mineCount) {
        await handleCashOut(nc);
      }
    }
  }, [isPlaying, gameOver, tiles, clicks, mineCount, profile]);

  const handleCashOut = useCallback(async (finalClicks = clicks) => {
    if (!isPlaying || gameOver || finalClicks === 0) return;

    const mult = getMinesMultiplier(mineCount, finalClicks);
    const won = Math.floor(betAmount * mult);
    
    setEarnedTokens(won);
    setIsPlaying(false);
    setGameOver(true);
    setHasWon(true);

    setTiles(prev => prev.map(t => ({ ...t, clicked: true })));

    const profit = won - betAmount;
    toast.success(`🎉 Secure Abort! +${profit} tokens`, { duration: 3000, icon: '💰' });

    playTone(523.25, 0.12, 'sine', 0.25);
    setTimeout(() => playTone(659.25, 0.12, 'sine', 0.25), 80);
    setTimeout(() => playTone(783.99, 0.15, 'sine', 0.25), 160);
    setTimeout(() => playTone(1046.50, 0.25, 'sine', 0.3), 240);
    vibrate([60, 40, 100, 40, 150]);

    const fb = balance + won;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({
          tokens: fb,
          total_earned: profile.total_earned + profit,
          xp: profile.xp + Math.floor(betAmount * 0.15),
        }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch (e) {
        console.error('Failed to update user after cashout:', e);
      }
    }
    (updateProfile as any)({ tokens: fb });
  }, [isPlaying, gameOver, clicks, mineCount, profile, balance, betAmount, updateProfile]);

  return (
    <div 
      className={`relative flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100vh-120px)] items-stretch overflow-hidden text-text-primary transition-all duration-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl ${
        vinnitusActive ? 'filter saturate-50 contrast-125' : ''
      }`}
      style={{
        transform: screenJolt ? `translate3d(${screenJolt.x}px, ${screenJolt.y}px, 0px)` : 'none',
        background: 'linear-gradient(135deg, #0d1b38 0%, #0a1628 40%, #0f1535 100%)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[700px] bg-gradient-to-t from-cyan-500/5 to-transparent filter blur-3xl rounded-full opacity-60" />
        <div className="absolute top-12 left-1/4 w-[300px] h-[300px] bg-purple-500/5 filter blur-3xl rounded-full" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-full pointer-events-none bg-[radial-gradient(ellipse_at_top,_rgba(0,240,255,0.06)_0%,_rgba(0,0,0,0)_60%)]" />

      {/* Left Control Panel */}
      <Card className="w-full lg:w-96 flex flex-col justify-between p-6 space-y-6 bg-slate-900/90 border-2 border-cyan-500/20 rounded-3xl shrink-0 backdrop-blur-md z-20">
        <div className="space-y-4">
          <motion.div className="flex justify-between items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-200 uppercase tracking-wider">
              MINES 3D
            </h2>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-500/30">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="font-mono text-xs font-bold text-red-500 tracking-widest shadow-red-500/50">
                BOMBS: {mineCount.toString().padStart(2, '0')}
              </span>
            </div>
          </motion.div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={isPlaying} />

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mine Count</label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 3, 5, 10].map(n => (
                <Button
                  key={n}
                  variant={mineCount === n ? 'primary' : 'ghost'}
                  disabled={isPlaying}
                  onClick={() => { setMineCount(n); playTone(400, 0.05, 'sine', 0.1); }}
                  className={`py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    mineCount === n
                      ? 'border-cyan-400/80 bg-cyan-500/10 text-cyan-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          {isPlaying && (
            <div className={`p-4 rounded-2xl bg-gradient-to-br from-cyan-950/40 to-slate-900 border border-cyan-500/20 text-center space-y-2 ${
              clicks > 0 ? 'animate-pulse' : ''
            }`}>
              <span className="text-[10px] text-cyan-300 font-bold uppercase tracking-widest">MULTIPLIER</span>
              <h3 className="text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-[#ffd700] via-yellow-200 to-amber-400 leading-none">
                {displayMult.toFixed(2)}x
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                = {Math.floor(betAmount * displayMult)} tokens
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {isPlaying ? (
            <>
              <div className="relative group">
                <Button 
                  variant="neon" 
                  size="lg"
                  className="w-full font-bold py-3.5 text-xs rounded-xl disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 border border-cyan-400/40"
                  disabled={clicks === 0}
                  onClick={() => handleCashOut()}
                >
                  <Trophy size={16} />
                  ABORT & SECURE PAYOUT
                </Button>
              </div>
              <Button
                variant="ghost"
                className="w-full text-xs text-red-400 hover:text-red-300 hover:bg-red-500/5 py-2 rounded-xl border border-red-500/20"
                onClick={startNewGame}
              >
                Trigger Force Restart
              </Button>
            </>
          ) : (
            <Button 
              variant="neon" 
              size="lg"
              className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" 
              disabled={isPlaying || betAmount <= 0 || betAmount > balance} 
              onClick={startNewGame}
            >
              {gameOver && !hasWon ? 'REINITIALIZE CORE' : 'INITIALIZE SCAN'}
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-[10px] text-slate-400 hover:text-slate-400 py-1.5 rounded-lg"
            onClick={onClose}
          >
            Close Hologram
          </Button>
        </div>

        <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between font-mono">
          <span>Safe Path Return: 97%</span>
          <span>Balance: {balance} tokens</span>
        </div>
      </Card>

      {/* 3D Game Board Viewport */}
      <Card className="flex-1 flex flex-col items-center justify-between relative min-h-[500px] border border-slate-800 rounded-2xl overflow-hidden z-20 bg-slate-950">
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>3D TACTICAL GRID</span>
        </div>

        <div className="absolute inset-0 z-0 cursor-crosshair">
          <GameEngine3D 
            enablePhysics={false} 
            cameraPosition={[0, 8, 8]}
            enablePostProcessing={true}
          >
            {/* Grid Container tilted slightly to face camera better */}
            <group rotation={[-0.2, 0, 0]}>
              {/* Base Platform underneath the tiles */}
              <mesh position={[0, -0.4, 0]} receiveShadow>
                 <boxGeometry args={[8, 0.4, 8]} />
                 <meshStandardMaterial color="#0a0a0a" metalness={0.9} roughness={0.1} />
              </mesh>
              
              {/* Grid Tiles */}
              {tiles.length === 0 ? (
                // Dummy tiles for initial state before pressing play
                Array.from({ length: 25 }).map((_, i) => {
                  const col = i % 5;
                  const row = Math.floor(i / 5);
                  const x = (col - 2) * 1.5;
                  const z = (row - 2) * 1.5;
                  return (
                    <group key={i} position={[x, 0, z]}>
                      <mesh position={[0, 0, 0]} receiveShadow>
                        <boxGeometry args={[1.3, 0.4, 1.3]} />
                        <meshStandardMaterial color="#0a1a24" metalness={0.8} roughness={0.2} />
                      </mesh>
                      <mesh position={[0, 0.05, 0]}>
                        <boxGeometry args={[1.35, 0.35, 1.35]} />
                        <meshStandardMaterial color="#00f0ff" transparent opacity={0.1} wireframe={true} />
                      </mesh>
                    </group>
                  );
                })
              ) : (
                tiles.map(tile => (
                  <MineTile3D 
                    key={tile.id} 
                    tile={tile} 
                    isPlaying={isPlaying} 
                    gameOver={gameOver} 
                    onClick={handleTileClick} 
                  />
                ))
              )}
            </group>
            
            {/* Status Overlays directly inside the 3D scene Canvas via HTML */}
            <Html center position={[0, -1, 4]} zIndexRange={[100, 0]} className="pointer-events-none">
              <div className="w-80 text-center">
                <AnimatePresence>
                  {gameOver && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 20 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="backdrop-blur-md bg-black/60 p-4 rounded-xl border border-white/10 shadow-2xl"
                    >
                      {hasWon ? (
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold flex items-center justify-center gap-1.5">
                            <Trophy size={14} /> Mission Completed
                          </span>
                          <h4 className="text-xl font-black text-white whitespace-nowrap">
                            +{earnedTokens} Tokens Secured
                          </h4>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase tracking-widest text-red-500 font-bold flex items-center justify-center gap-1.5">
                            <AlertTriangle size={14} /> Detonation Sequence Fired
                          </span>
                          <h4 className="text-lg font-black text-red-400">
                            GRID COMPROMISED
                          </h4>
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {!isPlaying && !gameOver && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="backdrop-blur-sm bg-black/40 px-4 py-2 rounded-xl border border-cyan-500/20 shadow-2xl mt-8"
                    >
                      <p className="text-[10px] text-cyan-300 font-mono tracking-wider flex items-center gap-1.5">
                        <Shield size={12} className="text-cyan-400" />
                        INITIALIZE CORE TO START SCAN
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Html>
          </GameEngine3D>
        </div>
      </Card>
    </div>
  );
}
