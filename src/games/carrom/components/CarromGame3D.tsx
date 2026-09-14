import React, { Suspense, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { Board3D } from './Board3D';
import { Striker3D } from './Striker3D';
import { CoinManager } from './CoinManager';
import { CarromControls } from './CarromControls';
import { TurnManager } from './TurnManager';
import { CarromAudioSystem } from './CarromAudioSystem';
import { CarromCameraController } from './CarromCameraController';
import { PocketNetSystem } from './PocketNetSystem';
import { VictoryCinematic } from './VictoryCinematic';
import { StrikerAimSystem } from './StrikerAimSystem';
import { CarromWaterSystem } from './CarromWaterSystem';
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
import { CarromPostProcessing } from './CarromPostProcessing';
import { CarromVFXSystem, triggerVFX } from './CarromVFXSystem';
import { QualityManager, VFXManager, ParticleManager } from '../../../engine/aaa';

import * as THREE from 'three';

function AILoop() {
  useFrame(() => {
    carromAI.update();
  });
  return null;
}

function VictoryVFX() {
  const turnState = useCarromStore(state => state.turnState);

  useEffect(() => {
    if (turnState === 'GAME_OVER') {
      let count = 0;
      const vfxInterval = setInterval(() => {
        triggerVFX({ type: 'victory', position: [0, 0, 0], intensity: 10 });
        count++;
        if (count >= 20) {
          clearInterval(vfxInterval);
        }
      }, 500);
      return () => clearInterval(vfxInterval);
    }
  }, [turnState]);
  
  return null;
}

function CarromUIOverlay() {
  const turnState = useCarromStore(state => state.turnState);
  const power = useCarromStore(state => state.power);

  return (
    <div style={{ position: 'absolute', top: 20, left: 20, color: 'white', fontFamily: 'sans-serif', pointerEvents: 'none' }}>
      <h2>Carrom 3D Pro</h2>
      <p>Status: {turnState}</p>
      <p>Power: {Math.round(power)}%</p>
    </div>
  );
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
            antialias: true,
            powerPreference: 'high-performance',
            preserveDrawingBuffer: false
          }}
        >
        <QualityManager>
          <VFXManager>
            <AILoop />
            <VictoryVFX />
            <Suspense fallback={null}>
              <CarromCameraController />
              
              {/* Phase 1-2: HDR Environment + Hero Studio Lighting */}
              <CarromHeroStudio />
              <CarromEnvironmentSystem />

              {/* Phase 13-15: Contact Shadows */}
              <CarromContactShadows />
              
              {/* Specialized Carrom VFX */}
              <CarromVFXSystem />

              {/* Physics Engine (Rapier) */}
              <Physics timeStep={CARROM_PHYSICS.PHYSICS.TIME_STEP} colliders={false}>
                <Board3D />
                <CoinManager />
                <Striker3D />
                <CarromControls />
                <TurnManager />
                <ParticleManager />
                <CarromAudioSystem />
                {/* Phase 21-23: Advanced Aim System */}
                <StrikerAimSystem />
                <PocketNetSystem />
                <CarromWaterSystem />
              </Physics>

              {/* Phase 36-38: Post-Processing with Color Grading */}
              <CarromPostProcessing />

              {/* Phase 48-49: Debug Overlay (F9 toggle) */}
              <CarromDebugOverlay />
            </Suspense>
          </VFXManager>
        </QualityManager>
      </Canvas>
      
      {/* Phase 31: Victory Cinematic Overlay */}
      <VictoryCinematic />

      {/* UI Overlay */}
      <CarromUIOverlay />
    </div>
    </CarromRenderGuard>
  );
}
