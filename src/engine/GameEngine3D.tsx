import { ReactNode } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Environment, PerformanceMonitor } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { AssetManager } from './core/AssetLoader';

export interface GameEngine3DProps {
  children: ReactNode;
  enablePostProcessing?: boolean;
  cameraPosition?: [number, number, number];
  cameraFov?: number;
  environmentPreset?: 'city' | 'night' | 'sunset' | 'dawn' | 'warehouse';
  enablePhysics?: boolean;
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
}: GameEngine3DProps) {
  return (
    <Canvas
      shadows={{ type: THREE.PCFSoftShadowMap }}
      camera={{ position: cameraPosition, fov: cameraFov }}
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
        shadow-mapSize={[1024, 1024]}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {environmentPreset && <Environment preset={environmentPreset} />}

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
      {enablePostProcessing ? (
        <EffectComposer>
          <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.2} />
        </EffectComposer>
      ) : null}
    </Canvas>
  );
}
