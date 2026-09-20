import React, { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { Button } from '@/components/ui/Button';
import { BetControl } from '@/components/ui/BetControl';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { QualityManager, PostFXManager, VFXManager } from '@/engine/aaa';
import { RigidBody, Physics, RapierRigidBody } from '@react-three/rapier';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

type GameState = 'IDLE' | 'ROLLING' | 'PAYOUT';
type BetType = 'small' | 'big' | 'triple' | number;

const BET_MULTIPLIERS: Record<string, number> = {
  'small': 2, // 4-10
  'big': 2,   // 11-17
  'triple': 30, // Any triple
  '4': 60,
  '5': 30,
  '6': 18,
  '7': 12,
  '8': 8,
  '9': 6,
  '10': 6,
  '11': 6,
  '12': 6,
  '13': 8,
  '14': 12,
  '15': 18,
  '16': 30,
  '17': 60
};

export function SicBo3DGame() {
  const { profile } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [bet, setBet] = useState(10);
  const [selectedBet, setSelectedBet] = useState<BetType>('small');
  
  const [results, setResults] = useState<[number, number, number]>([1, 1, 1]);
  const [winAmount, setWinAmount] = useState(0);

  const diceRefs = [
    useRef<RapierRigidBody>(null),
    useRef<RapierRigidBody>(null),
    useRef<RapierRigidBody>(null)
  ];

  const rollDice = async () => {
    if (!profile) return toast.error("Please login.");
    if (gameState !== 'IDLE') return;
    if (profile.tokens < bet) return toast.error("Insufficient tokens.");

    const success = await secureUpdateTokens(profile.id, -bet);
    if (!success) return toast.error("Transaction failed.");

    setGameState('ROLLING');
    audio.play('sicbo', 'click-spin');
    vibrate(20);

    // Toss dice
    diceRefs.forEach((ref) => {
      if (ref.current) {
        ref.current.setTranslation({ x: (Math.random()-0.5), y: 3 + Math.random(), z: (Math.random()-0.5) }, true);
        ref.current.setLinvel({ x: (Math.random()-0.5)*5, y: 5 + Math.random()*5, z: (Math.random()-0.5)*5 }, true);
        ref.current.setAngvel({ x: Math.random()*20, y: Math.random()*20, z: Math.random()*20 }, true);
      }
    });

    // Wait for physics to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Read faces
    const finalFaces: [number, number, number] = [1, 1, 1];
    
    diceRefs.forEach((ref, idx) => {
      if (ref.current) {
        const rot = ref.current.rotation();
        const q = new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w);
        
        // Define faces mapping based on standard BoxGeometry UVs/Normals
        // Face normals for BoxGeometry: 
        // +x, -x, +y, -y, +z, -z
        const directions = [
          { dir: new THREE.Vector3(1, 0, 0), val: 1 },
          { dir: new THREE.Vector3(-1, 0, 0), val: 6 },
          { dir: new THREE.Vector3(0, 1, 0), val: 2 },
          { dir: new THREE.Vector3(0, -1, 0), val: 5 },
          { dir: new THREE.Vector3(0, 0, 1), val: 3 },
          { dir: new THREE.Vector3(0, 0, -1), val: 4 }
        ];

        let maxDot = -Infinity;
        let topFace = 1;
        const up = new THREE.Vector3(0, 1, 0);

        directions.forEach(d => {
          const v = d.dir.clone().applyQuaternion(q);
          const dot = v.dot(up);
          if (dot > maxDot) {
            maxDot = dot;
            topFace = d.val;
          }
        });
        
        finalFaces[idx] = topFace;
      }
    });

    setResults(finalFaces);

    // Calculate win
    const sum = finalFaces[0] + finalFaces[1] + finalFaces[2];
    const isTriple = finalFaces[0] === finalFaces[1] && finalFaces[1] === finalFaces[2];
    
    let won = false;
    let multiplier = 0;

    if (selectedBet === 'small' && sum >= 4 && sum <= 10 && !isTriple) {
      won = true;
      multiplier = BET_MULTIPLIERS['small'];
    } else if (selectedBet === 'big' && sum >= 11 && sum <= 17 && !isTriple) {
      won = true;
      multiplier = BET_MULTIPLIERS['big'];
    } else if (selectedBet === 'triple' && isTriple) {
      won = true;
      multiplier = BET_MULTIPLIERS['triple'];
    } else if (typeof selectedBet === 'number' && sum === selectedBet) {
      won = true;
      multiplier = BET_MULTIPLIERS[selectedBet.toString()];
    }

    const win = won ? bet * multiplier : 0;
    setWinAmount(win);

    if (win > 0) {
      
      audio.play('sicbo', 'win-jackpot');
      vibrate([50, 100, 50]);
    } else {
      audio.play('sicbo', 'click-lose');
    }

    await secureRecordGameResult({ userId: profile.id, betAmount: 0, earnedAmount: win }) /* AUTOFIX: bet=0 to prevent double charge */;
    setGameState('PAYOUT');
  };

  const resetGame = () => {
    setGameState('IDLE');
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row relative bg-[#0f172a] overflow-hidden rounded-xl">
      <div className="relative flex-1 min-h-[400px] lg:min-h-full">
        <Canvas camera={{ position: [0, 4, 6], fov: 50 }}>
          <ambientLight intensity={1} />
          <directionalLight position={[5, 10, 5]} intensity={2} castShadow />
          <Environment preset="night" />
          <QualityManager>
            <VFXManager>
              <PostFXManager />
              <Physics>
                {/* Ground */}
                <RigidBody type="fixed" friction={0.5} restitution={0.4}>
                  <mesh position={[0, -0.5, 0]} receiveShadow>
                    <cylinderGeometry args={[4, 4, 1, 32]} />
                    <meshStandardMaterial color="#1e293b" roughness={0.2} metalness={0.8} />
                  </mesh>
                </RigidBody>

                {/* Glass Dome */}
                <RigidBody type="fixed" colliders="trimesh">
                  <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[3.8, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <meshPhysicalMaterial 
                      transparent 
                      opacity={0.1} 
                      roughness={0} 
                      metalness={0.1} 
                      side={THREE.DoubleSide}
                    />
                  </mesh>
                </RigidBody>

                {/* Dice */}
                <Dice ref={diceRefs[0]} position={[-1, 1, 0]} color="#ef4444" />
                <Dice ref={diceRefs[1]} position={[0, 1, 1]} color="#eab308" />
                <Dice ref={diceRefs[2]} position={[1, 1, -1]} color="#3b82f6" />
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
                <div className="flex gap-4 justify-center mb-4">
                  {results.map((r, i) => (
                    <div key={i} className="w-12 h-12 bg-white text-black font-black text-2xl flex items-center justify-center rounded-lg shadow-lg">
                      {r}
                    </div>
                  ))}
                </div>
                <h2 className="text-3xl font-black text-white mb-2">
                  {winAmount > 0 ? "WINNER!" : "NO LUCK"}
                </h2>
                <div className="text-5xl font-black text-emerald-400 mb-6">
                  +{winAmount.toLocaleString()}
                </div>
                <Button variant="neon" size="lg" onClick={resetGame} className="w-full">
                  Play Again
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="w-full lg:w-96 bg-[#1e293b] p-4 lg:p-6 flex flex-col gap-4 z-10 border-l border-white/5 shadow-2xl relative overflow-y-auto custom-scrollbar h-[50vh] lg:h-full">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          3D Sic Bo
          <HelpCircle size={16} className="text-white/40 cursor-help" />
        </h2>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedBet('small')}
              disabled={gameState !== 'IDLE'}
              className={`p-4 rounded-xl font-black text-xl transition-all border-2 ${selectedBet === 'small' ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-800 border-slate-700 text-white/60 hover:text-white'}`}
            >
              SMALL <span className="block text-xs font-normal text-white/50">4-10 (2x)</span>
            </button>
            <button
              onClick={() => setSelectedBet('big')}
              disabled={gameState !== 'IDLE'}
              className={`p-4 rounded-xl font-black text-xl transition-all border-2 ${selectedBet === 'big' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-800 border-slate-700 text-white/60 hover:text-white'}`}
            >
              BIG <span className="block text-xs font-normal text-white/50">11-17 (2x)</span>
            </button>
          </div>
          
          <button
              onClick={() => setSelectedBet('triple')}
              disabled={gameState !== 'IDLE'}
              className={`w-full p-3 rounded-xl font-black text-lg transition-all border-2 ${selectedBet === 'triple' ? 'bg-amber-500 border-amber-400 text-white' : 'bg-slate-800 border-slate-700 text-white/60 hover:text-white'}`}
            >
              ANY TRIPLE <span className="block text-xs font-normal text-white/50">30x Payout</span>
          </button>

          <div className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-2 mt-4">Specific Sums</div>
          <div className="grid grid-cols-4 gap-2">
            {[4,5,6,7,8,9,10,11,12,13,14,15,16,17].map(num => (
              <button
                key={num}
                onClick={() => setSelectedBet(num)}
                disabled={gameState !== 'IDLE'}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center border-2 transition-all ${selectedBet === num ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-white/60 hover:text-white'}`}
              >
                <span className="font-bold">{num}</span>
                <span className="text-[10px] opacity-70">{BET_MULTIPLIERS[num.toString()]}x</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 space-y-4">
          <div>
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
            onClick={rollDice}
            disabled={gameState !== 'IDLE'}
          >
            {gameState === 'IDLE' ? 'Roll Dice' : 'Rolling...'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple Box Geometry Dice with dots mapped via simple materials
// In a real AAA game, you'd use a GLTF model with proper textures. 
// For this procedurally generated 3D demo, we'll just color the faces.
const Dice = React.forwardRef<RapierRigidBody, { position: [number, number, number], color: string }>(
  ({ position, color }, ref) => {
    // Array of 6 materials for each face
    const materials = React.useMemo(() => {
      return Array(6).fill(0).map(() => new THREE.MeshStandardMaterial({
        color: color,
        roughness: 0.1,
        metalness: 0.2
      }));
    }, [color]);

    return (
      <RigidBody ref={ref} position={position} colliders="cuboid" restitution={0.6} friction={0.5}>
        <mesh castShadow receiveShadow material={materials}>
          <boxGeometry args={[0.8, 0.8, 0.8]} />
        </mesh>
      </RigidBody>
    );
  }
);
