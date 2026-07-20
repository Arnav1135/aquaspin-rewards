import { useRef, Suspense } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/cannon';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';

import { Table } from './Table';
import { PoolBall, getRackPositions } from './Balls';
import { CueStick, CueRef } from './Cue';
import { CameraController } from './CameraController';
import { PoolUIOverlay } from './PoolUIOverlay';
import { useFrame } from '@react-three/fiber';

import { usePoolStore } from './store';

function GameManager({ ballsRef }: { ballsRef: React.MutableRefObject<any[]> }) {
   const stopTimer = useRef(0);
   
   useFrame((_state, delta) => {
      if (usePoolStore.getState().gameState === 'moving') {
         let maxSpeed = 0;
         for (let i = 0; i < ballsRef.current.length; i++) {
            const b = ballsRef.current[i];
            if (b && b.getSpeed) {
               const s = b.getSpeed();
               if (s > maxSpeed) maxSpeed = s;
            }
         }
         
         // If all balls are moving slower than 0.05 m/s
         if (maxSpeed < 0.05) {
             stopTimer.current += delta;
             if (stopTimer.current > 0.5) { // wait 0.5 sec of rest
                usePoolStore.getState().resolveTurn();
                stopTimer.current = 0;
             }
         } else {
             stopTimer.current = 0;
         }
      }
   });
   return null;
}

export function PoolGame({ onClose }: { onClose: () => void }) {
  const cueBallRef = useRef<any>(null);
  const ballsRef = useRef<any[]>([]);
  const cueStickRef = useRef<CueRef>(null);
  const state = usePoolStore();
  const rackPos = getRackPositions();

  // Wait for user to start game from menu

  return (
    <div className="flex flex-col lg:flex-row gap-6 p-4 w-full h-full absolute inset-0 bg-[#0a0a0a]">
      
      <Card className="w-full lg:w-80 p-5 bg-slate-900 border-slate-800 shrink-0 flex flex-col gap-4 z-10">
         <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 uppercase">8 Ball Pool 3D</h2>
         <div className="text-sm text-slate-300 space-y-2">
           <p><strong>State:</strong> {state.gameState}</p>
           <p><strong>Turn:</strong> Player {state.currentPlayer}</p>
           <p><strong>P1 Group:</strong> {state.players[1].group || 'Open'}</p>
           <p><strong>P2 Group:</strong> {state.players[2].group || 'Open'}</p>
           <p><strong>First Contact:</strong> {state.currentShotEvents.firstContactId ?? 'None'}</p>
           <p><strong>Potted:</strong> {state.currentShotEvents.ballsPocketed.join(', ') || 'None'}</p>
         </div>
         {state.gameState === 'moving' && (
           <Button onClick={() => state.resolveTurn()}>Debug: Force Stop Balls (Resolve Turn)</Button>
         )}
         {state.gameState === 'ballInHand' && (
           <Button onClick={() => state.placeBallInHand()}>Place Ball In Hand</Button>
         )}
         <Button onClick={onClose} variant="ghost" className="mt-auto">Exit Table</Button>
      </Card>

      <Card className="flex-1 bg-slate-950 border-slate-900 overflow-hidden relative w-full h-full min-h-[600px] select-none">
        <Canvas 
          shadows
          dpr={[1, 2]} // Performance: limits resolution scale on very high res screens
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
               key={state.gameId}
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
                     ref={(el) => {
                        ballsRef.current[i] = el;
                        if (i === 0) cueBallRef.current = el;
                     }} 
                   />
                ))}
                
                {state.gameState === 'aiming' && (
                   <CueStick cueBallRef={cueBallRef} ref={cueStickRef} />
                )}
                
                <GameManager ballsRef={ballsRef} />
             </Physics>

             <CameraController cueBallRef={cueBallRef} />
             
             {/* High-End Post Processing Stack */}
             <EffectComposer multisampling={0}> {/* Reduced multisampling to 0 for better performance */}
               <N8AO aoRadius={0.1} intensity={2} />
               <Bloom luminanceThreshold={0.8} mipmapBlur intensity={0.5} />
             </EffectComposer>
          </Suspense>
        </Canvas>
        
        {/* HTML UI Overlay */}
        <PoolUIOverlay 
          onShoot={(power) => {
            if (cueStickRef.current) cueStickRef.current.shoot(power);
          }}
        />
      </Card>
    </div>
  );
}