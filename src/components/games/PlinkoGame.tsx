import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Coins } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

type RiskLevel = 'low' | 'medium' | 'high';

const MULTS: Record<RiskLevel, Record<number, number[]>> = {
  low: { 
    8: [5.6, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 5.6], 
    10: [8.9, 3.0, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 3.0, 8.9], 
    12: [10, 5, 2, 1.6, 1.1, 1.0, 0.5, 1.0, 1.1, 1.6, 2, 5, 10] 
  },
  medium: { 
    8: [13, 3, 1.3, 0.7, 0.4, 0.7, 1.3, 3, 13], 
    10: [22, 5, 2, 1.4, 0.9, 0.4, 0.9, 1.4, 2, 5, 22], 
    12: [33, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 33] 
  },
  high: { 
    8: [29, 4, 1.5, 0.3, 0.2, 0.3, 1.5, 4, 29], 
    10: [76, 10, 3, 0.9, 0.3, 0.2, 0.3, 0.9, 3, 10, 76], 
    12: [170, 33, 11, 4, 2, 0.2, 0.2, 0.2, 2, 4, 11, 33, 170] 
  }
};

const PEG_RADIUS = 0.15;
const PEG_SPACING_X = 1.2;
const PEG_SPACING_Y = 1.0;

function PlinkoBoard({ rows, multipliers, onBallLanded, blinkingIdx }: { rows: number, multipliers: number[], onBallLanded: (idx: number, id: string) => void, blinkingIdx: number | null }) {
  const pegPositions = useMemo(() => {
    const positions: THREE.Vector3[] = [];
    for (let r = 0; r <= rows; r++) {
      const cols = r + 3;
      const startX = -((cols - 1) * PEG_SPACING_X) / 2;
      for (let c = 0; c < cols; c++) {
        positions.push(new THREE.Vector3(startX + c * PEG_SPACING_X, -r * PEG_SPACING_Y, 0));
      }
    }
    return positions;
  }, [rows]);

  const numBuckets = multipliers.length;
  const startBucketX = -((numBuckets - 1) * PEG_SPACING_X) / 2;
  const bucketY = -(rows * PEG_SPACING_Y) - 1.5;

  return (
    <group position={[0, 4, 0]}>
      {/* Backplate */}
      <RigidBody type="fixed">
        <mesh position={[0, -rows/2 * PEG_SPACING_Y, -0.5]} receiveShadow>
          <boxGeometry args={[rows * PEG_SPACING_X + 4, rows * PEG_SPACING_Y + 4, 0.2]} />
          <meshStandardMaterial color="#0A1428" roughness={0.8} />
        </mesh>
      </RigidBody>

      {/* Individual Pegs */}
      {pegPositions.map((pos, idx) => (
        <RigidBody key={idx} type="fixed" colliders="hull" position={pos}>
          <mesh receiveShadow castShadow>
             <cylinderGeometry args={[PEG_RADIUS, PEG_RADIUS, 0.5, 16]} />
             <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.8} />
          </mesh>
        </RigidBody>
      ))}

      {/* Buckets/Sensors */}
      {multipliers.map((mult, i) => {
        const x = startBucketX + i * PEG_SPACING_X;
        return (
          <group key={`bucket-${i}`} position={[x, bucketY, 0]}>
            <RigidBody 
              type="fixed" 
              sensor 
              onIntersectionEnter={(e) => {
                if (e.other.rigidBodyObject?.userData?.isBall) {
                  onBallLanded(i, e.other.rigidBodyObject.name);
                }
              }}
            >
              <CuboidCollider args={[PEG_SPACING_X / 2 - 0.1, 0.5, 0.5]} />
            </RigidBody>
            <Html center position={[0, -0.8, 0]} className="pointer-events-none">
              <div className={`px-2 py-1 rounded font-bold text-xs shadow-lg backdrop-blur-md transition-all duration-300 ${mult >= 2 ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'} ${blinkingIdx === i ? 'scale-125 ring-4 ring-yellow-400 brightness-150' : 'scale-100'}`}>
                {mult}x
              </div>
            </Html>
            {/* Divider lines with steep physics cap to prevent stuck balls */}
            <RigidBody type="fixed" position={[PEG_SPACING_X/2, 0, 0]} colliders="hull">
               {/* Main vertical divider */}
               <mesh>
                 <boxGeometry args={[0.1, 1.5, 0.5]} />
                 <meshStandardMaterial color="#1E293B" />
               </mesh>
               {/* Steep slanted cap so balls roll off */}
               <mesh position={[0, 0.75, 0]} rotation={[0, 0, Math.PI / 4]}>
                 <boxGeometry args={[0.15, 0.15, 0.5]} />
                 <meshStandardMaterial color="#1E293B" />
               </mesh>
            </RigidBody>
          </group>
        );
      })}
    </group>
  );
}

function PlinkoBall({ id, position, onDespawn }: { id: string, position: [number, number, number], onDespawn: (id: string) => void }) {
  const rbRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      onDespawn(id);
    }, 15000); // 15s max lifetime failsafe
    return () => clearTimeout(timer);
  }, [id, onDespawn]);

  return (
    <RigidBody 
      ref={rbRef} 
      position={position} 
      colliders="ball" 
      restitution={0.6} 
      friction={0.2}
      userData={{ isBall: true }}
      name={id}
      enabledTranslations={[true, true, false]}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} />
      </mesh>
    </RigidBody>
  );
}

interface PlinkoGameProps { onClose: () => void; }

export function PlinkoGame({ onClose }: PlinkoGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [risk, setRisk] = useState<RiskLevel>('medium');
  const [rows, setRows] = useState(8);
  const [balls, setBalls] = useState<{ id: string, bet: number }[]>([]);
  const [isDropping, setIsDropping] = useState(false);
  const [blinkingIdx, setBlinkingIdx] = useState<number | null>(null);
  
  const multipliers = MULTS[risk][rows];

  const handleDrop = async () => {
    if (!profile || profile.tokens < betAmount) {
      toast.error('Insufficient tokens');
      return;
    }

    try {
      // Deduct bet
      const newBalance = profile.tokens - betAmount;
      (updateProfile as any)({ tokens: newBalance });
      await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);
      
      (playTone as any)(440, 'sine', 0.1);
      
      const id = Math.random().toString(36).substr(2, 9);
      setBalls(prev => [...prev, { id, bet: betAmount }]);
    } catch (e) {
      console.error(e);
      toast.error('Transaction failed');
    }
  };

  const removeBall = useCallback((id: string) => {
    setBalls(prev => prev.filter(b => b.id !== id));
  }, []);

  const handleBallLanded = useCallback(async (bucketIdx: number, ballId: string) => {
    const ball = balls.find(b => b.id === ballId);
    if (!ball) return;
    
    // Remove immediately so it doesn't double-trigger
    removeBall(ballId);
    
    // Trigger multiplier blink
    setBlinkingIdx(bucketIdx);
    setTimeout(() => setBlinkingIdx(null), 500);

    const mult = multipliers[bucketIdx];
    const winAmount = Math.floor(ball.bet * mult);
    
    if (winAmount > 0) {
      (playTone as any)(mult >= 2 ? 600 : 300, 'sine', 0.2);
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
  }, [balls, multipliers, profile, updateProfile, removeBall]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/80 backdrop-blur-md">
      <Card className="relative w-full max-w-4xl h-[85vh] flex flex-col md:flex-row gap-0 overflow-hidden shadow-2xl border-navy-600 bg-navy-900 rounded-2xl">
        
        {/* Left Side: 3D Canvas */}
        <div className="relative flex-1 h-[50vh] md:h-full bg-navy-950 overflow-hidden">
          <GameEngine3D 
            enablePhysics={true} 
            enablePostProcessing={true}
            cameraPosition={[0, 0, 14]}
          >
            <PlinkoBoard rows={rows} multipliers={multipliers} onBallLanded={handleBallLanded} blinkingIdx={blinkingIdx} />
            
            {balls.map(ball => (
              <PlinkoBall 
                key={ball.id} 
                id={ball.id} 
                position={[(Math.random() - 0.5) * 0.5, 7, 0]} 
                onDespawn={removeBall} 
              />
            ))}
          </GameEngine3D>
          
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2 text-white bg-red-500/20 hover:bg-red-500/50 rounded-full backdrop-blur-md transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between bg-navy-900 border-l border-navy-700 h-[35vh] md:h-full overflow-y-auto">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                <span className="text-cyan-400">●</span> 3D Plinko
              </h2>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-navy-800 rounded-full border border-navy-600">
                <Coins size={14} className="text-gold-400" />
                <span className="text-sm font-medium text-white">{profile?.tokens.toLocaleString()}</span>
              </div>
            </div>

            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={5000} />

            <div className="mt-6 space-y-4">
              <div>
                <label className="text-xs text-navy-300 font-medium mb-2 block uppercase tracking-wider">Risk Level</label>
                <div className="flex bg-navy-800 p-1 rounded-lg">
                  {(['low', 'medium', 'high'] as RiskLevel[]).map(r => (
                    <button
                      key={r}
                      onClick={() => setRisk(r)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors capitalize ${risk === r ? 'bg-navy-600 text-white shadow-sm' : 'text-navy-400 hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-navy-300 font-medium mb-2 block uppercase tracking-wider">Rows</label>
                <div className="flex bg-navy-800 p-1 rounded-lg">
                  {[8, 10, 12].map(r => (
                    <button
                      key={r}
                      onClick={() => setRows(r)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${rows === r ? 'bg-navy-600 text-white shadow-sm' : 'text-navy-400 hover:text-white'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              variant="primary" 
              size="lg" 
              fullWidth 
              onClick={handleDrop}
              className="py-4 text-lg font-bold shadow-[0_0_20px_rgba(0,240,255,0.3)]"
            >
              Drop Ball
            </Button>
          </div>
        </div>

      </Card>
    </div>
  );
}
