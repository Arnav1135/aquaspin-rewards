import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { GameEngine3D } from '@/engine/GameEngine3D';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

type GameState = 'BETTING' | 'SPINNING' | 'SETTLING' | 'PAYOUT';

type WheelTile = { num: number; color: 'red' | 'black' | 'green' };

// European Layout
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

// --- Bets Logic ---

type BetType = 'straight' | 'dozen' | 'column' | 'red_black' | 'even_odd' | 'high_low';

interface PlacedBet {
  id: string;
  type: BetType;
  amount: number;
  label: string;
  numbers: number[]; // Numbers covered
}

const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const BLACK_NUMS = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

// --- 3D Components ---

function CameraController({ gameState }: { gameState: GameState }) {
  useFrame(({ camera }) => {
    let targetPos = new THREE.Vector3(0, 8, 5);
    let targetLook = new THREE.Vector3(0, 0, 0);

    if (gameState === 'SPINNING') {
      targetPos.set(4, 5, 4);
    } else if (gameState === 'SETTLING' || gameState === 'PAYOUT') {
      targetPos.set(0, 3, 2);
    }

    camera.position.lerp(targetPos, 0.05);
    
    // Smooth lookAt
    const cameraQuat = camera.quaternion.clone();
    camera.lookAt(targetLook);
    const targetQuat = camera.quaternion.clone();
    camera.quaternion.copy(cameraQuat).slerp(targetQuat, 0.05);
  });
  return null;
}

function RouletteBowl() {
  return (
    <group>
      <mesh position={[0, -0.2, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 4.4, 0.4, 64]} />
        <meshStandardMaterial color="#2b1105" metalness={0.1} roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.1, 0]} receiveShadow>
        <cylinderGeometry args={[4.2, 3.1, 0.4, 64]} />
        <meshStandardMaterial color="#111" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

function RouletteWheel3D({ gameState, wheelRotRef }: { gameState: GameState, wheelRotRef: any }) {
  const currentRotation = useRef(0);
  
  useFrame((_, delta) => {
    if (!wheelRotRef.current) return;
    
    let speed = 0.5;
    if (gameState === 'SPINNING') speed = 2.0;
    if (gameState === 'SETTLING') speed = 0.8;
    if (gameState === 'PAYOUT') speed = 0.0;
    
    if (speed > 0) {
      currentRotation.current += speed * delta;
      wheelRotRef.current.rotation.y = currentRotation.current;
    }
  });

  return (
    <group ref={wheelRotRef}>
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1, 1.2, 0.4, 32]} />
        <meshStandardMaterial color="#d4af37" metalness={0.9} roughness={0.2} />
      </mesh>

      {WHEEL_TILES.map((tile, i) => {
        const angle = i * SECTOR_ANGLE;
        const color = tile.color === 'red' ? '#b91c1c' : tile.color === 'green' ? '#047857' : '#1e2d45';
        
        return (
          <group key={i} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.1, -2.6]} receiveShadow>
              <boxGeometry args={[0.55, 0.1, 1]} />
              <meshStandardMaterial color={color} roughness={0.5} />
            </mesh>
            <Text
              position={[0, 0.16, -2.6]}
              rotation={[-Math.PI / 2, 0, 0]}
              fontSize={0.25}
              color="white"
              anchorX="center"
              anchorY="middle"
              font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjQ.ttf"
            >
              {tile.num.toString()}
            </Text>
            <mesh position={[0.3, 0.2, -2.6]} receiveShadow castShadow rotation={[0, SECTOR_ANGLE / 2, 0]}>
              <boxGeometry args={[0.04, 0.2, 1]} />
              <meshStandardMaterial color="#d4af37" metalness={0.8} roughness={0.2} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BallKinematic({ gameState, winIdx, wheelRotRef }: { gameState: GameState, winIdx: number | null, wheelRotRef: any }) {
  const ballRef = useRef<any>(null);
  const time = useRef(0);
  
  useFrame((_, delta) => {
    if (!ballRef.current || winIdx === null) return;
    
    if (gameState === 'SPINNING') {
      time.current += delta;
      const angle = -time.current * 4; // Counter-clockwise
      const radius = 3.8;
      ballRef.current.position.set(Math.sin(angle) * radius, 0.35, Math.cos(angle) * radius);
    } else if (gameState === 'SETTLING') {
      // Deterministic interpolation into target pocket
      const wheelRot = wheelRotRef?.current?.rotation.y || 0;
      const pocketLocalAngle = winIdx * SECTOR_ANGLE;
      const absoluteAngle = wheelRot + pocketLocalAngle;
      
      const targetRadius = 2.6;
      const targetX = Math.sin(absoluteAngle) * targetRadius;
      const targetZ = Math.cos(absoluteAngle) * targetRadius;
      
      ballRef.current.position.lerp(new THREE.Vector3(targetX, 0.15, targetZ), 0.05);
    } else if (gameState === 'PAYOUT') {
      // Stick to pocket
      const wheelRot = wheelRotRef?.current?.rotation.y || 0;
      const pocketLocalAngle = winIdx * SECTOR_ANGLE;
      const absoluteAngle = wheelRot + pocketLocalAngle;
      
      const targetRadius = 2.6;
      const targetX = Math.sin(absoluteAngle) * targetRadius;
      const targetZ = Math.cos(absoluteAngle) * targetRadius;
      
      ballRef.current.position.set(targetX, 0.15, targetZ);
    } else {
      // Hidden or resting
      ballRef.current.position.set(0, 10, 0); // Hide above
      time.current = 0;
    }
  });

  return (
    <mesh ref={ballRef} castShadow receiveShadow position={[0, 10, 0]}>
      <sphereGeometry args={[0.12, 32, 32]} />
      <meshStandardMaterial color="#fffff0" metalness={0.1} roughness={0.1} />
    </mesh>
  );
}

// --- Main Game Component ---

export function RouletteGame({ onClose }: { onClose: () => void }) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [gameState, setGameState] = useState<GameState>('BETTING');
  
  const [placedBets, setPlacedBets] = useState<PlacedBet[]>([]);
  const [winIdx, setWinIdx] = useState<number | null>(null);
  
  const wheelRef = useRef<any>(null); // To pass to ball for absolute pos tracking

  const handlePlaceBet = (type: BetType, label: string, numbers: number[]) => {
    if (gameState !== 'BETTING') return;
    if (!profile) return;
    if (profile.tokens < betAmount) { toast.error('Insufficient tokens'); return; }
    
    const bet: PlacedBet = { id: Math.random().toString(), type, amount: betAmount, label, numbers };
    setPlacedBets(prev => [...prev, bet]);
    
    (updateProfile as any)({ tokens: profile.tokens - betAmount });
    (playTone as any)(400, 'sine', 0.1);
  };

  const clearBets = () => {
    if (gameState !== 'BETTING') return;
    if (!profile) return;
    const totalRefund = placedBets.reduce((sum, b) => sum + b.amount, 0);
    if (totalRefund > 0) {
      (updateProfile as any)({ tokens: profile.tokens + totalRefund });
      setPlacedBets([]);
    }
  };

  const handleSpin = () => {
    if (placedBets.length === 0) { toast.error('Place a bet first!'); return; }
    
    // RNG Determination (Result-First)
    const resultIdx = Math.floor(Math.random() * 37);
    setWinIdx(resultIdx);
    setGameState('SPINNING');
    (playTone as any)(280, 'sine', 0.2);
    
    setTimeout(() => {
      setGameState('SETTLING');
      (playTone as any)(600, 'sine', 0.1);
      
      setTimeout(() => {
        setGameState('PAYOUT');
        calculatePayouts(resultIdx);
      }, 3000);
    }, 4000);
  };

  const calculatePayouts = async (resultIdx: number) => {
    const winningNum = WHEEL_TILES[resultIdx].num;
    let totalWin = 0;
    let halfRefund = 0; // La Partage

    placedBets.forEach(bet => {
      if (bet.numbers.includes(winningNum)) {
        // Calculate standard payout ratio
        let multiplier = 0;
        switch (bet.type) {
          case 'straight': multiplier = 36; break;
          case 'dozen': case 'column': multiplier = 3; break;
          case 'red_black': case 'even_odd': case 'high_low': multiplier = 2; break;
        }
        totalWin += bet.amount * multiplier;
      } else if (winningNum === 0 && ['red_black', 'even_odd', 'high_low'].includes(bet.type)) {
        // La Partage rule
        halfRefund += bet.amount / 2;
      }
    });

    if (totalWin > 0 || halfRefund > 0) {
      const earned = totalWin + halfRefund;
      toast.success(`Payout: ${earned} tokens! ${halfRefund > 0 ? '(La Partage Applied)' : ''}`);
      (playTone as any)(523.25, 'sine', 0.3);
      vibrate([50, 50, 100]);
      
      if (profile) {
        await (supabase.from('users') as any).update({ tokens: profile.tokens + earned }).eq('id', profile.id);
        (updateProfile as any)({ tokens: profile.tokens + earned });
      }
    } else {
      toast.error(`Number ${winningNum}. House wins.`);
      (playTone as any)(160, 'sawtooth', 0.2);
    }

    setTimeout(() => {
      setPlacedBets([]);
      setGameState('BETTING');
    }, 4000);
  };

  const renderGrid = () => {
    // Generate 1-36 grid logically
    const grid = [];
    for (let i = 1; i <= 36; i++) grid.push(i);
    
    return (
      <div className="flex gap-2 w-full">
        <Button variant="ghost" className="h-full px-4 border border-emerald-500 bg-emerald-500/10 text-emerald-400 font-bold text-2xl" onClick={() => handlePlaceBet('straight', '0', [0])}>0</Button>
        <div className="grid grid-cols-12 gap-1 flex-1">
          {grid.map(num => (
            <Button 
              key={num} 
              variant="ghost" 
              className={`p-2 border font-bold text-sm h-12 ${RED_NUMS.includes(num) ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-slate-500/50 bg-slate-500/10 text-slate-300'}`}
              onClick={() => handlePlaceBet('straight', num.toString(), [num])}
            >
              {num}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/90 backdrop-blur-md">
      <Card className="relative w-full max-w-6xl h-[90vh] flex flex-col gap-0 overflow-hidden shadow-2xl border-navy-600 bg-navy-900 rounded-2xl">
        
        {/* 3D Canvas Viewport */}
        <div className="relative flex-1 bg-navy-950 overflow-hidden cursor-move">
          <GameEngine3D enablePhysics={false} enablePostProcessing={true} cameraPosition={[0, 8, 5]}>
            <CameraController gameState={gameState} />
            <group>
               <RouletteBowl />
               <group ref={wheelRef}>
                 <RouletteWheel3D gameState={gameState} wheelRotRef={wheelRef} />
               </group>
               <BallKinematic gameState={gameState} winIdx={winIdx} wheelRotRef={wheelRef} />
            </group>
          </GameEngine3D>
          
          {/* Betting Overlay */}
          <AnimatePresence>
            {gameState === 'BETTING' && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 50 }}
                className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700 p-6 rounded-xl shadow-2xl z-20 pointer-events-auto"
              >
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
                     <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={5000} />
                     <div className="flex gap-4">
                       <Button variant="ghost" className="text-red-400 border-red-500/30 font-bold uppercase tracking-wider" onClick={clearBets}>Clear Table</Button>
                       <Button variant="neon" size="lg" className="font-bold px-12 text-lg shadow-[0_0_20px_rgba(0,240,255,0.4)]" onClick={handleSpin} disabled={placedBets.length === 0}>SPIN</Button>
                     </div>
                  </div>
                  
                  {renderGrid()}
                  
                  <div className="grid grid-cols-6 gap-2">
                    <Button variant="ghost" className="border border-slate-700 text-slate-300 font-bold" onClick={() => handlePlaceBet('dozen', '1st 12', Array.from({length: 12}, (_,i)=>i+1))}>1st 12</Button>
                    <Button variant="ghost" className="border border-slate-700 text-slate-300 font-bold" onClick={() => handlePlaceBet('dozen', '2nd 12', Array.from({length: 12}, (_,i)=>i+13))}>2nd 12</Button>
                    <Button variant="ghost" className="border border-slate-700 text-slate-300 font-bold" onClick={() => handlePlaceBet('dozen', '3rd 12', Array.from({length: 12}, (_,i)=>i+25))}>3rd 12</Button>
                    <Button variant="ghost" className="border border-red-500/50 bg-red-500/5 text-red-400 font-bold" onClick={() => handlePlaceBet('red_black', 'RED', RED_NUMS)}>RED</Button>
                    <Button variant="ghost" className="border border-slate-500/50 bg-slate-500/5 text-slate-300 font-bold" onClick={() => handlePlaceBet('red_black', 'BLACK', BLACK_NUMS)}>BLACK</Button>
                    <Button variant="ghost" className="border border-slate-700 text-slate-300 font-bold" onClick={() => handlePlaceBet('even_odd', 'EVEN', Array.from({length: 18}, (_,i)=>(i+1)*2))}>EVEN</Button>
                  </div>
                  
                  <div className="text-sm font-bold text-slate-400 flex justify-between bg-slate-950 p-3 rounded-lg">
                    <span className="text-cyan-400">Total Wager: <span className="text-white">{placedBets.reduce((s, b) => s + b.amount, 0)}</span></span>
                    <span className="text-emerald-400 tracking-wider">La Partage Active</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Placed Bets Floating Labels */}
          {gameState === 'BETTING' && (
             <div className="absolute top-4 left-4 z-20 space-y-2 pointer-events-none">
                <h4 className="text-xs text-slate-500 font-bold tracking-widest uppercase">Active Bets</h4>
                {placedBets.map(bet => (
                  <div key={bet.id} className="text-xs bg-slate-800/80 border border-slate-600 px-3 py-1.5 rounded flex gap-2 items-center text-white backdrop-blur-md">
                     <span className="text-cyan-400 font-bold">{bet.amount}</span> 
                     <span className="text-slate-400">on</span>
                     <span className="font-bold">{bet.label}</span>
                  </div>
                ))}
             </div>
          )}

          <Button variant="ghost" className="absolute top-4 right-4 z-50 text-slate-500 bg-black/20 backdrop-blur-md" onClick={onClose}>Close</Button>
        </div>
      </Card>
    </div>
  );
}
