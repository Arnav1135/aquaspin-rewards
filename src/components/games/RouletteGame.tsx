import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { QualityManager } from '@/engine/aaa/QualityManager';
import { PostFXManager } from '@/engine/aaa/PostFXManager';
import { ParticleManager } from '@/engine/aaa/ParticleManager';
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { BetControl } from '@/components/ui/BetControl';
import { Button } from '@/components/ui/Button';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

import { Text, Environment, ContactShadows, MeshReflectorMaterial, Float, Stars, Sparkles, SpotLight } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';

// ==========================================
// CINEMATIC AAA ROULETTE MATERIALS & GEOMETRIES
// ==========================================

const GEO_BOWL_BASE = new THREE.CylinderGeometry(4.8, 5.0, 1.0, 128, 1, true);
const MAT_BOWL_BASE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.1, 
  envMapIntensity: 2.5, color: "#2B0B04", 
  metalness: 0.2, roughness: 0.1, 
  side: THREE.DoubleSide 
}); // Ultra-Rich Mahogany

const GEO_BOWL_TRIM = new THREE.TorusGeometry(4.7, 0.15, 32, 128);
const MAT_BOWL_TRIM = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.05, 
  envMapIntensity: 3.0, color: "#FFDF00", 
  metalness: 1.0, roughness: 0.1 
}); // Solid Gold Trim

const GEO_BOWL_SLOPE = new THREE.CylinderGeometry(4.6, 3.2, 0.6, 128, 1, true);
const MAT_BOWL_SLOPE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.0, 
  envMapIntensity: 2.0, color: "#1a0803", 
  metalness: 0.4, roughness: 0.1, 
  side: THREE.DoubleSide 
}); // High-Gloss Track

const GEO_DEFLECTOR = new THREE.OctahedronGeometry(0.1, 1);
const MAT_DEFLECTOR = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.1, 
  envMapIntensity: 4.0, color: "#fef08a", 
  metalness: 1.0, roughness: 0.05 
}); // Diamond-cut Brass Deflectors

const GEO_WHEEL_BASE = new THREE.CylinderGeometry(3.2, 3.2, 0.15, 128);
const MAT_WHEEL_BASE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.05, 
  envMapIntensity: 2.0, color: "#000000", 
  metalness: 0.6, roughness: 0.1 
}); // Obsidian Black Wheel

const GEO_WHEEL_RING = new THREE.TorusGeometry(2.9, 0.04, 32, 128);
const MAT_WHEEL_RING = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.1, 
  envMapIntensity: 3.0, color: "#D4AF37", 
  metalness: 1.0, roughness: 0.1 
}); // Inner Gold Ring

const GEO_WHEEL_TURRET = new THREE.CylinderGeometry(1.2, 1.8, 0.5, 64);
const MAT_WHEEL_TURRET = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.1, 
  envMapIntensity: 2.5, color: "#c5a059", 
  metalness: 0.9, roughness: 0.15 
}); // Brushed Gold Turret

const GEO_SPINDLE = new THREE.CylinderGeometry(0.12, 0.18, 1.2, 32);
const GEO_SPINDLE_TOP = new THREE.SphereGeometry(0.3, 64, 64);
const MAT_SPINDLE = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.0, 
  envMapIntensity: 5.0, color: "#FFDF00", 
  metalness: 1.0, roughness: 0.02 
}); // Mirror Gold Spindle

const GEO_NUMBER_PLATE = new THREE.BoxGeometry(0.42, 0.03, 0.5);
const GEO_POCKET = new THREE.BoxGeometry(0.33, 0.05, 0.5);
const MAT_POCKET = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 0.8, clearcoatRoughness: 0.1, 
  envMapIntensity: 2.0, color: "#94a3b8", 
  metalness: 0.9, roughness: 0.2 
}); // Silver Pocket

const GEO_DIVIDER = new THREE.BoxGeometry(0.02, 0.15, 1.0);
const GEO_BALL = new THREE.SphereGeometry(0.12, 64, 64);
const MAT_BALL = new THREE.MeshPhysicalMaterial({ 
  clearcoat: 1.0, clearcoatRoughness: 0.0, 
  envMapIntensity: 3.0, color: "#ffffff", 
  metalness: 0.2, roughness: 0.0,
  transmission: 0.2, ior: 1.5
}); // Pearl / Ivory Ball

const MAT_NUMBER_PLATE_RED = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, color: "#990000", metalness: 0.2, roughness: 0.1 });
const MAT_NUMBER_PLATE_GREEN = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, color: "#005500", metalness: 0.2, roughness: 0.1 });
const MAT_NUMBER_PLATE_BLACK = new THREE.MeshPhysicalMaterial({ clearcoat: 1.0, clearcoatRoughness: 0.1, envMapIntensity: 1.5, color: "#050505", metalness: 0.2, roughness: 0.1 });


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
      const targetCamPos = new THREE.Vector3(0, 10, 8);
      camera.position.lerp(targetCamPos, delta * 2);
      lookAtTarget.current.lerp(new THREE.Vector3(0, 0, 0), delta * 2);
    } else if (gameState === 'SPINNING') {
      const time = state.clock.getElapsedTime();
      const radius = 6.5;
      const targetCamPos = new THREE.Vector3(
        Math.cos(time * 0.5) * radius,
        5 + Math.sin(time * 0.3) * 1.5,
        Math.sin(time * 0.5) * radius
      );
      camera.position.lerp(targetCamPos, delta * 1.5);
      lookAtTarget.current.lerp(new THREE.Vector3(0, -1, 0), delta * 2);
    } else if (gameState === 'SETTLING' && winIdx !== null) {
      const targetAngle = (winIdx * SECTOR_ANGLE) + wheelRotRef.current;
      const radius = 3.5;
      const targetCamPos = new THREE.Vector3(
        Math.cos(targetAngle) * radius,
        3.5,
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

function RouletteWheel({ wheelRotRef, ballPosRef }: { wheelRotRef: React.MutableRefObject<number>, ballPosRef: React.MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);
  const ballRef = useRef<THREE.Mesh>(null);
  const wheelInnerRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (wheelInnerRef.current) {
      wheelInnerRef.current.rotation.y = wheelRotRef.current;
    }
    if (ballRef.current) {
      const angle = ballPosRef.current;
      // Ball descends from track (radius 4.2) to pocket (radius 2.3)
      const isSettled = ballPosRef.current === wheelRotRef.current + (ballPosRef.current % (Math.PI*2));
      const radius = 2.4; 
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      ballRef.current.position.set(x, 0.15, z);
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
          <mesh key={`arm-${i}`} geometry={new THREE.CylinderGeometry(0.04, 0.04, 2.4)} material={MAT_SPINDLE} position={[0, 0.65, 0]} rotation={[Math.PI/2, 0, i * Math.PI/4]} castShadow />
        ))}

        {/* 37 Numbers */}
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
              <Text 
                position={[0, 0.02, 0]} 
                rotation={[-Math.PI / 2, 0, Math.PI / 2]} 
                fontSize={0.25} 
                color="white" 
                font="https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2"
                anchorX="center" 
                anchorY="middle"
                outlineWidth={0.01}
                outlineColor="#000"
              >
                {tile.num}
              </Text>
            </group>
          );
        })}
      </group>

      <mesh ref={ballRef} geometry={GEO_BALL} material={MAT_BALL} castShadow />

      {/* Cinematic Studio Lighting */}
      <SpotLight
        position={[0, 15, 0]}
        angle={0.6}
        penumbra={0.8}
        intensity={8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        color="#fffaee"
      />
      <SpotLight
        position={[10, 8, 10]}
        angle={0.8}
        penumbra={1}
        intensity={3}
        color="#4facfe"
      />
      <SpotLight
        position={[-10, 8, -10]}
        angle={0.8}
        penumbra={1}
        intensity={3}
        color="#f093fb"
      />
      <ambientLight intensity={0.4} />
    </group>
  );
}


export function RouletteGame({ onClose }: { onClose: () => void }) {
  const { profile, isGuest } = useAuthStore();
  const [betAmount, setBetAmount] = useState(10);
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [winNumber, setWinNumber] = useState<number | null>(null);
  const [lastWin, setLastWin] = useState(0);
  
  const wheelRotRef = useRef(0);
  const ballPosRef = useRef(0);
  
  useFrame((_, delta) => {
    if (gameState === 'SPINNING' || gameState === 'SETTLING') {
      wheelRotRef.current -= delta * 2; // Wheel spins counter-clockwise
    }
  });

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
    
    setGameState('SPINNING');
    audio.play('slots', 'spin');
    
    if (profile && !isGuest) {
      await secureUpdateTokens(profile.id, -totalBet);
    }

    const winIndex = Math.floor(Math.random() * 37);
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
        audio.play('ui', 'click');
        setGameState('SETTLING');
        
        setTimeout(() => {
          calculatePayout(winTile.num);
        }, 3000);
      }
    });
  };

  const calculatePayout = async (winningNumber: number) => {
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
        
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: totalWin, xpEarned: Math.floor(totalBet * 0.15) }) /* AUTOFIX: bet=0 to prevent double charge */;
      }
    } else {
      audio.play('ui', 'lose');
      if (profile && !isGuest) {
        const totalBet = placedBets.reduce((a,b)=>a+b.amount,0);
        secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: 0, xpEarned: Math.floor(totalBet * 0.05) }) /* AUTOFIX: bet=0 to prevent double charge */;
      }
    }

    setTimeout(() => {
      setPlacedBets([]);
      setWinNumber(null);
      setGameState('BETTING');
    }, 4000);
  };

  return (
    <div className="absolute inset-0 bg-black flex flex-col font-sans overflow-hidden">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
          <QualityManager>
            <Environment preset="studio" blur={0.8} />
            <CameraController gameState={gameState} winIdx={winNumber !== null ? WHEEL_TILES.findIndex(t => t.num === winNumber) : null} wheelRotRef={wheelRotRef} />
            
            <group position={[0, -2, 0]}>
              <RouletteWheel wheelRotRef={wheelRotRef} ballPosRef={ballPosRef} />
              
              {/* Cinematic Floor Reflection */}
              <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.6, 0]} receiveShadow>
                <planeGeometry args={[50, 50]} />
                <MeshReflectorMaterial 
                  blur={[300, 100]}
                  resolution={1024}
                  mixBlur={1}
                  mixStrength={80}
                  roughness={0.2}
                  depthScale={1.2}
                  minDepthThreshold={0.4}
                  maxDepthThreshold={1.4}
                  color="#0a0a0a"
                  metalness={0.5}
                  mirror={0.5}
                />
              </mesh>
            </group>

            <PostFXManager />
            <ParticleManager />
            
            {/* Ambient Dust Particles */}
            <Sparkles count={200} scale={20} size={2} speed={0.4} opacity={0.2} color="#fef08a" />
          </QualityManager>
        </Canvas>
      </div>

      {/* Top Header UI */}
      <div className="relative z-10 flex justify-between items-center p-6 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10 backdrop-blur-md rounded-xl">
            EXIT
          </Button>
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-xl">
            <p className="text-white/60 text-xs font-bold tracking-widest uppercase">Balance</p>
            <p className="text-yellow-400 font-black text-lg">{profile?.tokens?.toLocaleString() || 0} 🪙</p>
          </div>
        </div>
        
        {/* Result Overlay */}
        <AnimatePresence>
          {gameState === 'PAYOUT' && (
            <motion.div 
              initial={{ scale: 0, y: -50 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0, opacity: 0 }}
              className={`px-10 py-6 rounded-3xl border-4 ${lastWin > 0 ? 'bg-emerald-900/80 border-emerald-400 shadow-[0_0_50px_rgba(52,211,153,0.5)]' : 'bg-red-900/80 border-red-500 shadow-[0_0_50px_rgba(239,68,68,0.5)]'} backdrop-blur-xl absolute left-1/2 -translate-x-1/2 top-24 text-center z-50`}
            >
              <h2 className="text-white font-black text-4xl drop-shadow-lg tracking-wider">
                {WHEEL_TILES.find(t => t.num === winNumber)?.num} {WHEEL_TILES.find(t => t.num === winNumber)?.color.toUpperCase()}
              </h2>
              {lastWin > 0 && <p className="text-yellow-400 font-bold text-xl mt-2">+{lastWin} WIN</p>}
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
            className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black via-black/90 to-transparent z-10 flex flex-col items-center pb-safe"
          >
            <div className="w-full max-w-4xl bg-green-950/80 p-6 rounded-3xl border-2 border-green-500/30 backdrop-blur-2xl shadow-2xl overflow-x-auto custom-scrollbar mb-6">
              <div className="min-w-[800px] flex flex-col gap-2 relative">
                
                {/* Numbers Grid */}
                <div className="flex">
                  <button 
                    onClick={() => handlePlaceBet('straight', '0', [0])}
                    className="w-16 flex-shrink-0 bg-green-700 hover:bg-green-600 border border-green-400/50 rounded-l-xl flex items-center justify-center font-black text-xl text-white relative transition-colors"
                  >
                    0
                    {placedBets.filter(b => b.label === '0').length > 0 && (
                      <span className="absolute bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full bottom-1 right-1 shadow-md">
                        {placedBets.filter(b => b.label === '0').reduce((a,b)=>a+b.amount,0)}
                      </span>
                    )}
                  </button>
                  <div className="flex-1 grid grid-cols-12 gap-1 px-1">
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
                            className={`h-12 flex items-center justify-center font-bold text-white text-lg relative rounded-md border border-white/10 transition-colors ${isRed ? 'bg-red-700 hover:bg-red-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                          >
                            {num}
                            {betVal > 0 && (
                              <span className="absolute bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5 shadow-md z-10">{betVal}</span>
                            )}
                          </button>
                        );
                      })
                    ))}
                  </div>
                </div>

                {/* Outside Bets */}
                <div className="flex pl-16 gap-1 mt-2">
                  {[
                    { id: '1st 12', label: '1st 12', nums: Array.from({length:12}, (_,i)=>i+1), type: 'dozen' },
                    { id: '2nd 12', label: '2nd 12', nums: Array.from({length:12}, (_,i)=>i+13), type: 'dozen' },
                    { id: '3rd 12', label: '3rd 12', nums: Array.from({length:12}, (_,i)=>i+25), type: 'dozen' }
                  ].map(b => {
                    const betVal = placedBets.filter(pb => pb.label === b.id).reduce((a,b)=>a+b.amount,0);
                    return (
                      <button key={b.id} onClick={() => handlePlaceBet(b.type as BetType, b.id, b.nums)} className="flex-1 h-10 bg-green-800 hover:bg-green-700 border border-green-500/30 rounded-md font-bold text-white relative transition-colors">
                        {b.label}
                        {betVal > 0 && <span className="absolute bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5">{betVal}</span>}
                      </button>
                    )
                  })}
                </div>
                
                <div className="flex pl-16 gap-1 mt-1">
                  {[
                    { id: '1-18', label: '1 TO 18', nums: Array.from({length:18}, (_,i)=>i+1), type: 'high_low' },
                    { id: 'EVEN', label: 'EVEN', nums: Array.from({length:18}, (_,i)=>(i+1)*2), type: 'even_odd' },
                    { id: 'RED', label: 'RED', nums: RED_NUMS, type: 'red_black', color: 'bg-red-700 hover:bg-red-600' },
                    { id: 'BLACK', label: 'BLACK', nums: BLACK_NUMS, type: 'red_black', color: 'bg-slate-900 hover:bg-slate-800' },
                    { id: 'ODD', label: 'ODD', nums: Array.from({length:18}, (_,i)=>(i*2)+1), type: 'even_odd' },
                    { id: '19-36', label: '19 TO 36', nums: Array.from({length:18}, (_,i)=>i+19), type: 'high_low' }
                  ].map(b => {
                    const betVal = placedBets.filter(pb => pb.label === b.id).reduce((a,b)=>a+b.amount,0);
                    return (
                      <button key={b.id} onClick={() => handlePlaceBet(b.type as BetType, b.id, b.nums)} className={`flex-1 h-12 ${b.color || 'bg-green-900 hover:bg-green-800'} border border-white/10 rounded-md font-black text-white relative transition-colors`}>
                        {b.label}
                        {betVal > 0 && <span className="absolute bg-yellow-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full bottom-0.5 right-0.5">{betVal}</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="w-full max-w-4xl flex items-center justify-between gap-6 bg-black/50 p-4 rounded-3xl backdrop-blur-md border border-white/10">
              <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={10000} />
              <div className="flex gap-4">
                <Button variant="danger" onClick={handleClearBets} disabled={placedBets.length === 0} className="w-32 rounded-xl font-bold tracking-widest bg-red-950/50 hover:bg-red-900 text-red-400 border-red-500/30">
                  CLEAR
                </Button>
                <Button onClick={spin} disabled={placedBets.length === 0} className="w-48 h-12 rounded-xl font-black text-lg tracking-widest bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                  SPIN WHEEL
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
