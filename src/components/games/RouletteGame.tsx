import { ResponsiveCanvas as Canvas } from '@/components/ui/ResponsiveCanvas';
import { useFrame, useThree } from '@react-three/fiber';
import { QualityManager } from '@/engine/aaa/QualityManager';
import { PostFXManager } from '@/engine/aaa/PostFXManager';
import { ParticleManager } from '@/engine/aaa/ParticleManager';
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { BetControl } from '@/components/ui/BetControl';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import { ProvablyFairModal } from '@/components/ui/ProvablyFairModal';
import { ShieldCheck } from 'lucide-react';
import { Text, Environment, ContactShadows, MeshReflectorMaterial, Float, Stars, Sparkles, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// ==========================================
// CINEMATIC AAA ROULETTE MATERIALS & GEOMETRIES (LUXURY LIGHT THEME)
// ==========================================

const GEO_BOWL_BASE = new THREE.CylinderGeometry(4.8, 5.0, 1.0, 128, 1, true);
const MAT_BOWL_BASE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.08, 
  envMapIntensity: 2.2, color: "#4A2418", 
  metalness: 0.15, roughness: 0.12, 
  side: THREE.DoubleSide 
}); // Polished Royal Mahogany

const GEO_BOWL_TRIM = new THREE.TorusGeometry(4.7, 0.15, 32, 128);
const MAT_BOWL_TRIM = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.04, 
  envMapIntensity: 3.5, color: "#EAB308", 
  metalness: 0.95, roughness: 0.08 
}); // Solid 24k Gold Rim

const GEO_BOWL_SLOPE = new THREE.CylinderGeometry(4.6, 3.2, 0.6, 128, 1, true);
const MAT_BOWL_SLOPE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.05, 
  envMapIntensity: 2.5, color: "#2E150F", 
  metalness: 0.35, roughness: 0.08, 
  side: THREE.DoubleSide 
}); // High-Gloss Track

const GEO_DEFLECTOR = new THREE.OctahedronGeometry(0.12, 1);
const MAT_DEFLECTOR = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.05, 
  envMapIntensity: 4.5, color: "#FDE047", 
  metalness: 1.0, roughness: 0.04 
}); // Diamond-cut Polished Brass Deflectors

const GEO_WHEEL_BASE = new THREE.CylinderGeometry(3.2, 3.2, 0.15, 128);
const MAT_WHEEL_BASE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.06, 
  envMapIntensity: 2.2, color: "#1E293B", 
  metalness: 0.5, roughness: 0.12 
}); // Deep Slate Steel Base

const GEO_WHEEL_RING = new THREE.TorusGeometry(2.9, 0.05, 32, 128);
const MAT_WHEEL_RING = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.06, 
  envMapIntensity: 3.5, color: "#EAB308", 
  metalness: 0.95, roughness: 0.08 
}); // Inner Gold Ring

const GEO_WHEEL_TURRET = new THREE.CylinderGeometry(1.2, 1.8, 0.5, 64);
const MAT_WHEEL_TURRET = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.08, 
  envMapIntensity: 3.0, color: "#D4AF37", 
  metalness: 0.9, roughness: 0.1 
}); // Brushed Imperial Gold Turret

const GEO_SPINDLE = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 32);
const GEO_SPINDLE_TOP = new THREE.SphereGeometry(0.32, 64, 64);
const MAT_SPINDLE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.02, 
  envMapIntensity: 5.0, color: "#FBBF24", 
  metalness: 1.0, roughness: 0.02 
}); // Mirror Gold Spindle

const GEO_NUMBER_PLATE = new THREE.BoxGeometry(0.42, 0.04, 0.52);
const GEO_POCKET = new THREE.BoxGeometry(0.33, 0.05, 0.5);
const MAT_POCKET = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 0.9, clearcoatRoughness: 0.08, 
  envMapIntensity: 2.5, color: "#CBD5E1", 
  metalness: 0.85, roughness: 0.15 
}); // Polished Platinum Pocket

const GEO_DIVIDER = new THREE.BoxGeometry(0.025, 0.16, 1.0);
const GEO_BALL = new THREE.SphereGeometry(0.13, 64, 64);
const MAT_BALL = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.0, 
  envMapIntensity: 3.5, color: "#FFFFFF", 
  metalness: 0.15, roughness: 0.02,
  emissive: "#FFFFFF", emissiveIntensity: 0.35
}); // Radiant Ivory Ball with soft ambient glow

// Distinct, vibrant colors for the number plates for maximum visibility
const MAT_NUMBER_PLATE_RED = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 2.0, color: "#DC2626", metalness: 0.1, roughness: 0.12 });
const MAT_NUMBER_PLATE_GREEN = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 2.0, color: "#059669", metalness: 0.1, roughness: 0.12 });
const MAT_NUMBER_PLATE_BLACK = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.08, envMapIntensity: 2.0, color: "#0F172A", metalness: 0.3, roughness: 0.12 });


type GameState = 'BETTING' | 'SPINNING' | 'SETTLING' | 'PAYOUT';
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

type BetType = 'straight' | 'dozen' | 'column' | 'red_black' | 'even_odd' | 'high_low';
interface PlacedBet { id: string; type: BetType; amount: number; label: string; numbers: number[]; }
const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

// --- 3D Components ---

function CameraController({ gameState, winIdx, wheelRotRef }: { gameState: GameState, winIdx: number | null, wheelRotRef: any }) {
  const { camera } = useThree();
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state, delta) => {
    if (gameState === 'BETTING' || gameState === 'PAYOUT') {
      const targetCamPos = new THREE.Vector3(0, 9.5, 7.8);
      camera.position.lerp(targetCamPos, delta * 2.5);
      lookAtTarget.current.lerp(new THREE.Vector3(0, 0, 0), delta * 2.5);
    } else if (gameState === 'SPINNING') {
      const time = state.clock.getElapsedTime();
      const radius = 6.2;
      const targetCamPos = new THREE.Vector3(
        Math.cos(time * 0.45) * radius,
        5.2 + Math.sin(time * 0.25) * 1.2,
        Math.sin(time * 0.45) * radius
      );
      camera.position.lerp(targetCamPos, delta * 1.8);
      lookAtTarget.current.lerp(new THREE.Vector3(0, -0.6, 0), delta * 2);
    } else if (gameState === 'SETTLING' && winIdx !== null) {
      const targetAngle = (winIdx * SECTOR_ANGLE) + wheelRotRef.current;
      const radius = 3.6;
      const targetCamPos = new THREE.Vector3(
        Math.cos(targetAngle) * radius,
        3.8,
        Math.sin(targetAngle) * radius
      );
      camera.position.lerp(targetCamPos, delta * 3);
      
      const lookPos = new THREE.Vector3(
        Math.cos(targetAngle) * 2.2,
        0,
        Math.sin(targetAngle) * 2.2
      );
      lookAtTarget.current.lerp(lookPos, delta * 3);
    }
    
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}

function RouletteWheel({ wheelRotRef, ballPosRef, gameState }: { wheelRotRef: React.MutableRefObject<number>, ballPosRef: React.MutableRefObject<number>, gameState: GameState }) {
  const group = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const wheelInnerRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (gameState === 'SPINNING' || gameState === 'SETTLING') {
      wheelRotRef.current -= delta * 2; // Wheel spins counter-clockwise
    }
    if (wheelInnerRef.current) {
      wheelInnerRef.current.rotation.y = wheelRotRef.current;
    }
    if (ballRef.current) {
      const angle = ballPosRef.current;
      const radius = 2.4; 
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      ballRef.current.position.set(x, 0.16, z);
    }
  });

  return (
    <group ref={group}>
      <mesh geometry={GEO_BOWL_BASE} material={MAT_BOWL_BASE} position={[0, -0.4, 0]} receiveShadow />
      <mesh geometry={GEO_BOWL_TRIM} material={MAT_BOWL_TRIM} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow />
      <mesh geometry={GEO_BOWL_SLOPE} material={MAT_BOWL_SLOPE} position={[0, -0.2, 0]} receiveShadow />
      
      {/* 8 Deflectors */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`def-${i}`} geometry={GEO_DEFLECTOR} material={MAT_DEFLECTOR} position={[Math.cos(i * Math.PI / 4) * 3.8, 0, Math.sin(i * Math.PI / 4) * 3.8]} castShadow />
      ))}

      <group ref={wheelInnerRef}>
        <mesh geometry={GEO_WHEEL_BASE} material={MAT_WHEEL_BASE} receiveShadow />
        <mesh geometry={GEO_WHEEL_RING} material={MAT_WHEEL_RING} position={[0, 0.08, 0]} rotation={[Math.PI/2, 0, 0]} castShadow />
        <mesh geometry={GEO_WHEEL_TURRET} material={MAT_WHEEL_TURRET} position={[0, 0.3, 0]} castShadow />
        <mesh geometry={GEO_SPINDLE} material={MAT_SPINDLE} position={[0, 0.6, 0]} castShadow />
        <mesh geometry={GEO_SPINDLE_TOP} material={MAT_SPINDLE} position={[0, 1.2, 0]} castShadow />
        
        {/* Turret Arms */}
        {Array.from({ length: 4 }).map((_, i) => (
          <mesh key={`arm-${i}`} geometry={new THREE.CylinderGeometry(0.045, 0.045, 2.4)} material={MAT_SPINDLE} position={[0, 0.65, 0]} rotation={[Math.PI/2, 0, i * Math.PI/4]} castShadow />
        ))}

        {/* 37 Numbers with High-Contrast Legibility */}
        {WHEEL_TILES.map((tile, i) => {
          const angle = i * SECTOR_ANGLE;
          const x = Math.cos(angle) * 2.5;
          const z = Math.sin(angle) * 2.5;
          
          let mat = MAT_NUMBER_PLATE_GREEN;
          if (tile.color === 'red') mat = MAT_NUMBER_PLATE_RED;
          if (tile.color === 'black') mat = MAT_NUMBER_PLATE_BLACK;

          return (
            <group key={`num-${i}`} position={[x, 0.05, z]} rotation={[0, -angle, 0]}>
              <mesh geometry={GEO_NUMBER_PLATE} material={mat} receiveShadow />
              <mesh geometry={GEO_DIVIDER} material={MAT_WHEEL_RING} position={[0.2, 0.05, 0]} castShadow />
              <mesh geometry={GEO_POCKET} material={MAT_POCKET} position={[-0.4, -0.05, 0]} receiveShadow />
              
              {/* Bold high-contrast number text with raised position, crisp outline and glow */}
              <Text 
                position={[0, 0.045, 0]} 
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
                fontSize={0.28} 
                color="#FFFFFF" 
                anchorX="center" 
                anchorY="middle"
                outlineWidth={0.035}
                outlineColor="#000000"
                outlineOpacity={0.9}
                renderOrder={10}
              >
                {tile.num}
              </Text>
            </group>
          );
        })}
      </group>

      <mesh ref={ballRef} geometry={GEO_BALL} material={MAT_BALL} castShadow />

      {/* Radiant Luxury Lighting */}
      <SpotLight
        position={[0, 16, 0]}
        angle={0.65}
        penumbra={0.7}
        intensity={9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#FFFFFF"
      />
      <SpotLight
        position={[8, 10, 8]}
        angle={0.85}
        penumbra={1}
        intensity={4}
        color="#F8FAFC"
      />
      <SpotLight
        position={[-8, 10, -8]}
        angle={0.85}
        penumbra={1}
        intensity={3.5}
        color="#FEF08A"
      />
      <ambientLight intensity={1.1} color="#F1F5F9" />
      <directionalLight position={[0, 12, 5]} intensity={1.5} color="#FFFFFF" />
    </group>
  );
}


export function RouletteGame({ onClose }: { onClose: () => void }) {
  const { profile, isGuest, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(10);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [winNumber, setWinNumber] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  const [provablyFairOpen, setProvablyFairOpen] = useState(false);
  
  const { activeServerSeed, clientSeed, getAndIncrementNonce, rotateServerSeed } = useProvablyFairStore();
  const wheelRotRef = useRef(0);
  const ballPosRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      gsap.killTweensOf(ballPosRef);
    };
  }, []);

  const handlePlaceBet = (type: BetType, label: string, numbers: number[]) => {
    if (gameState !== 'BETTING') return;
    const currentTotal = placedBets.reduce((a, b) => a + b.amount, 0);
    if ((profile?.tokens || 0) < currentTotal + betAmount) {
      toast.error('Insufficient tokens');
      return;
    }
    
    audio.play('ui', 'chip');
    setPlacedBets(prev => {
      const existing = prev.findIndex(b => b.type === type && b.label === label);
      if (existing >= 0) {
        const next = [...prev];
        next[existing].amount += betAmount;
        return next;
      }
      return [...prev, { id: Math.random().toString(), type, amount: betAmount, label, numbers }];
    });
  };

  const handleClearBets = () => {
    if (gameState !== 'BETTING') return;
    audio.play('ui', 'click');
    setPlacedBets([]);
  };

  const spin = async () => {
    const totalBet = placedBets.reduce((a, b) => a + b.amount, 0);
    if (totalBet === 0) {
      toast.error('Place a bet first');
      return;
    }
    
    if (profile && !isGuest) {
      if (profile.tokens < totalBet) {
        toast.error('Insufficient tokens');
        return;
      }
      try {
        await secureUpdateTokens(profile.id, -totalBet);
        updateProfile({ tokens: profile.tokens - totalBet });
      } catch (e: any) {
        toast.error(e?.message || 'Transaction failed');
        return;
      }
    } else if (profile) {
      updateProfile({ tokens: Math.max(0, profile.tokens - totalBet) });
    }

    if (!isMountedRef.current) return;
    setGameState('SPINNING');
    audio.play('slots', 'spin');

    // Cryptographic Provably Fair RNG outcome derivation (0 - 36)
    let winIndex = 0;
    try {
      const nonce = getAndIncrementNonce();
      let seed = activeServerSeed;
      if (!seed) {
        await rotateServerSeed();
        seed = useProvablyFairStore.getState().activeServerSeed;
      }
      const outcomeFloat = await ProvablyFair.calculateOutcome(seed, clientSeed, nonce);
      winIndex = Math.floor(outcomeFloat * 37);
    } catch {
      winIndex = Math.floor(Math.random() * 37);
    }

    const winTile = WHEEL_TILES[winIndex];
    setWinNumber(winTile.num);

    const spinDuration = 5 + Math.random() * 2;
    const targetBallAngle = (winIndex * SECTOR_ANGLE) + (Math.PI * 2 * 10);
    
    ballPosRef.current = 0; // reset ball pos
    
    gsap.to(ballPosRef, {
      current: targetBallAngle,
      duration: spinDuration,
      ease: "power2.out",
      onComplete: () => {
        if (!isMountedRef.current) return;
        audio.play('ui', 'click');
        setGameState('SETTLING');
        
        setTimeout(() => {
          if (!isMountedRef.current) return;
          calculatePayout(winTile.num);
        }, 3000);
      }
    });
  };

  const calculatePayout = async (winningNumber: number) => {
    if (!isMountedRef.current) return;
    setGameState('PAYOUT');
    let totalWin = 0;
    
    placedBets.forEach(bet => {
      if (bet.numbers.includes(winningNumber)) {
        if (bet.type === 'straight') totalWin += bet.amount * 36;
        else if (bet.type === 'dozen' || bet.type === 'column') totalWin += bet.amount * 3;
        else totalWin += bet.amount * 2;
      }
    });

    setLastWin(totalWin);
    
    if (totalWin > 0) {
      audio.play('ui', 'win');
      toast.success(`You won ${totalWin} tokens!`);
      if (profile && !isGuest) {
        const totalBet = placedBets.reduce((a,b)=>a+b.amount,0);
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: totalWin, xpEarned: Math.floor(totalBet * 0.15) }) /* AUTOFIX: bet=0 to prevent double charge */
          .then(res => {
            if (res?.data) {
              updateProfile({ tokens: res.data });
            } else {
              const currentLive = useAuthStore.getState().profile?.tokens ?? profile.tokens;
              updateProfile({ tokens: currentLive + totalWin });
            }
          });
      } else if (profile) {
        const currentLive = useAuthStore.getState().profile?.tokens ?? profile.tokens;
        updateProfile({ tokens: currentLive + totalWin });
      }
    } else {
      audio.play('ui', 'lose');
      if (profile && !isGuest) {
        const totalBet = placedBets.reduce((a,b)=>a+b.amount,0);
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: 0, xpEarned: Math.floor(totalBet * 0.05) }) /* AUTOFIX: bet=0 to prevent double charge */;
      }
    }

    setTimeout(() => {
      if (!isMountedRef.current) return;
      setPlacedBets([]);
      setWinNumber(null);
      setGameState('BETTING');
    }, 4000);
  };

  return (
    <ErrorBoundary name="RouletteGame">
      <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-sky-50 to-slate-200 flex flex-col font-sans overflow-hidden">
        
        {/* 3D Scene */}
        <div className="absolute inset-0 z-0">
          <ErrorBoundary name="Roulette3DCanvas" fallback={() => (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 bg-slate-100 p-6">
              <p className="text-xl font-bold mb-2 text-amber-600">3D Graphics Fallback</p>
              <p className="text-sm text-center max-w-sm mb-4">The 3D wheel encountered a WebGL issue. You can still play with the betting table below.</p>
              {winNumber !== null && (
                <div className="px-6 py-4 rounded-xl bg-white border border-amber-500/40 shadow-lg text-center">
                  <span className="text-2xl font-black text-amber-600">Winning Number: {winNumber}</span>
                </div>
              )}
            </div>
          )}>
            <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
              <QualityManager>
                <Environment preset="studio" blur={0.8} />
                <CameraController gameState={gameState} winIdx={winNumber !== null ? WHEEL_TILES.findIndex(t => t.num === winNumber) : null} wheelRotRef={wheelRotRef} />
                
                <group position={[0, -2, 0]}>
                  <RouletteWheel wheelRotRef={wheelRotRef} ballPosRef={ballPosRef} gameState={gameState} />
                  
                  {/* Luxury Marble / Pearl Floor Reflection */}
                  <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                    <planeGeometry args={[50, 50]} />
                    <MeshReflectorMaterial 
                      blur={[200, 80]}
                      resolution={1024}
                      mixBlur={1}
                      mixStrength={60}
                      roughness={0.15}
                      depthScale={1.2}
                      minDepthThreshold={0.4}
                      maxDepthThreshold={1.4}
                      color="#E2E8F0"
                      metalness={0.2}
                      mirror={0.4}
                    />
                  </mesh>
                </group>

                <PostFXManager />
                <ParticleManager />
                
                {/* Ambient Golden Sparkles */}
                <Sparkles count={150} scale={20} size={2.5} speed={0.3} opacity={0.35} color="#D97706" />
              </QualityManager>
            </Canvas>
          </ErrorBoundary>
        </div>

      {/* Top Header UI */}
      <div className="relative z-10 flex justify-between items-center p-6 bg-gradient-to-b from-white/90 via-white/60 to-transparent">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-slate-700 hover:text-slate-900 bg-white/80 hover:bg-white border border-slate-200/80 shadow-sm backdrop-blur-md rounded-xl font-bold">
            EXIT
          </Button>
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/80 px-6 py-2 rounded-xl flex items-center gap-3 shadow-sm">
            <div>
              <p className="text-slate-500 text-xs font-bold tracking-widest uppercase">Balance</p>
              <p className="text-amber-600 font-black text-lg">{profile?.tokens?.toLocaleString() || 0} 🪙</p>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/15 text-amber-700 border border-amber-500/30 shadow-sm">
              v2.5 AAA
            </span>
          </div>

          <button
            onClick={() => setProvablyFairOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/90 border border-emerald-500/40 hover:bg-emerald-50 text-emerald-700 text-xs font-bold transition-all shadow-sm"
            title="Provably Fair Verification"
          >
            <ShieldCheck size={16} className="text-emerald-600" />
            <span className="hidden sm:inline">Provably Fair</span>
          </button>
        </div>
        
        {/* Result Overlay */}
        <AnimatePresence>
          {gameState === 'PAYOUT' && (
            <motion.div 
              initial={{ scale: 0, y: -50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0, opacity: 0 }}
              className={`px-10 py-6 rounded-3xl border-2 ${lastWin > 0 ? 'bg-white/95 border-emerald-500 shadow-[0_15px_40px_rgba(16,185,129,0.3)]' : 'bg-white/95 border-rose-500 shadow-[0_15px_40px_rgba(244,63,94,0.25)]'} backdrop-blur-xl absolute left-1/2 -translate-x-1/2 top-24 text-center z-50`}
            >
              <h2 className="text-slate-900 font-black text-4xl tracking-wider">
                {WHEEL_TILES.find(t => t.num === winNumber)?.num} {WHEEL_TILES.find(t => t.num === winNumber)?.color.toUpperCase()}
              </h2>
              {lastWin > 0 ? (
                <p className="text-emerald-600 font-extrabold text-2xl mt-2">+{lastWin} TOKENS</p>
              ) : (
                <p className="text-rose-500 font-bold text-lg mt-2">NO WIN</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Interactive Betting Board */}
      <AnimatePresence>
        {gameState === 'BETTING' && (
          <motion.div 
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 200, opacity: 0 }}
            className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-slate-200/95 via-slate-100/80 to-transparent z-10 flex flex-col items-center pb-safe"
          >
            <div className="w-full max-w-4xl bg-white/95 p-6 rounded-3xl border border-slate-200/90 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-x-auto custom-scrollbar mb-4">
              <div className="min-w-[800px] flex flex-col gap-2 relative">
                
                {/* Numbers Grid */}
                <div className="flex">
                  <button 
                    onClick={() => handlePlaceBet('straight', '0', [0])}
                    className="w-16 flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 rounded-l-xl flex items-center justify-center font-black text-xl text-white relative transition-colors shadow-sm"
                  >
                    0
                    {placedBets.filter(b => b.label === '0').length > 0 && (
                      <span className="absolute bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full bottom-1 right-1 shadow-md border border-amber-200">
                        {placedBets.filter(b => b.label === '0').reduce((a,b)=>a+b.amount,0)}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 grid grid-cols-12 gap-1.5 px-1.5">
                    {/* Reverse order for standard layout (cols: 1st, 2nd, 3rd) */}
                    {[3,2,1].map(rowOffset => (
                      Array.from({length: 12}).map((_, col) => {
                        const num = (col * 3) + rowOffset;
                        const isRed = RED_NUMS.includes(num);
                        const label = num.toString();
                        const betVal = placedBets.filter(b => b.label === label).reduce((a,b)=>a+b.amount,0);
                        
                        return (
                          <button
                            key={num}
                            onClick={() => handlePlaceBet('straight', label, [num])}
                            className={`h-12 flex items-center justify-center font-black text-white text-lg relative rounded-lg border transition-all shadow-sm ${
                              isRed 
                                ? 'bg-rose-600 hover:bg-rose-500 border-rose-400/80 active:scale-95' 
                                : 'bg-slate-800 hover:bg-slate-700 border-slate-600 active:scale-95'
                            }`}
                          >
                            {num}
                            {betVal > 0 && (
                              <span className="absolute bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5 shadow-md z-10 border border-amber-200">
                                {betVal}
                              </span>
                            )}
                          </button>
                        );
                      })
                    ))}
                  </div>
                </div>

                {/* Outside Bets (Dozens) */}
                <div className="flex pl-16 gap-1.5 mt-2">
                  {[
                    { id: '1st 12', label: '1st 12', nums: Array.from({length:12}, (_,i)=>i+1), type: 'dozen' },
                    { id: '2nd 12', label: '2nd 12', nums: Array.from({length:12}, (_,i)=>i+13), type: 'dozen' },
                    { id: '3rd 12', label: '3rd 12', nums: Array.from({length:12}, (_,i)=>i+25), type: 'dozen' }
                  ].map(b => {
                    const betVal = placedBets.filter(pb => pb.label === b.id).reduce((a,b)=>a+b.amount,0);
                    return (
                      <button key={b.id} onClick={() => handlePlaceBet(b.type as BetType, b.id, b.nums)} className="flex-1 h-10 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg font-bold text-slate-800 relative transition-all shadow-sm active:scale-95">
                        {b.label}
                        {betVal > 0 && <span className="absolute bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5 shadow border border-amber-200">{betVal}</span>}
                      </button>
                    )
                  })}
                </div>
                
                {/* Even Money Bets */}
                <div className="flex pl-16 gap-1.5 mt-1">
                  {[
                    { id: '1-18', label: '1 TO 18', nums: Array.from({length:18}, (_,i)=>i+1), type: 'high_low', bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' },
                    { id: 'EVEN', label: 'EVEN', nums: Array.from({length:18}, (_,i)=>(i+1)*2), type: 'even_odd', bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' },
                    { id: 'RED', label: 'RED', nums: RED_NUMS, type: 'red_black', bg: 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400' },
                    { id: 'BLACK', label: 'BLACK', nums: BLACK_NUMS, type: 'red_black', bg: 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600' },
                    { id: 'ODD', label: 'ODD', nums: Array.from({length:18}, (_,i)=>(i*2)+1), type: 'even_odd', bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' },
                    { id: '19-36', label: '19 TO 36', nums: Array.from({length:18}, (_,i)=>i+19), type: 'high_low', bg: 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300' }
                  ].map(b => {
                    const betVal = placedBets.filter(pb => pb.label === b.id).reduce((a,b)=>a+b.amount,0);
                    return (
                      <button key={b.id} onClick={() => handlePlaceBet(b.type as BetType, b.id, b.nums)} className={`flex-1 h-11 ${b.bg} border rounded-lg font-black relative transition-all shadow-sm active:scale-95`}>
                        {b.label}
                        {betVal > 0 && <span className="absolute bg-amber-400 text-slate-900 text-[10px] font-black px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5 shadow border border-amber-200">{betVal}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Controls Bar in Light Luxury Theme */}
            <div className="w-full max-w-4xl flex items-center justify-between gap-6 bg-white/95 p-4 rounded-3xl backdrop-blur-md border border-slate-200/90 shadow-lg">
              <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={10000} />
              <div className="flex gap-3">
                <Button variant="danger" onClick={handleClearBets} disabled={placedBets.length === 0} className="w-28 rounded-xl font-bold tracking-wider bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 shadow-sm">
                  CLEAR
                </Button>
                <Button onClick={spin} disabled={placedBets.length === 0} className="w-48 h-12 rounded-xl font-black text-base tracking-widest bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] active:scale-95 transition-all">
                  SPIN WHEEL
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Provably Fair Modal */}
      <ProvablyFairModal isOpen={provablyFairOpen} onClose={() => setProvablyFairOpen(false)} />
    </div>
  </ErrorBoundary>
  );
}
