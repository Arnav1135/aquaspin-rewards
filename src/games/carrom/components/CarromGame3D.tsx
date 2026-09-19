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

import { motion, AnimatePresence } from 'framer-motion';

function CarromUIOverlay() {
  const turnState = useCarromStore(state => state.turnState);
  const power = useCarromStore(state => state.power);
  const players = useCarromStore(state => state.players);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-50">
      {/* Top Bar - Scores and Status */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex justify-between items-start w-full"
      >
        {/* Player 1 Score Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-w-[120px]">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{players[0]?.name || 'Player 1'}</h3>
          <div className="text-3xl font-black text-white">{players[0]?.score || 0}</div>
        </div>

        {/* Status Indicator */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full">
          <span className="text-white font-bold tracking-widest uppercase text-sm">{turnState.replace('_', ' ')}</span>
        </div>

        {/* Player 2 Score Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] min-w-[120px] text-right">
          <h3 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">{players[1]?.name || 'Player 2'}</h3>
          <div className="text-3xl font-black text-white">{players[1]?.score || 0}</div>
        </div>
      </motion.div>

      {/* Bottom Bar - Power and Controls */}
      <AnimatePresence>
        {(turnState === 'AIMING' || turnState === 'SHOOTING') && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            className="flex flex-col items-center gap-4 w-full max-w-md mx-auto"
          >
            {/* Power Meter */}
            <div className="w-full bg-black/40 backdrop-blur-xl border border-white/20 p-4 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
              <div className="flex justify-between text-white/80 text-xs font-bold uppercase tracking-widest mb-2">
                <span>Power</span>
                <span>{Math.round(power)}%</span>
              </div>
              <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
                <motion.div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-300"
                  style={{ width: `${power}%` }}
                />
              </div>
            </div>
            
            {/* Action Button */}
            <div className="pointer-events-auto">
               {/* Controls are typically handled by CarromControls.tsx (drag on striker), 
                   but we can add a visual hint here */}
               <div className="text-white/50 text-xs uppercase tracking-widest bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
                  Drag Striker to Shoot
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
