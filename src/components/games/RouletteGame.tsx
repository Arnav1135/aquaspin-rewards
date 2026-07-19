import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Flame } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface RouletteGameProps { onClose: () => void; }
type BetType = 'red' | 'black' | 'green' | null;
type WheelTile = { num: number; color: 'red' | 'black' | 'green' };

const WHEEL_TILES: WheelTile[] = [
  { num: 0, color: 'green' }, { num: 32, color: 'red' }, { num: 15, color: 'black' },
  { num: 19, color: 'red' }, { num: 4, color: 'black' }, { num: 21, color: 'red' },
  { num: 2, color: 'black' }, { num: 25, color: 'red' }, { num: 17, color: 'black' },
  { num: 34, color: 'red' }, { num: 6, color: 'black' }, { num: 27, color: 'red' },
  { num: 13, color: 'black' }, { num: 36, color: 'red' }, { num: 11, color: 'black' },
  { num: 30, color: 'red' }, { num: 8, color: 'black' }, { num: 23, color: 'red' },
  { num: 10, color: 'black' }, { num: 5, color: 'red' }, { num: 24, color: 'black' },
  { num: 16, color: 'red' }, { num: 33, color: 'black' }, { num: 1, color: 'red' },
  { num: 20, color: 'black' }, { num: 14, color: 'red' }, { num: 31, color: 'black' },
  { num: 9, color: 'red' }, { num: 22, color: 'black' }, { num: 18, color: 'red' },
  { num: 29, color: 'black' }, { num: 7, color: 'red' }, { num: 28, color: 'black' },
  { num: 12, color: 'red' }, { num: 35, color: 'black' }, { num: 3, color: 'red' },
  { num: 26, color: 'black' }
];

const SECTOR_ANGLE = (Math.PI * 2) / 37;

// --- 3D Components ---

function RouletteWheel3D({ spinning, finalRotation, onStopped }: { spinning: boolean, finalRotation: number | null, onStopped: () => void }) {
  const wheelRef = useRef<any>(null);
  const currentRotation = useRef(0);
  const velocity = useRef(0);
  const state = useRef<'idle' | 'accelerating' | 'spinning' | 'decelerating'>('idle');
  
  useEffect(() => {
    if (spinning) {
      state.current = 'accelerating';
    } else if (state.current !== 'idle') {
      state.current = 'idle';
    }
  }, [spinning]);

  useFrame((_, delta) => {
    if (!wheelRef.current) return;
    
    if (state.current === 'accelerating') {
      velocity.current = THREE.MathUtils.lerp(velocity.current, 15, delta * 2);
      if (velocity.current > 14) state.current = 'spinning';
    } else if (state.current === 'spinning' && finalRotation !== null) {
      state.current = 'decelerating';
    } else if (state.current === 'decelerating' && finalRotation !== null) {
      // Very basic ease out to target rotation
      velocity.current = THREE.MathUtils.lerp(velocity.current, 0, delta * 0.8);
      
      // Calculate angular distance to target
      let diff = (finalRotation - (currentRotation.current % (Math.PI * 2)));
      while (diff < 0) diff += Math.PI * 2;
      
      if (velocity.current < 0.5 && diff < 0.1) {
        velocity.current = 0;
        currentRotation.current = finalRotation;
        state.current = 'idle';
        onStopped();
      }
    } else if (state.current === 'idle' && !spinning) {
      velocity.current = 1.0; // Slow idle spin
    }

    currentRotation.current += velocity.current * delta;
    
    wheelRef.current.setNextKinematicRotation(
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, currentRotation.current, 0))
    );
  });

  return (
    <RigidBody ref={wheelRef} type="kinematicPosition" position={[0, 0, 0]} colliders="hull">
      {/* Base Wood Rim */}
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.4, 0.4, 64]} />
        <meshStandardMaterial color="#2b1105" metalness={0.1} roughness={0.7} />
      </mesh>
      
      {/* Inner metal slope */}
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[4, 3, 0.2, 64]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
      </mesh>
      
      {/* Center hub */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1, 1.2, 0.4, 32]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Pockets */}
      {WHEEL_TILES.map((tile, i) => {
        const angle = i * SECTOR_ANGLE;
        const color = tile.color === 'red' ? '#b91c1c' : tile.color === 'green' ? '#047857' : '#1e2d45';
        
        return (
          <group key={i} rotation={[0, angle, 0]}>
            {/* Pocket base */}
            <mesh position={[0, 0.1, -3.5]} receiveShadow>
              <boxGeometry args={[0.55, 0.1, 1]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            
            {/* Divider Fret */}
            <mesh position={[0.3, 0.2, -3.5]} receiveShadow castShadow rotation={[0, SECTOR_ANGLE / 2, 0]}>
              <boxGeometry args={[0.04, 0.2, 1]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </RigidBody>
  );
}

function BallDrop({ spinning }: { spinning: boolean, targetAngle: number | null }) {
  const ballRef = useRef<any>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (spinning && !active) {
      setActive(true);
      if (ballRef.current) {
        ballRef.current.setTranslation({ x: 0, y: 1.5, z: 3.8 }, true);
        ballRef.current.setLinvel({ x: -10, y: 0, z: -5 }, true);
      }
    } else if (!spinning && active) {
      // The game handles stopping logic. Keep ball where it is.
    }
  }, [spinning, active]);

  return (
    <>
      <RigidBody 
        ref={ballRef}
        type={spinning ? 'dynamic' : 'fixed'} // lock in place when not spinning
        position={[0, 1.5, 3.8]} 
        colliders="ball" 
        restitution={0.4} 
        friction={0.1}
        mass={0.1}
        onCollisionEnter={() => {
          if (spinning) (playTone as any)(600 + Math.random() * 200, 'sine', 0.05);
        }}
      >
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[0.12, 32, 32]} />
          <meshStandardMaterial color="#fffff0" metalness={0.1} roughness={0.1} />
        </mesh>
      </RigidBody>
      
      {/* Invisible outer wall to keep ball inside */}
      <RigidBody type="fixed" colliders="hull" position={[0, 0.5, 0]}>
        <mesh visible={false}>
           <cylinderGeometry args={[4.2, 4.2, 1, 32, 1, true]} />
        </mesh>
      </RigidBody>
    </>
  );
}

// --- Main Game Component ---

export function RouletteGame({ onClose }: RouletteGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [betSelection, setBetSelection] = useState<BetType>(null);
  const [spinning, setSpinning] = useState(false);
  const [outcome, setOutcome] = useState<WheelTile | null>(null);
  const [win, setWin] = useState<boolean | null>(null);
  const [history, setHistory] = useState<string[]>(['R', 'B', 'R', 'G', 'B', 'R']);
  const actualBetRef = useRef(0);
  
  const [radialShimmer, setRadialShimmer] = useState(false);
  const [targetRotation, setTargetRotation] = useState<number | null>(null);

  const balance = profile?.tokens ?? 0;

  const handleSpin = async () => {
    if (!betSelection) { toast.error('Choose selection to place bet!'); return; }
    if (betAmount <= 0) { toast.error('Enter a valid bet!'); return; }
    if (spinning) return;
    
    const { profile: currentProfile, isOwner } = useAuthStore.getState();
    const freeTrials = currentProfile?.free_trials ?? 3;
    const isFreeTrial = !isOwner && !currentProfile?.has_deposited && freeTrials > 0;
    const outOfTrials = !isOwner && !currentProfile?.has_deposited && freeTrials <= 0;
    
    if (outOfTrials) { toast.error('Out of free trials! Deposit to play.'); return; }
    
    const actualBetAmount = isFreeTrial ? 0 : betAmount;
    actualBetRef.current = actualBetAmount;
    
    if (actualBetAmount > balance) { toast.error('Insufficient tokens!'); return; }
    
    if (isFreeTrial) {
      toast.success(`Free Trial Used! (${freeTrials - 1} left)`, { icon: '🎁' });
    }

    setSpinning(true);
    setOutcome(null);
    setWin(null);
    setTargetRotation(null);

    const nb = balance - actualBetAmount;
    if (currentProfile && !currentProfile.id.startsWith('guest')) {
      try { 
        await (supabase.from('users') as any).update({ tokens: nb }).eq('id', currentProfile.id);
      } catch (e) {
        console.error('Failed to update user balance:', e);
      }
    }
    
    (updateProfile as any)({ tokens: nb, ...(isFreeTrial ? { free_trials: freeTrials - 1 } : {}) });

    // Pick random pocket index
    const winIdx = Math.floor(Math.random() * 37);
    
    // Set target rotation so ball falls in pocket. 
    // Wheel zero is at angle 0. Pocket i is at i * SECTOR_ANGLE.
    // The ball drops at roughly z=3.8 (angle = 0 relative to wheel).
    const finalWheelAngle = (Math.PI * 2) - (winIdx * SECTOR_ANGLE);
    
    // Add multiple full rotations before stopping
    setTargetRotation(finalWheelAngle + (Math.PI * 2 * 3));
    
    (playTone as any)(280, 'sine', 0.2);
  };

  const handleWheelStopped = async () => {
    setSpinning(false);
    
    // We get the winning tile based on targetRotation math which was pre-calculated
    // For simplicity, we just recalculate based on the targetRotation we set
    if (targetRotation === null) return;
    
    const normalizedAngle = (Math.PI * 2) - (targetRotation % (Math.PI * 2));
    const winIdx = Math.round(normalizedAngle / SECTOR_ANGLE) % 37;
    const tile = WHEEL_TILES[winIdx];
    
    setOutcome(tile);
    const isWin = betSelection === tile.color;
    setWin(isWin);
    setHistory(prev => [...prev.slice(-14), tile.color === 'red' ? 'R' : tile.color === 'green' ? 'G' : 'B']);

    let earned = 0;
    if (isWin) {
      earned = tile.color === 'green' ? Math.floor(betAmount * 14) : Math.floor(betAmount * 2);
      toast.success(`🏆 Payout Secured! +${earned - betAmount} tokens!`, { icon: '🎡' });
      
      if (tile.color === 'green') {
        setRadialShimmer(true);
        setTimeout(() => setRadialShimmer(false), 2000);
        (playTone as any)(392, 'sine', 0.35);
        setTimeout(() => (playTone as any)(523, 'sine', 0.35), 100);
        vibrate([100, 50, 150, 50, 200]);
      } else {
        (playTone as any)(523.25, 'sine', 0.3);
        vibrate([50, 50, 100]);
      }
    } else {
      toast.error(`Outcome: ${tile.color} ${tile.num}. Lost bet.`);
      (playTone as any)(160, 'sawtooth', 0.2);
      vibrate(100);
    }

    const fb = (balance - actualBetRef.current) + earned;
    if (profile && !profile.id.startsWith('guest')) {
      try {
        await (supabase.from('users') as any).update({ tokens: fb, total_earned: profile.total_earned + (isWin ? earned - betAmount : 0), xp: profile.xp + Math.floor(betAmount * 0.1) }).eq('id', profile.id);
        await (supabase.from('game_stats') as any).upsert({ user_id: profile.id, games_played: 1, games_won: isWin ? 1 : 0 });
      } catch (e) {
        console.error('Failed to update user after spin:', e);
      }
    }
    (updateProfile as any)({ tokens: fb });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #1a0a0a 0%, #0a1a0a 50%, #0a0a1a 100%)' }}>
      {radialShimmer && (
        <div className="absolute inset-0 pointer-events-none z-30 bg-emerald-500/10 shadow-[inset_0_0_80px_rgba(16,185,129,0.4)] animate-pulse" />
      )}

      {/* Left controls panel */}
      <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/90 border border-slate-800 rounded-2xl shrink-0 z-20">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-emerald-400 to-slate-200 tracking-wider">
              MONTE CARLO 3D
            </h2>
            <Flame size={16} className="text-emerald-400" />
          </div>

          <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={spinning} />
          
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest font-mono">Select Sector Layout</span>
            <div className="flex flex-col gap-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={betSelection === 'red' ? 'neon' : 'ghost'}
                  disabled={spinning}
                  onClick={() => { setBetSelection('red'); (playTone as any)(400, 'sine', 0.1); }}
                  className={`py-3 rounded-lg text-xs font-bold transition-all ${
                    betSelection === 'red' 
                      ? 'border-red-500 bg-red-500/10 text-red-300 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  🔴 Red (2x)
                </Button>
                <Button 
                  variant={betSelection === 'black' ? 'neon' : 'ghost'}
                  disabled={spinning}
                  onClick={() => { setBetSelection('black'); (playTone as any)(400, 'sine', 0.1); }}
                  className={`py-3 rounded-lg text-xs font-bold transition-all ${
                    betSelection === 'black' 
                      ? 'border-slate-300 bg-slate-500/10 text-slate-300 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  ⚫ Black (2x)
                </Button>
              </div>
              <Button 
                variant={betSelection === 'green' ? 'neon' : 'ghost'}
                disabled={spinning}
                onClick={() => { setBetSelection('green'); (playTone as any)(400, 'sine', 0.1); }}
                className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all ${
                  betSelection === 'green' 
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                    : 'border-slate-800 text-slate-400'
                }`}
              >
                🟢 Green (14x)
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="neon" size="lg" className="w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20" disabled={spinning || !betSelection || betAmount <= 0 || betAmount > balance} onClick={handleSpin}>
            {spinning ? '🎡 WEAVING TENSION...' : 'SPIN CYLINDER'}
          </Button>
          <Button variant="ghost" className="w-full text-xs text-slate-500 hover:text-slate-400" onClick={onClose}>
            Close Salon
          </Button>
        </div>
      </Card>

      {/* Photorealistic mechanical wheel viewport */}
      <Card className="flex-1 flex flex-col items-center justify-between relative min-h-[440px] border border-slate-800 rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a0f0a 0%, #120a0a 50%, #1a0f08 100%)' }}>
        <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] text-slate-500 font-mono tracking-wider z-10">
          <HelpCircle size={10} className="text-cyan-400" />
          <span>FRENCH RULES ACTIVE</span>
        </div>

        <div className="absolute inset-0 z-0 cursor-move">
          <GameEngine3D 
            enablePhysics={true} 
            cameraPosition={[0, 6, 8]}
            enablePostProcessing={true}
          >
            {/* Tilt the wheel slightly to look better from above */}
            <group rotation={[-0.3, 0, 0]}>
               <RouletteWheel3D spinning={spinning} finalRotation={targetRotation} onStopped={handleWheelStopped} />
               <BallDrop spinning={spinning} targetAngle={targetRotation} />
            </group>
            
            {/* Overlay */}
            <Html center position={[0, -2, 4]} zIndexRange={[100, 0]} className="pointer-events-none">
                <div className="w-64 text-center">
                  <AnimatePresence>
                    {outcome && (
                      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="space-y-1 backdrop-blur-md bg-black/40 p-4 rounded-xl border border-white/10">
                        <h3 className={`text-3xl font-black font-display uppercase tracking-widest leading-none ${
                          outcome.color === 'red' ? 'text-red-500' : outcome.color === 'green' ? 'text-emerald-400' : 'text-slate-300'
                        }`}>
                          {outcome.color} {outcome.num}
                        </h3>
                        {win !== null && (
                          <p className={`text-[12px] font-bold uppercase tracking-wider ${win ? 'text-emerald-400' : 'text-red-500'}`}>
                            {win ? '🎉 payout secured' : 'table sweep'}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
            </Html>
          </GameEngine3D>
        </div>

        {/* Bead road statistics floating at bottom */}
        <div className="absolute bottom-4 left-0 right-0 w-full space-y-1 z-10 pointer-events-none">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest font-mono text-center">Session Statistics</p>
          <div className="flex justify-center gap-1 py-1">
            {history.slice(-20).map((h, i) => (
              <motion.span 
                key={i} 
                initial={{ scale: 0 }} 
                animate={{ scale: 1 }}
                className={`w-4 h-4 rounded-full border text-[8px] font-black font-mono flex items-center justify-center ${
                  h === 'R' 
                    ? 'bg-red-950/60 border-red-500/40 text-red-400' 
                    : h === 'G' 
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400' 
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {h}
              </motion.span>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
