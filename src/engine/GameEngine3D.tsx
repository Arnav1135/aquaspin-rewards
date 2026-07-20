import { ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { PerformanceMonitor } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { AssetManager } from './core/AssetLoader';
import { DeviceCapabilityDetector } from './core/DeviceCapabilityDetector';
import { EnvironmentAtmosphere } from './core/EnvironmentAtmosphere';
import { DebugCanvasOverlay, DebugOverlay } from './debug/DebugOverlay';
import { TouchControls } from './input/TouchControls';

export interface GameEngine3DProps {
  children: ReactNode;
  enablePostProcessing?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  environmentPreset?: 'city' | 'night' | 'sunset' | 'dawn' | 'warehouse' | 'forest';
  enablePhysics?: boolean;
  enableDebugOverlay?: boolean;
  enableTouchControls?: boolean;
  enableAtmosphere?: boolean;
  fogColor?: string;
}

/**
 * 3D Game Engine Wrapper
 * Phase 1 backward compatibility: This component is purely additive. It wraps existing
 * games providing upgraded rendering without breaking their specific geometries.
 * Step 1 Upgrades: PCFSoftShadowMap, ACESFilmicToneMapping, and optional EffectComposer post-processing.
 */
export function GameEngine3D({
  children,
  enablePostProcessing = false,
  cameraPosition = [0, 0, 7],
  cameraFov = 50,
  environmentPreset = 'city',
  enablePhysics = false,
  enableDebugOverlay = false,
  enableTouchControls = false,
  enableAtmosphere = true,
  fogColor,
}: GameEngine3DProps) {
  const profile = useMemo(() => DeviceCapabilityDetector.detect(), []);

  return (
    <div className="relative w-full h-full">
      {/* Three.js Canvas Layer */}
      <Canvas
        shadows={{ type: THREE.PCFSoftShadowMap }}
        camera={{ position: cameraPosition, fov: cameraFov }}
        dpr={profile.recommendedDpr}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[profile.shadowMapSize, profile.shadowMapSize]}
          shadow-camera-far={50}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        
        {enableAtmosphere && (
          <EnvironmentAtmosphere
            preset={environmentPreset}
            enableFog={!!fogColor}
            fogColor={fogColor}
          />
        )}

        <PerformanceMonitor onDecline={() => {}} />

        {/* Game Content wrapped in AssetManager (Suspense) and optional Physics */}
        <AssetManager>
          {enablePhysics ? (
            <Physics>
              {children}
            </Physics>
          ) : (
            children
          )}
        </AssetManager>

        {/* Optional Post-Processing */}
        {(enablePostProcessing && profile.enablePostProcessing) ? (
          <EffectComposer>
            <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
          </EffectComposer>
        ) : null}

        {enableDebugOverlay && <DebugCanvasOverlay />}
      </Canvas>

      {/* Layered UI / Touch Controls */}
      {enableTouchControls && profile.isTouch && <TouchControls />}
      {enableDebugOverlay && <DebugOverlay />}
    </div>
  );
}
