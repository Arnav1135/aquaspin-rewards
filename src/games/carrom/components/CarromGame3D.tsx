import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { OrbitControls } from '@react-three/drei';
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
import { PocketNetSystem } from './PocketNetSystem';
import { VictoryCinematic } from './VictoryCinematic';
import { StrikerAimSystem } from './StrikerAimSystem';
import { carromAI } from '../ai/CarromAI';
import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useFrame } from '@react-three/fiber';
import { CarromRenderGuard } from './CarromRenderGuard';
import { CarromHeroAssetManager } from '../assets/CarromHeroAssetManager';
import { CarromEnvironmentSystem } from '../environment/CarromEnvironmentSystem';
import { CarromHeroStudio } from '../environment/CarromHeroStudio';
import { CarromContactShadows } from '../rendering/CarromShadowSystem';
import { CarromDebugOverlay } from '../debug/CarromDebugOverlay';

function AILoop() {
  useFrame(() => {
    carromAI.update();
  });
  return null;
}

export function CarromGame3D() {
  const turnState = useCarromStore(state => state.turnState);

  useEffect(() => {
    CarromHeroAssetManager.prewarmAssets();
  }, []);

  return (
    <CarromRenderGuard>
      <div className="w-full h-full relative">
        <Canvas 
          shadows
          dpr={[1, 2]} // Support for mobile high-DPR (System 57)
          gl={{
            antialias: false,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: true
          }}
        >
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
          
          {/* Phase 1-2: HDR Environment + Hero Studio Lighting */}
          <CarromHeroStudio />
          <CarromEnvironmentSystem />

          {/* Phase 13-15: Contact Shadows */}
          <CarromContactShadows />

          {/* Physics Engine (Rapier) */}
          <Physics timeStep={CARROM_PHYSICS.PHYSICS.TIME_STEP} colliders={false}>
            <Board3D />
            <CoinManager />
            <Striker3D />
            <CarromControls />
            <TurnManager />
            <CarromVFXSystem />
            <CarromAudioSystem />
            {/* Phase 21-23: Advanced Aim System */}
            <StrikerAimSystem />
            {/* Phase 28-29: Pocket Net Animation */}
            <PocketNetSystem />
          </Physics>

          {/* Phase 36-38: Post-Processing with Color Grading */}
          <CarromPostProcessing />

          {/* Phase 48-49: Debug Overlay (F9 toggle) */}
          <CarromDebugOverlay />
        </Suspense>
      </Canvas>
      
      {/* Phase 31: Victory Cinematic Overlay */}
      <VictoryCinematic />

      {/* UI Overlay */}
      <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
        <h2>Carrom 3D Pro</h2>
        <p>Status: {turnState}</p>
        <p>Power: {Math.round(useCarromStore(state => state.power))}%</p>
      </div>
    </div>
    </CarromRenderGuard>
  );
}
