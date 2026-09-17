import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { QualityManager, PostFXManager, VFXManager } from '@/engine/aaa';
import { RigidBody, Physics, RapierRigidBody } from '@react-three/rapier';
import { Environment, Text } from '@react-three/drei';
import * as THREE from 'three';

type GameState = 'IDLE' | 'PLAYING' | 'CRASHED' | 'CASHOUT';

const TOWER_ROWS = 8;
const COLS = 3;

// Easy mode: 2 safe, 1 bomb per row
const MULTIPLIERS = [1.4, 2.0, 2.8, 4.0, 5.6, 8.0, 11.3, 16.0]; 

interface BlockData {
  id: string;
  row: number;
  col: number;
  isBomb: boolean;
  revealed: boolean;
}

export function Tower3DGame() {
  const { profile } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [bet, setBet] = useState(10);
  const [activeRow, setActiveRow] = useState(0);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [winAmount, setWinAmount] = useState(0);

  const blockRefs = useRef<(RapierRigidBody | null)[]>([]);

  const initTower = () => {
    const newBlocks: BlockData[] = [];
    for (let r = 0; r < TOWER_ROWS; r++) {
      // Pick bomb col
      const bombCol = Math.floor(Math.random() * COLS);
      for (let c = 0; c < COLS; c++) {
        newBlocks.push({
          id: `r${r}c${c}`,
          row: r,
          col: c,
          isBomb: c === bombCol,
          revealed: false
        });
      }
    }
    setBlocks(newBlocks);
    setActiveRow(0);
    setGameState('PLAYING');
    setWinAmount(0);
  };

  const startGame = async () => {
    if (!profile) return toast.error("Please login.");
    if (gameState === 'PLAYING') return;
    if (profile.tokens < bet) return toast.error("Insufficient tokens.");

    const success = await secureUpdateTokens(profile.id, -bet);
    if (!success) return toast.error("Transaction failed.");

    audio.play('tower', 'click');
    initTower();
  };

  const cashout = async () => {
    if (gameState !== 'PLAYING' || activeRow === 0) return;
    
    const payout = Math.floor(bet * MULTIPLIERS[activeRow - 1]);
    await secureUpdateTokens(profile!.id, payout);
    await secureRecordGameResult({ userId: profile!.id, betAmount: bet, earnedAmount: payout });
    
    setWinAmount(payout);
    setGameState('CASHOUT');
    audio.play('tower', 'win-jackpot');
    vibrate([50, 100, 50]);
  };

  const handleBlockClick = async (index: number) => {
    if (gameState !== 'PLAYING') return;
    const block = blocks[index];
    if (block.row !== activeRow || block.revealed) return;

    // Reveal block
    const newBlocks = [...blocks];
    newBlocks[index] = { ...block, revealed: true };

    if (block.isBomb) {
      // BOOM
      // Reveal all bombs
      newBlocks.forEach(b => {
        if (b.isBomb) b.revealed = true;
      });
      setBlocks(newBlocks);
      setGameState('CRASHED');
      audio.play('tower', 'click-lose');
      vibrate([100, 200, 100]);
      await secureRecordGameResult({ userId: profile!.id, betAmount: bet, earnedAmount: 0 });

      // Apply explosive forces
      setTimeout(() => {
        blockRefs.current.forEach((rb, idx) => {
          if (rb) {
            const b = newBlocks[idx];
            rb.applyImpulse({ 
              x: (Math.random() - 0.5) * 5, 
              y: Math.random() * 5 + 5, 
              z: (Math.random() - 0.5) * 5 
            }, true);
            rb.applyTorqueImpulse({
              x: Math.random(),
              y: Math.random(),
              z: Math.random()
            }, true);
          }
        });
      }, 100);

    } else {
      // SAFE
      setBlocks(newBlocks);
      audio.play('tower', 'click');
      vibrate(20);
      
      if (activeRow === TOWER_ROWS - 1) {
        // Auto cashout on top
        const payout = Math.floor(bet * MULTIPLIERS[TOWER_ROWS - 1]);
        await secureUpdateTokens(profile!.id, payout);
        await secureRecordGameResult({ userId: profile!.id, betAmount: bet, earnedAmount: payout });
        
        setWinAmount(payout);
        setGameState('CASHOUT');
        audio.play('tower', 'win-jackpot');
        vibrate([50, 100, 50]);
      } else {
        setActiveRow(activeRow + 1);
      }
    }
  };

  const resetGame = () => {
    setGameState('IDLE');
    setBlocks([]);
    setActiveRow(0);
  };

  const currentMultiplier = activeRow > 0 ? MULTIPLIERS[activeRow - 1] : 1;
  const nextMultiplier = MULTIPLIERS[activeRow];

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative bg-[#0f172a] overflow-hidden rounded-xl">
      <div className="relative flex-1 min-h-[400px] lg:min-h-full">
        <Canvas camera={{ position: [0, 5, 12], fov: 45 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
          <Environment preset="city" />
          <QualityManager>
            <VFXManager>
              <PostFXManager />
              <Physics>
                {/* Ground */}
                <RigidBody type="fixed" friction={0.8} restitution={0.2}>
                  <mesh position={[0, -0.5, 0]} receiveShadow>
                    <boxGeometry args={[20, 1, 20]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.5} metalness={0.5} />
                  </mesh>
                </RigidBody>

                {/* Blocks */}
                {blocks.map((block, idx) => (
                  <TowerBlock 
                    key={block.id}
                    block={block}
                    isActive={block.row === activeRow && gameState === 'PLAYING'}
                    isCrashed={gameState === 'CRASHED'}
                    onClick={() => handleBlockClick(idx)}
                    ref={(el) => (blockRefs.current[idx] = el)}
                  />
                ))}
              </Physics>
            </VFXManager>
          </QualityManager>
        </Canvas>

        {/* Status Overlays */}
        <AnimatePresence>
          {(gameState === 'CRASHED' || gameState === 'CASHOUT') && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="bg-black/80 backdrop-blur-md border border-white/10 p-8 rounded-3xl text-center shadow-2xl pointer-events-auto">
                <h2 className={`text-3xl font-black mb-2 ${gameState === 'CASHOUT' ? 'text-emerald-400' : 'text-rose-500'}`}>
                  {gameState === 'CASHOUT' ? "WINNER!" : "CRASHED"}
                </h2>
                {gameState === 'CASHOUT' && (
                  <div className="text-5xl font-black text-emerald-400 mb-6">
                    +{winAmount.toLocaleString()}
                  </div>
                )}
                <Button variant="neon" size="lg" onClick={resetGame} className="w-full">
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control Panel */}
      <div className="w-full lg:w-96 bg-[#1e293b] p-4 lg:p-6 flex flex-col gap-4 z-10 border-l border-white/5 shadow-2xl relative overflow-y-auto custom-scrollbar h-[50vh] lg:h-full">
        <h2 className="text-xl font-bold text-white mb-4">3D Towers</h2>

        <div className="space-y-4">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/10 text-center">
            <div className="text-sm text-slate-400 mb-1">Current Multiplier</div>
            <div className="text-3xl font-black text-emerald-400">{currentMultiplier.toFixed(2)}x</div>
            <div className="text-sm font-bold text-white mt-1">Payout: {Math.floor(bet * currentMultiplier)}</div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-black"
              onClick={cashout}
              disabled={gameState !== 'PLAYING' || activeRow === 0}
            >
              Cashout
            </Button>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-slate-400">Bet Amount</span>
              <span className="font-bold text-emerald-400">{bet} Tokens</span>
            </div>
            <BetControl betAmount={bet} setBetAmount={setBet} minBet={10} maxBet={10000} disabled={gameState === 'PLAYING'} />
          </div>

          <Button
            variant="neon"
            size="lg"
            className="w-full py-6 text-lg font-black tracking-widest uppercase"
            onClick={startGame}
            disabled={gameState === 'PLAYING'}
          >
            {gameState === 'PLAYING' ? 'Playing...' : 'Start Game'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Subcomponent for each block
const TowerBlock = React.forwardRef<RapierRigidBody, { 
  block: BlockData, 
  isActive: boolean, 
  isCrashed: boolean,
  onClick: () => void 
}>(({ block, isActive, isCrashed, onClick }, ref) => {
  
  // Calculate position: center tower
  // Rows stack vertically (y). Cols are side-by-side (x).
  const size = 1.2;
  const gap = 0.1;
  const startX = -((COLS * size + (COLS - 1) * gap) / 2) + (size / 2);
  const x = startX + block.col * (size + gap);
  const y = size / 2 + block.row * (size + 0.05);
  const z = 0;

  // Determine appearance based on state
  let color = "#334155"; // Default unrevealed
  if (isActive) color = "#60a5fa"; // Blue highlight for active row
  if (block.revealed) {
    if (block.isBomb) color = "#ef4444"; // Red bomb
    else color = "#10b981"; // Green safe
  }
  
  // For physics, we want them fixed (kinematic) until crashed, then dynamic so they fall
  const type = isCrashed ? "dynamic" : "fixed";

  return (
    <RigidBody 
      ref={ref} 
      type={type} 
      position={[x, y, z]} 
      colliders="cuboid" 
      restitution={0.4} 
      friction={0.8}
    >
      <mesh 
        castShadow 
        receiveShadow 
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
        onPointerOver={() => {
          if (isActive) document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial 
          color={color} 
          roughness={0.2} 
          metalness={0.5} 
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={0.5}
        />
        
        {/* Render symbol if revealed */}
        {block.revealed && (
          <Text
            position={[0, 0, size / 2 + 0.01]}
            fontSize={0.6}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {block.isBomb ? "💣" : "💎"}
          </Text>
        )}
      </mesh>
    </RigidBody>
  );
});
