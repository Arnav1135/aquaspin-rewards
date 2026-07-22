import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Button } from '@/components/ui/Button';
import { PoolTable3D } from './pool/PoolTable3D';
import { PoolBall3D } from './pool/PoolBall3D';
import { PoolControls } from './pool/PoolControls';
import { PoolAIEngine } from './pool/PoolAIEngine';
import { usePoolStore } from './pool/store';
import { useMemo } from 'react';

const BALL_COLORS = [
  '#ffffff', // Cue
  '#FFD700', '#2196F3', '#F44336', '#9C27B0', '#FF5722', '#4CAF50', '#795548', '#111111',
  '#FFD700', '#2196F3', '#F44336', '#9C27B0', '#FF5722', '#4CAF50', '#795548'
];

interface Props { onClose: () => void; }

export function PoolGame({ onClose }: Props) {
  const phase = usePoolStore((state) => state.phase);
  const score = usePoolStore((state) => state.score);
  const shots = usePoolStore((state) => state.shots);
  const power = usePoolStore((state) => state.power);
  const resetGame = usePoolStore((state) => state.resetGame);
  const setPhase = usePoolStore((state) => state.setPhase);

  // Generate initial rack positions
  const rackPositions = useMemo(() => {
    const pos: [number, number, number][] = [];
    let id = 1;
    const startZ = -4; // Apex of triangle
    const r = 0.36; // Ball radius + slight gap
    const sqrt3 = Math.sqrt(3);

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = (col - row / 2) * (r * 2);
        const z = startZ - row * (r * sqrt3);
        pos.push([x, BALL_RADIUS, z]);
        id++;
      }
    }
    return pos;
  }, []);

  const BALL_RADIUS = 0.35;

  return (
    <div className="flex flex-col items-center gap-4 relative">
      <div className="w-[360px] h-[660px] rounded-2xl overflow-hidden relative shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-[#0a0a0a]">
        
        {/* HUD Overlay */}
        <div className="absolute top-4 left-4 z-10 bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold text-sm border border-white/10 pointer-events-none">
          🎱 {score}pts | Shot {shots}
        </div>

        {/* Phase Overlays */}
        {phase === 'idle' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-white mb-2 tracking-wider">3D POOL</h2>
            <p className="text-gray-300 mb-6 text-sm">Hyper-realistic AI Engine</p>
            <Button onClick={() => setPhase('aiming')} variant="neon" size="lg" className="px-8">
              Play Now
            </Button>
          </div>
        )}

        {phase === 'win' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <h2 className="text-3xl font-bold text-green-400 mb-2">TABLE CLEARED!</h2>
            <p className="text-white mb-6">Score: {score}</p>
            <Button onClick={resetGame} variant="neon" size="lg">Play Again</Button>
          </div>
        )}

        {/* Power Bar */}
        {phase === 'aiming' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-48 h-3 bg-black/60 rounded-full overflow-hidden border border-white/20 z-10">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-red-500 transition-all duration-75"
              style={{ width: `${power * 100}%` }}
            />
          </div>
        )}

        {/* AI Rendering Engine */}
          <Canvas shadows camera={{ position: [0, 10, 15], fov: 45 }}>
            {/* Environment & Lighting */}
            <color attach="background" args={['#050505']} />
            <ambientLight intensity={0.4} />
            <directionalLight 
              castShadow 
              position={[5, 10, 5]} 
              intensity={1.5} 
              shadow-mapSize={[1024, 1024]} 
            />
            <Environment preset="studio" />

            {/* Physics World */}
            <Physics gravity={[0, -9.81, 0]}>
              <PoolAIEngine />
              <PoolTable3D />
              
              {/* Cue Ball */}
              {phase !== 'idle' && (
                <PoolBall3D id={0} position={[0, BALL_RADIUS, 5]} color={BALL_COLORS[0]} isCue={true} />
              )}
              
              {/* Rack Balls */}
              {phase !== 'idle' && rackPositions.map((pos, idx) => (
                <PoolBall3D key={idx + 1} id={idx + 1} position={pos} color={BALL_COLORS[idx + 1]} />
              ))}
            </Physics>

            {/* Post Processing & Effects */}
            <ContactShadows resolution={512} scale={20} blur={2} opacity={0.5} far={10} color="#000000" />
            <EffectComposer>
              <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.9} height={300} intensity={0.5} />
            </EffectComposer>

            <PoolControls />
          </Canvas>

      </div>

      <div className="flex gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>Exit</Button>
      </div>
    </div>
  );
}
