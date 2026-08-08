import { ReactNode, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { PerformanceMonitor, Preload } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { LightingSystem } from './LightingSystem';
import { CameraSystem } from './CameraSystem';

export interface AquaSpinEngineProps {
  children: ReactNode;
  quality?: 'high' | 'medium' | 'low';
  enablePhysics?: boolean;
  enablePostProcessing?: boolean;
  bloomIntensity?: number;
  cameraMode?: 'default' | 'cinematic' | 'follow' | 'impact';
  environmentPreset?: 'city' | 'night' | 'warehouse' | 'studio' | 'sunset';
  physicsGravity?: [number, number, number];
  orthographic?: boolean;
  zoom?: number;
}

export function AquaSpinEngine({
  children,
  quality = 'high',
  enablePhysics = false,
  enablePostProcessing = true,
  bloomIntensity = 1.0,
  cameraMode = 'default',
  environmentPreset = 'studio',
  physicsGravity = [0, -9.81, 0],
  orthographic = false,
  zoom = 45
}: AquaSpinEngineProps) {
  
  const dpr = useMemo(() => {
    if (quality === 'low') return 1;
    return typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio) : 1;
  }, [quality]);

  const shadowMapSize = quality === 'high' ? 2048 : (quality === 'medium' ? 1024 : 512);

  return (
    <div className="absolute inset-0 bg-black overflow-hidden select-none touch-none">
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        dpr={dpr}
        gl={{
          antialias: quality === 'high',
          powerPreference: "high-performance",
          alpha: true
        }}
      >
        <Suspense fallback={null}>
          <PerformanceMonitor onDecline={() => {}} />
          
          <LightingSystem preset={environmentPreset} shadowMapSize={shadowMapSize} quality={quality} />
          
          <CameraSystem mode={cameraMode} orthographic={orthographic} zoom={zoom} />

          {enablePhysics ? (
            <Physics gravity={physicsGravity} timeStep="vary">
              {children}
            </Physics>
          ) : (
            children
          )}

          {enablePostProcessing && (
            <EffectComposer multisampling={quality === 'high' ? 4 : 0}>
              <Bloom 
                intensity={bloomIntensity} 
                luminanceThreshold={0.6} 
                luminanceSmoothing={0.9} 
                mipmapBlur={quality !== 'low'} 
              />
              <Vignette eskil={false} offset={0.1} darkness={0.65} />
            </EffectComposer>
          )}
          
          <Preload all />
        </Suspense>
      </Canvas>
    </div>
  );
}
