import { useRef, Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

import { Table } from './Table';
import { PoolBall, getRackPositions } from './Balls';
import { CueStick } from './Cue';

export function PoolGame({ onClose }: { onClose: () => void }) {
  const cueBallRef = useRef<any>(null);
  
  const rackPos = getRackPositions();

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-[1400px] mx-auto min-h-[calc(100vh-120px)]">
      
      <Card className="w-full lg:w-80 p-5 bg-slate-900 border-slate-800 shrink-0 flex flex-col gap-4">
         <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase">8 Ball Pool 3D</h2>
         <p className="text-sm text-slate-400">Layer 1-10 Implementation Demo</p>
         <Button onClick={onClose} variant="ghost" className="mt-auto">Exit Table</Button>
      </Card>

      <Card className="flex-1 bg-slate-950 border-slate-900 overflow-hidden relative min-h-[600px]">
        <Canvas 
          shadows
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true,
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.2,
          }}
          camera={{ fov: 45, position: [0, 1.5, 2] }}
        >
          <color attach="background" args={['#0a0a0a']} />
          <Suspense fallback={null}>
             {/* IBL Environment */}
             <Environment preset="studio" />
             
             {/* Main Overhead Lights (Layer 4) */}
             <spotLight position={[0, 2, 0]} intensity={10} angle={Math.PI / 5} penumbra={0.4} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0005} />
             <ambientLight intensity={0.3} />
             
             {/* Physics Engine (Layer 2) */}
             <Physics 
               gravity={[0, -9.82, 0]} 
               defaultContactMaterial={{ friction: 0.3, restitution: 0.85 }}
               allowSleep
               stepSize={1/120} // 120hz physics loop
             >
                <Table />
                {rackPos.map((pos, i) => (
                   <PoolBall 
                     key={i} 
                     id={i} 
                     position={pos} 
                     ref={i === 0 ? cueBallRef : undefined} 
                   />
                ))}
                
                <CueStick cueBallRef={cueBallRef} onShoot={(f) => console.log('Shot fired:', f)} />
             </Physics>

             <OrbitControls 
               minPolarAngle={Math.PI / 6}
               maxPolarAngle={Math.PI / 2.2}
               enablePan={false}
               minDistance={1.2}
               maxDistance={4}
             />
          </Suspense>
        </Canvas>
      </Card>
    </div>
  );
}