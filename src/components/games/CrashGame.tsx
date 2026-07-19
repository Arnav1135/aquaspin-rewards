import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody } from '@react-three/rapier';
import { Html, Line, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface CrashGameProps { onClose: () => void; }
type GameState = 'betting' | 'countdown' | 'climbing' | 'crashed' | 'success_aborted';
type SocialEntry = { user: string; amount: number; mult: number; };

const FAKE_USERS = ['Raj','Priya','Max','Luna','Kai','Zoe','Arnav','Mia','Dev','Sara'];

// --- 3D Components ---

function RocketFlightPath({ points, crashed }: { points: THREE.Vector3[], crashed: boolean }) {
  if (points.length < 2) return null;
  return (
    <Line 
      points={points} 
      color={crashed ? "#ef4444" : "#00F0FF"} 
      lineWidth={4} 
      dashed={false} 
    />
  );
}

function Rocket3D({ 
  multiplier, 
  crashed, 
  elapsed, 
  onPathUpdate,
  gameState
}: { 
  multiplier: number, 
  crashed: boolean, 
  elapsed: number,
  onPathUpdate: (p: THREE.Vector3) => void,
  gameState: string
}) {
  const rocketGroup = useRef<any>(null);
  const rigidBodyRef = useRef<any>(null);
  const [hasTumbled, setHasTumbled] = useState(false);
  
  // Create a trail of points based on mathematical curve
  // x = time (elapsed)
  // y = multiplier
  // To keep it visually balanced, scale them.
  const scaleX = 2.0;
  const scaleY = 0.5;

  useFrame((state) => {
    if (!crashed && rocketGroup.current && rigidBodyRef.current) {
      const isPreparing = gameState === 'betting' || gameState === 'countdown';
      const actualElapsed = isPreparing ? 0 : elapsed;
      const actualMult = isPreparing ? 1.0 : multiplier;

      // Calculate current ideal position based on exponential curve
      const idealX = actualElapsed * scaleX - 10; // offset so it starts left
      const idealY = (actualMult - 1.0) * scaleY - 2; // offset so it starts bottom
      
      const newPos = new THREE.Vector3(idealX, idealY, 0);
      
      // Calculate pitch angle by looking slightly ahead
      const nextElapsed = actualElapsed + 0.1;
      const nextMult = Math.pow(Math.E, 0.08 * nextElapsed);
      const nextX = nextElapsed * scaleX - 10;
      const nextY = (nextMult - 1.0) * scaleY - 2;
      
      const angle = Math.atan2(nextY - idealY, nextX - idealX);
      
      // Move kinematic rigid body
      rigidBodyRef.current.setTranslation(newPos, true);
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, angle));
      rigidBodyRef.current.setRotation(quat, true);
      
      // Add a slight wobble for turbulence
      let wobble = Math.sin(state.clock.elapsedTime * 10) * 0.1;
      if (gameState === 'countdown') wobble += (Math.random() - 0.5) * 0.15; // shake during countdown
      rocketGroup.current.position.y = wobble;
      
      onPathUpdate(newPos);
      setHasTumbled(false);
    } else if (crashed && !hasTumbled && rigidBodyRef.current) {
      // Trigger dynamic physics tumble
      setHasTumbled(true);
      
      // Apply explosive impulse
      rigidBodyRef.current.setBodyType(0, true); // 0 = dynamic
      
      // Toss it forward and randomize rotation
      rigidBodyRef.current.applyImpulse({ x: 5, y: 15, z: (Math.random() - 0.5) * 10 }, true);
      rigidBodyRef.current.applyTorqueImpulse({ x: Math.random() * 2, y: Math.random() * 2, z: Math.random() * 2 }, true);
    }
  });

  return (
    <RigidBody ref={rigidBodyRef} type="kinematicPosition" colliders="hull" restitution={0.5}>
      <group ref={rocketGroup}>
        {gameState === 'climbing' && <Trail width={1} color={crashed ? '#ef4444' : '#f97316'} length={20} attenuation={(t) => t * t}>
          {/* Exhaust Nozzle to anchor the trail */}
          <mesh position={[-0.8, 0, 0]}>
             <boxGeometry args={[0.1, 0.1, 0.1]} />
             <meshBasicMaterial transparent opacity={0} />
          </mesh>
        </Trail>}
        
        {/* Main Hull */}
        <mesh castShadow position={[0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 1.5, 16]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.6} roughness={0.4} />
        </mesh>
        
        {/* Nose Cone */}
        <mesh castShadow position={[1.0, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.3, 0.6, 16]} />
          <meshStandardMaterial color="#ef4444" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Thruster Base */}
        <mesh castShadow position={[-0.85, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.4, 0.2, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
        </mesh>

        {/* Wings */}
        <mesh castShadow position={[-0.4, 0.4, 0]} rotation={[0, 0, -Math.PI / 8]}>
          <boxGeometry args={[0.6, 0.8, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh castShadow position={[-0.4, -0.4, 0]} rotation={[0, 0, Math.PI / 8]}>
          <boxGeometry args={[0.6, 0.8, 0.1]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.5} />
        </mesh>
        
        {/* Cockpit Window */}
        <mesh position={[0.4, 0.25, 0]} rotation={[Math.PI / 4, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16, 0, Math.PI]} />
          <meshStandardMaterial color="#00f0ff" metalness={0.9} roughness={0.1} />
        </mesh>
        
        {/* Dynamic Engine Glow/Flame */}
        {gameState === 'climbing' && (
          <mesh position={[-1.2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.2, 1.5, 16]} />
            <meshBasicMaterial color="#f97316" transparent opacity={0.8} blending={THREE.AdditiveBlending} />
            <pointLight color="#f97316" intensity={2} distance={5} />
          </mesh>
        )}
        {/* Ignition Spark during countdown */}
        {gameState === 'countdown' && (
          <mesh position={[-0.9, 0, 0]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color="#ffaa00" transparent opacity={0.6 + Math.random()*0.4} blending={THREE.AdditiveBlending} />
            <pointLight color="#ffaa00" intensity={1} distance={2} />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

function GridEnvironment({ crashed }: { crashed: boolean }) {
  return (
    <group>
      {/* Background Plane */}
      <mesh position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#061022" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Dynamic Grid Lines */}
      <gridHelper args={[100, 100, '#00f0ff', '#00f0ff']} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -9.9]} material-transparent material-opacity={0.1} />
      
      {/* Global Illumination shift on crash */}
      <ambientLight intensity={crashed ? 0.2 : 0.6} color={crashed ? '#ff0000' : '#ffffff'} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} color={crashed ? '#ffaaaa' : '#ffffff'} castShadow />
    </group>
  );
}


// --- Main Game Component ---

export function CrashGame({ onClose }: CrashGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [autoCashOut, setAutoCashOut] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>('betting');
  const [multiplier, setMultiplier] = useState(1.0);
  const [cashedOut, setCashedOut] = useState(false);
  const [earnedTokens, setEarnedTokens] = useState(0);
  const [socialFeed, setSocialFeed] = useState<SocialEntry[]>([]);
  const [safetyCoverOpen, setSafetyCoverOpen] = useState(false);
  
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [flightPath, setFlightPath] = useState<THREE.Vector3[]>([]);
  
  const rAFRef = useRef<number | null>(null);
  const startTimeRef = useRef(0);
  const crashPointRef = useRef(1.0);
  const cashedOutRef = useRef(false);
  const autoCashOutRef = useRef<number | null>(null);
  const socialIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const balance = profile?.tokens ?? 0;

  const [timeDilationActive, setTimeDilationActive] = useState(false);
  const [tinnitusActive, setTinnitusActive] = useState(false);
  const [countdownTicks, setCountdownTicks] = useState(5);
  const [isAborting, setIsAborting] = useState(false);
  const [pastCrashes, setPastCrashes] = useState<number[]>([1.5, 2.4, 4.0, 8.2]);

  useEffect(() => { autoCashOutRef.current = autoCashOut; }, [autoCashOut]);
  useEffect(() => { cashedOutRef.current = cashedOut; }, [cashedOut]);

  const getMultColor = (m: number) => {
    if (m >= 10) return '#ef4444';
    if (m >= 5) return '#f97316';
    if (m >= 2) return '#eab308';
    return '#00F0FF';
  };

  const tick = () => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const currentMult = Math.round(Math.pow(Math.E, 0.08 * elapsed) * 100) / 100;
    
    setElapsedSeconds(elapsed);

    let nearMiss = false;
    pastCrashes.forEach(pc => {
      if (Math.abs(currentMult - pc) <= 0.05 && currentMult < pc) {
        nearMiss = true;
      }
    });

    setTimeDilationActive(nearMiss);

    if (currentMult >= crashPointRef.current) {
      setMultiplier(crashPointRef.current);
      setGameState('crashed');
      setPastCrashes(prev => [crashPointRef.current, ...prev.slice(0, 3)]);
      
      playTone(85, 0.5, 'sawtooth', 0.4);
      playTone(45, 0.8, 'sine', 0.5); 
      vibrate([150, 50, 250, 50, 300]);
      
      setTinnitusActive(true);
      setTimeout(() => setTinnitusActive(false), 2000);

      if (!cashedOutRef.current) toast.error(`💥 CRASHED at ${crashPointRef.current}x!`);
      if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
      return;
    }

    if (!cashedOutRef.current && autoCashOutRef.current && currentMult >= autoCashOutRef.current) {
      handleCashOut(currentMult);
    }

    setMultiplier(currentMult);

    if (currentMult > 1.8) {
      const shakeChance = Math.min(0.8, (currentMult / 20));
      if (Math.random() < shakeChance) {
        vibrate(Math.min(15, currentMult * 1.5));
      }
    }

    rAFRef.current = requestAnimationFrame(tick);
  };

  const handleStartGame = async () => {
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    
    const { profile, isOwner, updateProfile } = useAuthStore.getState();
    const freeTrials = profile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !profile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !profile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit to play.'); return; }
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    setGameState('countdown');
    setCountdownTicks(5);
    setMultiplier(1.0);
    setCashedOut(false);
    cashedOutRef.current = false;
    setEarnedTokens(0);
    setSocialFeed([]);
    setSafetyCoverOpen(false);
    setFlightPath([]);
    setElapsedSeconds(0);

    let ticks = 5;
    const countTimer = setInterval(() => {
      ticks--;
      setCountdownTicks(ticks);
      
      playTone(320, 0.1, 'sine', 0.2);
      vibrate(12);

      if (ticks <= 0) {
        clearInterval(countTimer);
        
        setGameState('climbing');
        playTone(392.00, 0.12, 'sine', 0.25);
        setTimeout(() => playTone(523.25, 0.2, 'sine', 0.3), 100);

        const nb = balance - actualBetAmount;
        if (profile && !profile.id.startsWith('guest')) {
          try { 
            (supabase.from('users') as any).update({ tokens: nb }).eq('id', profile.id).then();
          } catch (e) {
            console.error('Failed to update user balance:', e);
          }
        }
        updateProfile({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });
        crashPointRef.current = Math.random() < 0.03 ? 1.0 : Math.max(1.01, Math.round((0.96 / Math.random()) * 100) / 100);
        startTimeRef.current = Date.now();
        rAFRef.current = requestAnimationFrame(tick);

        socialIntervalRef.current = setInterval(() => {
          const u = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
          const amt = (Math.floor(Math.random() * 20) + 1) * 50;
          const m = Math.round((1.05 + Math.random() * 3) * 100) / 100;
          setSocialFeed(prev => [...prev.slice(-2), { user: u, amount: amt, mult: m }]);
        }, 1500);
      }
    }, 1000);
  };

  const handleCashOut = async (currentMult?: number) => {
    const m = currentMult ?? multiplier;
    if (gameState !== 'climbing' || cashedOutRef.current) return;
    
    setCashedOut(true);
    cashedOutRef.current = true;
    setIsAborting(true);
    
    playTone(180, 0.15, 'sawtooth', 0.3);

    const earned = Math.floor(betAmount * m);
    setEarnedTokens(earned);

    toast.success(`🚀 Sound barrier broken at ${m.toFixed(2)}x! +${earned - betAmount} tokens!`);
    playTone(523.25, 0.1, 'sine', 0.3);
    setTimeout(() => playTone(1046.50, 0.2, 'sine', 0.4), 80);
    vibrate([60, 30, 100]);

    setTimeout(() => setIsAborting(false), 800);

    const fb = balance + earned;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (earned - betAmount), xp: profile.xp + Math.floor(betAmount * 0.15) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: 1 });
      } catch (e) {
        console.error('Failed to update user after cashout:', e);
      }
    }
    updateProfile({ tokens: fb });
  };

  useEffect(() => () => {
    if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    if (socialIntervalRef.current) clearInterval(socialIntervalRef.current);
  }, []);

  const multColor = getMultColor(multiplier);

  const getScreenTremor = () => {
    if (gameState !== 'climbing') return 'none';
    const intensity = Math.min(5, multiplier * 0.4);
    const rx = (Math.random() - 0.5) * intensity;
    const ry = (Math.random() - 0.5) * intensity;
    return `translate3d(${rx}px, ${ry}px, 0px)`;
  };

  const handlePathUpdate = (p: THREE.Vector3) => {
    // Keep trail length reasonable
    setFlightPath(prev => {
       const newPath = [...prev, p.clone()];
       if (newPath.length > 50) newPath.shift();
       return newPath;
    });
  };

  return (
    <div 
      className={`flex flex-col lg:flex-row gap-6 p-4 max-w-7xl mx-auto min-h-[calc(100vh-120px)] items-stretch transition-all duration-300 border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl ${
        tinnitusActive ? 'filter saturate-30 contrast-125' : ''
      }`}
      style={{ transform: getScreenTremor(), background: 'linear-gradient(135deg, #0f1f3d 0%, #0a1628 50%, #0d1a30 100%)' }}
    >
      {timeDilationActive && (
        <div className="absolute inset-0 pointer-events-none z-10 shadow-[inset_0_0_80px_rgba(0,240,255,0.35)] animate-pulse" />
      )}

      {isAborting && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-white/30 transition-all duration-200" />
      )}

      <style>{`
        .hud-digital-readout {
          animation: hudPulse 1.8s infinite ease-in-out;
        }
        @keyframes hudPulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.8; }
        }
        .abort-switch-cover {
          transform-origin: top;
          transition: transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .abort-switch-cover.open {
          transform: rotateX(-120deg);
        }
        .chip-stack-3d {
          perspective: 200px;
        }
      `}</style>

      {/* Left bet control center */}
      <Card className="w-full lg:w-96 flex flex-col justify-between p-5 space-y-5 bg-slate-900/95 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300 uppercase tracking-widest">
              MISSION CONTROL 3D
            </h2>
            <ShieldAlert size={16} className="text-red-500 animate-pulse" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={gameState === 'climbing' || gameState === 'countdown'} />

          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">AUTO CASHOUT (MULT)</span>
            <div className="flex rounded-xl bg-slate-950 p-1.5 border border-slate-800">
              <input type="number" step="0.1" min="1.01" placeholder="Disabled"
                value={autoCashOut ?? ''}
                onChange={e => setAutoCashOut(e.target.value ? parseFloat(e.target.value) : null)}
                disabled={gameState === 'climbing' || gameState === 'countdown'}
                className="w-full bg-transparent border-0 outline-none text-sm font-mono text-cyan-300 px-3 py-1" />
              <span className="flex items-center pr-3 text-xs text-slate-500 font-bold">X</span>
            </div>
          </div>

          {gameState === 'climbing' && (
            <div className="text-center p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-0.5">NET WIN VALUE</p>
              <p className="text-2xl font-bold font-mono" style={{ color: multColor }}>
                +{(betAmount * multiplier).toFixed(0)} tokens
              </p>
            </div>
          )}

          <div className="chip-stack-3d flex justify-center gap-1 py-1">
            {Array.from({ length: Math.min(8, Math.ceil(betAmount / 50)) }).map((_, i) => (
              <div 
                key={i} 
                className="w-10 h-2 bg-gradient-to-r from-cyan-400 to-blue-600 rounded-sm shadow-md border-b-2 border-slate-950"
                style={{ transform: `rotateX(40deg) translateZ(${i * 3}px)` }}
              />
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {gameState === 'climbing' ? (
            <div className="space-y-2">
              <div 
                className="relative bg-slate-950 p-3 rounded-xl border border-slate-800 flex flex-col items-center justify-center cursor-pointer"
                onMouseEnter={() => setSafetyCoverOpen(true)}
                onMouseLeave={() => setSafetyCoverOpen(false)}
                onClick={() => setSafetyCoverOpen(!safetyCoverOpen)}
              >
                <div className={`abort-switch-cover absolute inset-x-0 top-0 h-6 bg-red-600 rounded-t-xl flex items-center justify-center text-[9px] font-bold text-white tracking-widest ${
                  safetyCoverOpen ? 'open' : ''
                }`}>
                  SAFETY SHIELD ACTIVE
                </div>
                <div className="h-6" /> 
                <Button 
                  variant="neon" 
                  size="lg" 
                  className="w-full font-bold py-3.5 text-xs rounded-xl disabled:opacity-30 flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 border border-cyan-400/40" 
                  disabled={cashedOut || !safetyCoverOpen} 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCashOut();
                  }}
                >
                  {cashedOut ? `SECURED: ${earnedTokens} tokens` : 'TRIGGER EMERGENCY ABORT'}
                </Button>
              </div>
              <p className="text-[9px] text-slate-400 text-center uppercase tracking-wider font-bold">
                *Hover cover to lift emergency release shield
              </p>
            </div>
          ) : (
            <Button 
              variant="neon" 
              size="lg" 
              className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" 
              disabled={betAmount <= 0 || betAmount > balance || gameState === 'countdown'} 
              onClick={handleStartGame}
            >
              {gameState === 'crashed' ? 'RELAUNCH SPACECRAFT' : 'Bets Locked: Start Launch'}
            </Button>
          )}
          <Button variant="ghost" className="w-full text-[10px] text-slate-400 hover:text-slate-400 py-1.5" onClick={onClose}>
            Disconnect Console
          </Button>
        </div>
      </Card>

      {/* 3D Holo projection viewport screen */}
      <Card className="flex-1 flex flex-col relative min-h-[500px] bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden z-20">
        
        <div className="absolute top-4 left-4 right-4 flex justify-between z-30 hud-digital-readout pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.h2 
              key={multiplier.toFixed(2)} 
              initial={{ opacity: 0.8, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }}
              className="text-5xl font-black font-mono tracking-tighter filter drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]" 
              style={{ color: multColor }}
            >
              {multiplier.toFixed(2)}x
            </motion.h2>
          </AnimatePresence>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
            <AlertTriangle size={11} className="text-red-500 animate-pulse" />
            <span>CRITICAL TRAJECTORY ACTIVE</span>
          </div>
        </div>

        {gameState === 'countdown' && (
          <div className="absolute inset-0 bg-transparent z-30 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-slate-950/40 backdrop-blur-md px-12 py-8 rounded-3xl border border-cyan-400/20 shadow-[0_0_40px_rgba(0,240,255,0.1)] flex flex-col items-center">
              <p className="text-sm uppercase tracking-widest text-orange-400 font-bold animate-pulse mb-2">IGNITION SEQUENCE</p>
              <motion.h3 
                key={countdownTicks}
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-300 font-mono filter drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]"
              >
                T-{countdownTicks}
              </motion.h3>
            </div>
          </div>
        )}

        <div className="absolute inset-0 z-0">
           <GameEngine3D 
              enablePhysics={true} // ALWAYS enable dynamics so RigidBody doesn't crash on mount
              cameraPosition={[0, 0, 15]}
              enablePostProcessing={true}
           >
              <GridEnvironment crashed={gameState === 'crashed'} />
              
              <RocketFlightPath points={flightPath} crashed={gameState === 'crashed'} />
              <Rocket3D 
                multiplier={multiplier} 
                crashed={gameState === 'crashed'} 
                elapsed={elapsedSeconds} 
                onPathUpdate={handlePathUpdate}
                gameState={gameState}
              />
              
              {gameState === 'crashed' && flightPath.length > 0 && (
                <mesh position={flightPath[flightPath.length - 1]}>
                  <sphereGeometry args={[1.5, 32, 32]} />
                  <meshBasicMaterial color="#ff4400" transparent opacity={0.6} blending={THREE.AdditiveBlending} />
                  <pointLight color="#ff0000" intensity={10} distance={20} />
                </mesh>
              )}
              
              <Html center position={[0, 0, 0]} zIndexRange={[100, 0]} className="pointer-events-none">
                <AnimatePresence>
                  {gameState === 'crashed' && (
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center justify-center w-[400px]"
                    >
                      <div className="text-center bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-red-500/30">
                        <p className="text-4xl font-black text-red-500 drop-shadow-[0_0_12px_rgba(239,68,68,0.8)]">💥 CORE RUPTURED</p>
                        <p className="text-sm text-red-300 font-mono mt-1">Telemetry terminated at {crashPointRef.current}x</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Html>
           </GameEngine3D>
        </div>

        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 space-y-1 min-h-[90px] border-t border-slate-900/60 bg-slate-950/80 backdrop-blur-sm z-30">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest py-1">Telemetry feed</p>
          <AnimatePresence>
            {socialFeed.map((e, i) => (
              <motion.div key={e.user+i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-between text-[10px] text-slate-400 font-mono leading-relaxed">
                <span className="text-cyan-300">🛰️ {e.user}</span>
                <span>Aborted bet @ <span className="text-amber-400 font-bold">{e.mult}x</span></span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </Card>
    </div>
  );
}
