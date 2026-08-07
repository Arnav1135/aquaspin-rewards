import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Coins, Play, Square } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody, CuboidCollider, BallCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Html, Detailed } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import { triggerWinCelebration } from '@/lib/winCelebration';
import toast from 'react-hot-toast';

import { Difficulty, Rows, getMultiplierTable, generateColors } from './plinko/plinkoConfig';
import { generateOutcome } from './plinko/outcomeEngine';
import { getBiasImpulse, PathSteeringState } from './plinko/pathSteering';

function CameraAdjuster({ rows }: { rows: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const baseZ = Math.max(15, rows * 1.5);
    camera.position.z = aspect < 1 ? baseZ / aspect : baseZ;
    camera.updateProjectionMatrix();
  }, [camera, size, rows]);
  return null;
}

const PEG_RADIUS = 0.15;
const PEG_SPACING_X = 1.2;
const PEG_SPACING_Y = 0.8;

function PlinkoBucket({ style, x, bucketY, i, hitCount, isBigWin, numBuckets, onBallLanded }: { style: any, x: number, bucketY: number, i: number, hitCount: number, isBigWin: boolean, numBuckets: number, onBallLanded: (idx: number, ballId: string) => void }) {
  const [blinking, setBlinking] = useState(false);
  
  useEffect(() => {
    if (hitCount > 0) {
      setBlinking(true);
      const timer = setTimeout(() => setBlinking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [hitCount]);

  return (
    <group position={[x, bucketY, 0]}>
      <RigidBody 
        type="fixed" 
        sensor 
        onIntersectionEnter={(e) => {
          if (e.other.rigidBodyObject?.userData?.isBall) {
            onBallLanded(i, e.other.rigidBodyObject.name);
          }
        }}
      >
        <CuboidCollider args={[PEG_SPACING_X / 2 - 0.1, 0.4, 0.5]} position={[0, -0.2, 0]} />
      </RigidBody>
      <Html center position={[0, -0.3, 0]} className="pointer-events-none" style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
        <div className="relative">
          {isBigWin && (
            <div className="absolute inset-0 z-0 animate-ping rounded-full bg-yellow-400 opacity-75 blur-md" style={{ transform: 'scale(3)' }}></div>
          )}
          <div 
            className={`relative rounded font-bold whitespace-nowrap shadow-lg transition-all duration-300 ${blinking ? 'scale-125 ring-2 ring-yellow-400 brightness-110 z-10' : 'scale-100 z-0'} ${isBigWin ? 'animate-bounce shadow-[0_0_30px_rgba(250,204,21,0.8)]' : ''}`}
            style={{ 
              backgroundColor: style.backgroundColor, 
              color: style.color, 
              boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.3)',
              fontSize: numBuckets >= 15 ? '7px' : numBuckets > 12 ? '9px' : '12px',
              padding: numBuckets >= 15 ? '2px 2px' : numBuckets > 12 ? '4px 4px' : '5px 8px',
              transform: numBuckets >= 15 ? 'scale(0.85)' : 'none'
            }}
          >
            {style.multiplier}x
          </div>
        </div>
      </Html>
      
      {/* Visible divider wall perfectly aligned under the peg above it to cleanly separate buckets */}
      <RigidBody type="fixed" position={[PEG_SPACING_X/2, -0.2, 0]} restitution={0.4} friction={0}>
         <CuboidCollider args={[0.02, 0.5, 0.25]} />
         <BallCollider args={[0.04]} position={[0, 0.5, 0]} />
         <mesh position={[0, 0, 0]}>
           <boxGeometry args={[0.04, 1.0, 0.4]} />
           <meshStandardMaterial color="#CBD5E1" roughness={0.5} />
         </mesh>
         <mesh position={[0, 0.5, 0]}>
           <sphereGeometry args={[0.04, 16, 16]} />
           <meshStandardMaterial color="#CBD5E1" roughness={0.5} />
         </mesh>
      </RigidBody>
    </group>
  );
}

function PlinkoBoard({ rows, difficulty, onBallLanded, bucketHits, bigWinIdx }: { rows: Rows, difficulty: Difficulty, onBallLanded: (idx: number, ballId: string) => void, bucketHits: Record<number, number>, bigWinIdx?: number | null }) {
  const multipliers = useMemo(() => getMultiplierTable(difficulty, rows), [difficulty, rows]);
  const colors = useMemo(() => generateColors(difficulty, multipliers), [difficulty, multipliers]);

  const pegPositions = useMemo(() => {
    const positions: { id: string, pos: THREE.Vector3 }[] = [];
    for (let r = 0; r < rows; r++) {
      const cols = r + 3;
      const startX = -((cols - 1) * PEG_SPACING_X) / 2;
      for (let c = 0; c < cols; c++) {
        positions.push({ id: `peg-${r}-${c}`, pos: new THREE.Vector3(startX + c * PEG_SPACING_X, -r * PEG_SPACING_Y, 0) });
      }
    }
    return positions;
  }, [rows]);

  const numBuckets = multipliers.length;
  const startBucketX = -((numBuckets - 1) * PEG_SPACING_X) / 2;
  const bucketY = -rows * PEG_SPACING_Y;

  return (
    <group position={[0, rows * 0.4, 0]}>
      {/* Background board (No RigidBody to prevent ball scraping against it) */}
      <mesh position={[0, -rows/2 * PEG_SPACING_Y, -0.5]} receiveShadow>
        <boxGeometry args={[(rows + 2) * PEG_SPACING_X + 4, (rows + 2) * PEG_SPACING_Y + 4, 0.5]} />
        {/* Light Mode Board Background */}
        <meshStandardMaterial color="#F0F4F8" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Individual Pegs */}
      {pegPositions.map((peg) => (
        <RigidBody 
          key={peg.id} 
          type="fixed" 
          position={peg.pos}
          restitution={0.3}
          friction={0.1}
          userData={{ isPeg: true }}
        >
          <BallCollider args={[PEG_RADIUS]} />
          <Detailed distances={[0, 15, 30]}>
            {/* High Poly (LOD 0) - Zoomed In */}
            <mesh receiveShadow castShadow rotation={[Math.PI / 2, 0, 0]}>
               <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.8, 32]} />
               <meshPhysicalMaterial color="#94A3B8" roughness={0.1} metalness={0.9} clearcoat={1.0} />
            </mesh>
            
            {/* Medium Poly (LOD 1) - Mid Distance */}
            <mesh receiveShadow castShadow rotation={[Math.PI / 2, 0, 0]}>
               <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.8, 16]} />
               <meshStandardMaterial color="#94A3B8" roughness={0.2} metalness={0.8} />
            </mesh>
            
            {/* Low Poly (LOD 2) - Zoomed Out */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
               <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.8, 6]} />
               <meshStandardMaterial color="#94A3B8" roughness={0.5} metalness={0.5} />
            </mesh>
          </Detailed>
        </RigidBody>
      ))}

      {/* Side Walls to funnel balls inside */}
      <RigidBody type="fixed" position={[-((numBuckets * PEG_SPACING_X) / 2 + 0.5), -rows/2 * PEG_SPACING_Y, 0]} restitution={0.2} friction={0.1}>
        <CuboidCollider args={[0.5, rows * PEG_SPACING_Y, 1]} />
      </RigidBody>
      <RigidBody type="fixed" position={[((numBuckets * PEG_SPACING_X) / 2 + 0.5), -rows/2 * PEG_SPACING_Y, 0]} restitution={0.2} friction={0.1}>
        <CuboidCollider args={[0.5, rows * PEG_SPACING_Y, 1]} />
      </RigidBody>

      {/* Buckets/Sensors */}
      {colors.map((style, i) => {
        const x = startBucketX + i * PEG_SPACING_X;
        return (
          <PlinkoBucket 
            key={`bucket-${i}`} 
            style={style} 
            x={x} 
            bucketY={bucketY} 
            i={i} 
            hitCount={bucketHits[i] || 0}
            isBigWin={bigWinIdx === i}
            numBuckets={numBuckets}
            onBallLanded={onBallLanded}
          />
        );
      })}
    </group>
  );
}

// Ensure importing interactionGroups from rapier if we use it, otherwise use bitmasks directly.
// In Rapier, collisionGroups is a 32-bit integer: (memberships << 16) | filters
// If all balls are in group 1, and pegs/buckets are in group 0 (default, meaning all bits 1).
// To make balls ignore other balls: membership=1, filter=~1 (meaning everything except 1)
// memberships = 0x0002, filter = 0xFFFD -> (0x0002 << 16) | 0xFFFD = 0x0002FFFD
const BALL_COLLISION_GROUP = 0x0002FFFD;

function PlinkoBall({ id, position, steeringState, onDespawn }: { id: string, position: [number, number, number], steeringState: PathSteeringState, onDespawn: (id: string) => void }) {
  const rbRef = useRef<any>(null);
  const steerRef = useRef<PathSteeringState>({ ...steeringState });
  const lastHitTime = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDespawn(id);
    }, 15000);
    return () => clearTimeout(timer);
  }, [id, onDespawn]);

  // Give it an initial spin to prevent sticking
  useEffect(() => {
    if (rbRef.current) {
      rbRef.current.applyTorqueImpulse({ x: 0, y: 0, z: (Math.random() - 0.5) * 0.1 }, true);
    }
  }, []);

  const handleCollision = (e: any) => {
    if (e.other.rigidBodyObject?.userData?.isPeg) {
      const now = Date.now();
      // debounce multiple collisions on the same peg slightly
      if (now - lastHitTime.current < 50) return;
      lastHitTime.current = now;

      if (rbRef.current) {
        const impulse = getBiasImpulse(steerRef.current);
        rbRef.current.applyImpulse(impulse, true);
        rbRef.current.applyTorqueImpulse({ x: 0, y: 0, z: (Math.random() - 0.5) * 0.05 }, true);
      }
    }
  };

  return (
    <RigidBody 
      ref={rbRef} 
      position={position} 
      colliders="ball" 
      restitution={0.3} 
      friction={0}
      ccd={true}
      userData={{ isBall: true }}
      name={id}
      enabledTranslations={[true, true, false]}
      onCollisionEnter={handleCollision}
      collisionGroups={BALL_COLLISION_GROUP}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial color="#FF6B6B" emissive="#FF6B6B" emissiveIntensity={3.5} metalness={0.2} roughness={0.1} />
      </mesh>
    </RigidBody>
  );
}

export function PlinkoGame({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useAuthStore();
  
  // Game Config
  const [betAmount, setBetAmount] = useState(50);
  const [risk, setRisk] = useState<Difficulty>('medium');
  const [rows, setRows] = useState<Rows>(12);

  // Queued Config
  const [queuedRisk, setQueuedRisk] = useState<Difficulty | null>(null);
  const [queuedRows, setQueuedRows] = useState<Rows | null>(null);
  
  // Active State
  const [balls, setBalls] = useState<{ id: string, bet: number, startX: number, steer: PathSteeringState, payout: number }[]>([]);
  const [bucketHits, setBucketHits] = useState<Record<number, number>>({});
  const [bigWinIdx, setBigWinIdx] = useState<number | null>(null);
  
  // Autobet State
  const [autobetMode, setAutobetMode] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoBetsRemaining, setAutoBetsRemaining] = useState<number>(0); // 0 = infinite
  const [autoTotalConfigured, setAutoTotalConfigured] = useState<number>(0);
  const [autoNetProfit, setAutoNetProfit] = useState(0);
  const [autoTotalWagered, setAutoTotalWagered] = useState(0);
  const [stopOnProfit, setStopOnProfit] = useState<string>('');
  const [stopOnLoss, setStopOnLoss] = useState<string>('');
  const [onWinRule, setOnWinRule] = useState<'reset' | 'increase'>('reset');
  const [onWinPct, setOnWinPct] = useState<string>('');
  const [onLossRule, setOnLossRule] = useState<'reset' | 'increase'>('reset');
  const [onLossPct, setOnLossPct] = useState<string>('');
  
  const isTransitioning = (queuedRisk !== null || queuedRows !== null) && balls.length > 0;
  
  useEffect(() => {
    // If balls have cleared and we have a queued config, apply it
    if (balls.length === 0) {
      if (queuedRisk !== null) {
        setRisk(queuedRisk);
        setQueuedRisk(null);
      }
      if (queuedRows !== null) {
        setRows(queuedRows);
        setQueuedRows(null);
      }
    }
  }, [balls.length, queuedRisk, queuedRows]);
  
  const multipliers = useMemo(() => getMultiplierTable(risk, rows), [risk, rows]);
  const autoSessionRef = useRef({ running: false, currentBet: 50, remaining: 0, net: 0, wagered: 0, activeBallsCount: 0 });

  const stopAutobet = useCallback((reason: string) => {
    setAutoRunning(false);
    autoSessionRef.current.running = false;
    toast(`Autobet Stopped: ${reason}`);
  }, []);

  const spawnBall = async (bet: number) => {
    if (!profile) return false;
    
    // RNG Generation
    const clientSeed = 'aqua-' + Math.random().toString(36).substring(7);
    const serverSeed = 'server-' + Date.now(); // In real app, this is pre-committed
    const nonce = Date.now();
    
    const outcome = await generateOutcome(serverSeed, clientSeed, nonce, rows);
    const payout = bet * multipliers[outcome.targetBucket];
    
    const id = Math.random().toString(36).substr(2, 9);
    // Drop strictly from center (with a microscopic jitter to avoid perfect infinite balancing on the first peg)
    const startX = (Math.random() - 0.5) * 0.02;
    
    const steer: PathSteeringState = {
      path: outcome.path,
      currentRow: 0,
      targetBucket: outcome.targetBucket,
      totalRows: rows
    };
    
    setBalls(prev => [...prev, { id, bet, startX, steer, payout }]);
    return true;
  };

  const handleDrop = async () => {
    if (autoRunning || isTransitioning) return;
    if (!profile || profile.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      const newBalance = profile.tokens - betAmount;
      (updateProfile as any)({ tokens: newBalance });
      await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);
      
      audio.play('plinko', 'ball-drop-launch');
      await spawnBall(betAmount);
    } catch (e) {
      console.error(e);
      toast.error('Transaction failed');
    }
  };

  const handleStartAutobet = () => {
    if (isTransitioning) return;
    if (!profile || profile.tokens < betAmount) {
      toast.error('Insufficient tokens to start autobet');
      return;
    }
    
    setAutoRunning(true);
    setAutoNetProfit(0);
    setAutoTotalWagered(0);
    
    autoSessionRef.current = {
      running: true,
      currentBet: betAmount,
      remaining: autoTotalConfigured,
      net: 0,
      wagered: 0,
      activeBallsCount: 0
    };
    
    // Kick off loop
    runAutobetLoop();
  };
  
  const runAutobetLoop = async () => {
    const s = autoSessionRef.current;
    if (!s.running) return;
    
    // Don't spawn if we have too many active balls (throttle)
    if (s.activeBallsCount >= 5) {
      setTimeout(runAutobetLoop, 200);
      return;
    }
    
    if (s.remaining === 0 && autoTotalConfigured !== 0) {
      stopAutobet("Completed");
      return;
    }
    
    const currentProf = profile?.tokens || 0;
    if (currentProf < s.currentBet) {
      stopAutobet("Insufficient balance");
      return;
    }
    
    // Deduct
    const newBal = currentProf - s.currentBet;
    (updateProfile as any)({ tokens: newBal });
    
    // Spawn
    s.activeBallsCount++;
    await spawnBall(s.currentBet);
    
    s.wagered += s.currentBet;
    s.net -= s.currentBet;
    setAutoTotalWagered(s.wagered);
    setAutoNetProfit(s.net);
    
    if (autoTotalConfigured > 0) {
      s.remaining--;
      setAutoBetsRemaining(s.remaining);
    }
    
    if (s.running) {
      setTimeout(runAutobetLoop, 800); // interval between drops
    }
  };

  const removeBall = useCallback((id: string) => {
    setBalls(prev => prev.filter(b => b.id !== id));
    autoSessionRef.current.activeBallsCount = Math.max(0, autoSessionRef.current.activeBallsCount - 1);
  }, []);

  const handleBallLanded = useCallback(async (bucketIdx: number, ballId: string) => {
    const ball = balls.find(b => b.id === ballId);
    if (!ball) return;
    
    removeBall(ballId);
    
    // Trust physics outcome as requested
    setBucketHits(prev => ({ ...prev, [bucketIdx]: (prev[bucketIdx] || 0) + 1 }));
    
    const mult = multipliers[bucketIdx];
    const winAmount = ball.bet * mult;
    
    if (autoSessionRef.current.running) {
      autoSessionRef.current.net += winAmount;
      setAutoNetProfit(autoSessionRef.current.net);
      
      const sp = Number(stopOnProfit);
      if (sp && autoSessionRef.current.net >= sp) {
        stopAutobet("Profit target reached");
      }
      const sl = Number(stopOnLoss);
      if (sl && autoSessionRef.current.net <= -sl) {
        stopAutobet("Loss limit reached");
      }
      
      // Next bet logic
      if (mult > 1) { // win
        autoSessionRef.current.currentBet = onWinRule === 'reset' ? betAmount : autoSessionRef.current.currentBet * (1 + Number(onWinPct) / 100);
      } else { // loss
        autoSessionRef.current.currentBet = onLossRule === 'reset' ? betAmount : autoSessionRef.current.currentBet * (1 + Number(onLossPct) / 100);
      }
      // Clamp bet 
      autoSessionRef.current.currentBet = Math.min(5000, Math.max(10, autoSessionRef.current.currentBet));
    }
    
    if (winAmount > 0) {
      if (mult >= 10) {
        setBigWinIdx(bucketIdx);
        setTimeout(() => setBigWinIdx(null), 1500);
        // Dynamic sound scaling for huge wins
        audio.play('plinko', 'big-win-low');
        setTimeout(() => audio.play('plinko', 'big-win-mid'), 100);
        setTimeout(() => audio.play('plinko', 'big-win-high'), 200);
        
        triggerWinCelebration(mult >= 100 ? 'mega' : mult >= 25 ? 'large' : 'medium');
      } else {
        audio.play('plinko', 'bucket-landing', { multiplier: mult });
      }
      
      if (mult >= 5) vibrate(100);
      
      try {
        const { data: currentData } = await (supabase.from('users') as any).select('tokens').eq('id', profile!.id).single();
        if (currentData) {
          const newBalance = currentData.tokens + winAmount;
          (updateProfile as any)({ tokens: newBalance });
          await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile!.id);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [balls, multipliers, profile, updateProfile, removeBall, stopAutobet, stopOnProfit, stopOnLoss]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/40 backdrop-blur-3xl">
      <Card className="relative w-full max-w-5xl h-[85vh] flex flex-col md:flex-row gap-0 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-200/60 bg-white/70 backdrop-blur-2xl rounded-3xl">
        
        {/* Left Side: 3D Canvas */}
        <div className="relative flex-1 h-[50vh] md:h-full bg-slate-100/50 overflow-hidden shadow-inner">
          <GameEngine3D 
            enablePhysics={true} 
            enablePostProcessing={true} // Enabled for premium Bloom/Vignette upgrades
            cameraPosition={[0, 0, Math.max(15, rows * 1.4)]}
          >
            <ambientLight intensity={1.2} />
            <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
            <CameraAdjuster rows={rows} />
            <PlinkoBoard key={`${rows}-${risk}`} rows={rows} difficulty={risk} onBallLanded={handleBallLanded} bucketHits={bucketHits} bigWinIdx={bigWinIdx} />
            
            {balls.map(ball => (
              <PlinkoBall 
                key={ball.id} 
                id={ball.id} 
                position={[ball.startX, rows > 12 ? 9 : 7, 0]} 
                steeringState={ball.steer}
                onDespawn={removeBall} 
              />
            ))}
          </GameEngine3D>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 text-slate-500 bg-white/50 hover:bg-white shadow-sm rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 p-6 flex flex-col bg-white border-l border-slate-200 h-[35vh] md:h-full overflow-y-auto">
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
              <button 
                onClick={() => !autoRunning && setAutobetMode(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${!autobetMode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'} ${autoRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Manual
              </button>
              <button 
                onClick={() => !autoRunning && setAutobetMode(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${autobetMode ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'} ${autoRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Auto
              </button>
            </div>
            
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-200 shadow-sm">
              <Coins size={14} className="text-yellow-500" />
              <span className="text-sm font-bold text-slate-700">{profile?.tokens.toLocaleString()}</span>
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className={autoRunning ? 'opacity-50 pointer-events-none transition-opacity' : ''}>
              <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={5000} disabled={autoRunning} />
            </div>

            <div className={`space-y-4 ${autoRunning ? 'opacity-50 pointer-events-none transition-opacity' : ''}`}>
              <div>
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-widest">Risk</label>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
                  {(['low', 'medium', 'high'] as Difficulty[]).map(r => (
                    <button
                      key={r}
                      onClick={() => balls.length > 0 ? setQueuedRisk(r) : setRisk(r)}
                      disabled={autoRunning}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all capitalize ${(queuedRisk || risk) === r ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400 hover:text-slate-600'} ${queuedRisk === r ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-2 block uppercase tracking-widest">Rows</label>
                <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner overflow-x-auto">
                  {([8, 9, 10, 11, 12, 13, 14] as Rows[]).map(r => (
                    <button
                      key={r}
                      onClick={() => balls.length > 0 ? setQueuedRows(r) : setRows(r)}
                      disabled={autoRunning}
                      className={`min-w-[32px] flex-1 py-1.5 mx-0.5 text-xs font-bold rounded-lg transition-all ${(queuedRows || rows) === r ? 'bg-white text-slate-800 shadow-md' : 'text-slate-400 hover:text-slate-600'} ${queuedRows === r ? 'ring-2 ring-blue-300' : ''}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {autobetMode && (
              <div className={`space-y-4 pt-4 border-t border-slate-100 ${autoRunning ? 'opacity-50 pointer-events-none' : ''}`}>
                <div>
                  <label className="text-xs text-slate-400 font-bold mb-1 block">Number of Bets (0 = ∞)</label>
                  <input type="number" value={autoTotalConfigured} onChange={e => setAutoTotalConfigured(Number(e.target.value))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 transition-colors" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">On Win</label>
                    <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <select value={onWinRule} onChange={e => setOnWinRule(e.target.value as any)} className="bg-transparent text-xs font-medium text-slate-700 outline-none w-full">
                        <option value="reset">Reset</option>
                        <option value="increase">Increase %</option>
                      </select>
                    </div>
                    {onWinRule === 'increase' && (
                      <input type="number" value={onWinPct} onChange={e => setOnWinPct(e.target.value)} placeholder="%" className="w-full mt-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none" />
                    )}
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">On Loss</label>
                    <div className="flex gap-1 bg-slate-50 border border-slate-200 rounded-lg p-1">
                      <select value={onLossRule} onChange={e => setOnLossRule(e.target.value as any)} className="bg-transparent text-xs font-medium text-slate-700 outline-none w-full">
                        <option value="reset">Reset</option>
                        <option value="increase">Increase %</option>
                      </select>
                    </div>
                    {onLossRule === 'increase' && (
                      <input type="number" value={onLossPct} onChange={e => setOnLossPct(e.target.value)} placeholder="%" className="w-full mt-1 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs outline-none" />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Stop on Profit</label>
                    <input type="number" value={stopOnProfit} onChange={e => setStopOnProfit(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold mb-1 block">Stop on Loss</label>
                    <input type="number" value={stopOnLoss} onChange={e => setStopOnLoss(e.target.value)} placeholder="0.00" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none" />
                  </div>
                </div>
              </div>
            )}
            
            {autoRunning && (
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Profit</span>
                  <span className={`font-bold ${autoNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {autoNetProfit >= 0 ? '+' : ''}{autoNetProfit.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Wagered</span>
                  <span className="font-bold text-slate-700">{autoTotalWagered}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">Bets Left</span>
                  <span className="font-bold text-slate-700">{autoTotalConfigured === 0 ? '∞' : autoBetsRemaining}</span>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6">
            {!autobetMode ? (
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                onClick={handleDrop}
                disabled={isTransitioning}
                className="py-4 text-lg font-bold bg-blue-500 hover:bg-blue-600 text-white shadow-xl shadow-blue-500/20 border-none rounded-xl disabled:opacity-50"
              >
                {isTransitioning ? 'Transitioning...' : 'Drop Ball'}
              </Button>
            ) : autoRunning ? (
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                onClick={() => stopAutobet("Manual stop")}
                className="py-4 text-lg font-bold bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20 border-none rounded-xl flex items-center justify-center gap-2"
              >
                <Square fill="currentColor" size={18} /> Stop Autobet
              </Button>
            ) : (
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth 
                onClick={handleStartAutobet}
                className="py-4 text-lg font-bold bg-green-500 hover:bg-green-600 text-white shadow-xl shadow-green-500/20 border-none rounded-xl flex items-center justify-center gap-2"
              >
                <Play fill="currentColor" size={18} /> Start Autobet
              </Button>
            )}
          </div>
        </div>

      </Card>
    </div>
  );
}
