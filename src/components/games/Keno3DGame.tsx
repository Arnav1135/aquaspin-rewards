import { useAIGameEngine } from '@/hooks/useAIGameEngine';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';
import { getKenoMultiplier } from '@/lib/kenoMath';

import { Canvas, useFrame } from '@react-three/fiber';
import { QualityManager, PostFXManager, VFXManager, ParticleManager } from '@/engine/aaa';
import { RigidBody, Physics, CuboidCollider } from '@react-three/rapier';
import { Html, Environment, ContactShadows, Sphere } from '@react-three/drei';
import * as THREE from 'three';

type GameState = 'IDLE' | 'DRAWING' | 'PAYOUT';

export function Keno3DGame() {
  const { profile } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [bet, setBet] = useState(10);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [risk, setRisk] = useState<'classic' | 'high'>('classic');
  const [winAmount, setWinAmount] = useState(0);
  const [multiplier, setMultiplier] = useState(0);

  const toggleNumber = (num: number) => {
    if (gameState !== 'IDLE') return;
    vibrate(10);
    audio.play('keno-3d', 'click');
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < 10) {
        setSelectedNumbers(prev => [...prev, num]);
      } else {
        toast.error("Maximum 10 numbers allowed.");
      }
    }
  };

  const autoPick = () => {
    if (gameState !== 'IDLE') return;
    vibrate(20);
    audio.play('keno-3d', 'click');
    const nums: number[] = [];
    while (nums.length < 10) {
      const r = Math.floor(Math.random() * 40) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums);
  };

  const clearPicks = () => {
    if (gameState !== 'IDLE') return;
    vibrate(10);
    audio.play('keno-3d', 'click');
    setSelectedNumbers([]);
  };

  const playGame = async () => {
    if (!profile) return toast.error("Please login.");
    if (selectedNumbers.length === 0) return toast.error("Select at least 1 number.");
    if (profile.tokens < bet) return toast.error("Insufficient tokens.");
    if (gameState !== 'IDLE') return;

    setGameState('DRAWING');
    setDrawnNumbers([]);
    setWinAmount(0);
    setMultiplier(0);

    const success = await secureUpdateTokens(profile.id, -bet);
    if (!success) {
      setGameState('IDLE');
      return toast.error("Transaction failed.");
    }

    audio.play('keno-3d', 'spin');

    // Generate 10 winning numbers
    const winners: number[] = [];
    while(winners.length < 10) {
      const r = Math.floor(Math.random() * 40) + 1;
      if (!winners.includes(r)) winners.push(r);
    }

    // Draw one by one
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 800));
      setDrawnNumbers(prev => [...prev, winners[i]]);
      if (selectedNumbers.includes(winners[i])) {
        audio.play('keno-3d', 'win');
      } else {
        audio.play('keno-3d', 'click');
      }
    }

    await new Promise(r => setTimeout(r, 1000));

    // Calculate payout
    const hits = winners.filter(w => selectedNumbers.includes(w)).length;
    const mult = getKenoMultiplier(selectedNumbers.length, hits, risk);
    const win = Math.floor(bet * mult);

    setMultiplier(mult);
    setWinAmount(win);

    if (win > 0) {
      await secureUpdateTokens(profile.id, win);
      audio.play('keno-3d', 'jackpot');
      vibrate([50, 100, 50]);
    } else {
      audio.play('keno-3d', 'lose');
    }

    await secureRecordGameResult({ userId: profile.id, betAmount: bet, earnedAmount: win });
    setGameState('PAYOUT');
  };

  const resetGame = () => {
    setGameState('IDLE');
    setDrawnNumbers([]);
    setWinAmount(0);
    setMultiplier(0);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative bg-[#0f172a] overflow-hidden rounded-xl">
      {/* 3D Viewport */}
      <div className="relative flex-1 min-h-[300px] lg:min-h-full">
        <Canvas camera={{ position: [0, 4, 8], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
          <Environment preset="city" />
          <QualityManager>
            <VFXManager>
              <PostFXManager />
              <ParticleManager />
              <Physics>
                <LotteryMachine gameState={gameState} drawnNumbers={drawnNumbers} />
              </Physics>
            </VFXManager>
          </QualityManager>
        </Canvas>

        {/* Payout Overlay */}
        <AnimatePresence>
          {gameState === 'PAYOUT' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="bg-black/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center shadow-2xl pointer-events-auto">
                <h2 className="text-3xl font-black text-white mb-2">
                  {winAmount > 0 ? "WINNER!" : "NO LUCK"}
                </h2>
                <div className="text-5xl font-black text-emerald-400 mb-2">
                  +{winAmount.toLocaleString()}
                </div>
                <div className="text-sm text-white/50 mb-6">Multiplier: {multiplier}x</div>
                <Button variant="neon" size="lg" onClick={resetGame} className="w-full">
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Betting UI */}
      <div className="w-full lg:w-96 bg-[#1e293b] p-4 lg:p-6 flex flex-col gap-4 z-10 border-l border-white/5 shadow-2xl relative overflow-y-auto custom-scrollbar h-[50vh] lg:h-full">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            3D Keno
            <HelpCircle size={16} className="text-white/40 cursor-help" />
          </h2>
        </div>

        <div className="flex gap-2 bg-black/40 p-1 rounded-xl">
          <button
            onClick={() => setRisk('classic')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${risk === 'classic' ? 'bg-indigo-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            disabled={gameState !== 'IDLE'}
          >
            Classic
          </button>
          <button
            onClick={() => setRisk('high')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${risk === 'high' ? 'bg-rose-500 text-white shadow-lg' : 'text-white/40 hover:text-white'}`}
            disabled={gameState !== 'IDLE'}
          >
            High Risk
          </button>
        </div>

        <div className="grid grid-cols-8 gap-1.5">
          {Array.from({ length: 40 }).map((_, i) => {
            const num = i + 1;
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnNumbers.includes(num);
            const isHit = isSelected && isDrawn;

            let bgClass = "bg-slate-800 text-white/60 hover:bg-slate-700 hover:text-white border-transparent";
            if (isHit) bgClass = "bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)] border-emerald-400";
            else if (isDrawn) bgClass = "bg-rose-500 text-white opacity-80 border-rose-400";
            else if (isSelected) bgClass = "bg-indigo-500 text-white shadow-md border-indigo-400";

            return (
              <button
                key={num}
                onClick={() => toggleNumber(num)}
                disabled={gameState !== 'IDLE'}
                className={`w-full aspect-square rounded flex items-center justify-center text-xs font-bold transition-all border ${bgClass}`}
              >
                {num}
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 text-xs bg-slate-700 hover:bg-slate-600" onClick={autoPick} disabled={gameState !== 'IDLE'}>Auto Pick</Button>
          <Button className="flex-1 text-xs bg-slate-800 hover:bg-slate-700" onClick={clearPicks} disabled={gameState !== 'IDLE'}>Clear</Button>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Picks</span>
              <span className="font-bold text-white">{selectedNumbers.length}/10</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Bet Amount</span>
              <span className="font-bold text-emerald-400">{bet} Tokens</span>
            </div>
            <BetControl betAmount={bet} setBetAmount={setBet} minBet={10} maxBet={10000} disabled={gameState !== 'IDLE'} />
          </div>

          <Button
            variant="neon"
            size="lg"
            className="w-full py-6 text-lg font-black tracking-widest uppercase"
            onClick={playGame}
            disabled={gameState !== 'IDLE' || selectedNumbers.length === 0}
          >
            {gameState === 'IDLE' ? 'Play' : 'Drawing...'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function LotteryMachine({ gameState, drawnNumbers }: { gameState: GameState, drawnNumbers: number[] }) {
  const ballsRef = useRef<any>(null);
  
  // 40 balls positions
  const instances = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      key: i + 1,
      position: [
        (Math.random() - 0.5) * 2,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 2
      ] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
    }));
  }, []);

  const [materials] = useState(() => {
    const mats = [];
    for (let i = 0; i < 40; i++) {
      mats.push(new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
        roughness: 0.2,
        metalness: 0.1
      }));
    }
    return mats;
  });

  useFrame(() => {
    if (!ballsRef.current) return;
    if (gameState === 'DRAWING') {
      // Apply upward random forces to simulate air blowing
      for (let i = 0; i < 40; i++) {
        if (!drawnNumbers.includes(i + 1) && ballsRef.current[i]) {
          ballsRef.current[i].applyImpulseAtPoint(
            { x: (Math.random() - 0.5) * 0.1, y: Math.random() * 0.15, z: (Math.random() - 0.5) * 0.1 },
            { x: 0, y: 0, z: 0 },
            true
          );
        }
      }
    }
  });

  return (
    <group>
      {/* Glass Sphere Container */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[3, 32, 32]} />
        <meshPhysicalMaterial 
          transparent 
          opacity={0.15} 
          roughness={0} 
          metalness={0.1} 
          transmission={0.9} 
          thickness={0.5} 
          envMapIntensity={2} 
        />
      </mesh>

      {/* Invisible Colliders for Container */}
      <RigidBody type="fixed" colliders="trimesh">
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[3.1, 16, 16]} />
          <meshBasicMaterial visible={false} side={THREE.BackSide} />
        </mesh>
      </RigidBody>

      {/* The Balls */}
      {instances.map((inst, i) => (
        <RigidBody
          key={inst.key}
          ref={(el) => {
             if (!ballsRef.current) ballsRef.current = [];
             ballsRef.current[i] = el;
          }}
          position={inst.position}
          colliders="ball"
          restitution={0.8}
          friction={0.2}
          linearDamping={0.5}
        >
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshStandardMaterial color="#fff" />
          </mesh>
        </RigidBody>
      ))}

      {/* Drawn Balls Display */}
      <group position={[0, -0.5, 3]}>
        {drawnNumbers.map((num, idx) => (
          <group key={num} position={[(idx - 4.5) * 0.6, 0, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.25, 32, 32]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.2} />
            </mesh>
            <Html center position={[0, 0, 0.26]} className="pointer-events-none">
              <div className="text-black font-black text-xs">{num}</div>
            </Html>
          </group>
        ))}
      </group>
    </group>
  );
}
