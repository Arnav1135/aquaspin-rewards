import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Environment, OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Board3D } from './Board3D';
import { Striker3D } from './Striker3D';
import { CoinManager } from './CoinManager';
import { CarromControls } from './CarromControls';
import { TurnManager } from './TurnManager';
import { CarromVFXSystem } from './CarromVFXSystem';
import { CarromAudioSystem } from './CarromAudioSystem';
import { CarromCameraController } from './CarromCameraController';
import { CarromPerformanceManager } from './CarromPerformanceManager';
import { CarromPostProcessing } from './CarromPostProcessing';
import { carromAI } from '../ai/CarromAI';
import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useFrame } from '@react-three/fiber';

function AILoop() {
  useFrame(() => {
    carromAI.update();
  });
  return null;
}

export function CarromGame3D() {
  const turnState = useCarromStore(state => state.turnState);

  return (
    <div style={{ width: '100%', height: '100%', background: '#111' }}>
      <Canvas shadows dpr={[1, 2]}>
        <AILoop />
        <CarromPerformanceManager />
        <Suspense fallback={null}>
          <CarromCameraController />
          <OrbitControls 
            enablePan={false} 
            maxPolarAngle={Math.PI / 2.1} 
            minDistance={0.5} 
            maxDistance={2} 
            enabled={turnState === 'IDLE'} // Disable when actively playing to let CameraController take over
          />
          
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[5, 10, 5]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize={[2048, 2048]} 
          />
          
          {/* We will load a proper HDR environment later for premium reflections */}
          <Environment preset="city" />

          {/* Physics Engine (Rapier) */}
          <Physics timeStep={CARROM_PHYSICS.PHYSICS.TIME_STEP} colliders={false}>
            <Board3D />
            <CoinManager />
            <Striker3D />
            <CarromControls />
            <TurnManager />
            <CarromVFXSystem />
            <CarromAudioSystem />
          </Physics>

          <CarromPostProcessing />
        </Suspense>
      </Canvas>
      
      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
        <h2>Carrom 3D Pro</h2>
        <p>Status: {turnState}</p>
        <p>Power: {Math.round(useCarromStore(state => state.power))}%</p>
      </div>
    </div>
  );
}
