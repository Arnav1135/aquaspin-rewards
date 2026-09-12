import { ReactNode, useMemo, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, ToneMapping, SSR, SSAO, DepthOfField, ChromaticAberration, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
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

  const shadowMapSize = quality === 'high' ? 4096 : (quality === 'medium' ? 2048 : 512);

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
              <ToneMapping 
                blendFunction={BlendFunction.NORMAL} 
                adaptive={true} 
                resolution={256}
                middleGrey={0.6}
                maxLuminance={16.0}
                averageLuminance={1.0}
                adaptationRate={1.0}
              />
              <BrightnessContrast brightness={0.02} contrast={0.1} />
              <HueSaturation hue={0} saturation={0.05} />
              
              {quality === 'high' ? (
                <SSR 
                  intensity={1.5} 
                  exponent={1} 
                  distance={10} 
                  fade={10} 
                  roughnessFade={1} 
                  thickness={10} 
                  ior={1.45} 
                  maxRoughness={1} 
                  maxDepthDifference={10} 
                  blend={0.9} 
                  correction={1} 
                  correctionRadius={1} 
                  blur={0.5} 
                  blurKernel={1} 
                  blurSharpness={10} 
                  jitter={0.1} 
                  jitterRoughness={0.1} 
                  steps={20} 
                  refineSteps={5} 
                  missedRays={true} 
                  useNormalMap={true} 
                  useRoughnessMap={true} 
                  resolutionScale={1} 
                  velocityResolutionScale={1} 
                />
              ) : <></>}
              
              {cameraMode === 'cinematic' && quality === 'high' ? (
                <DepthOfField focusDistance={0} focalLength={0.04} bokehScale={3} height={480} />
              ) : <></>}

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
