import { ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette, SSAO, DepthOfField } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { PerformanceMonitor, Environment, Bvh, Caustics } from '@react-three/drei';
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
  enableCaustics?: boolean;
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
  enableCaustics = false,
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

        <Environment preset="night" />

        {/* Game Content wrapped in AssetManager (Suspense) and optional Physics */}
        <AssetManager>
          {enablePhysics ? (
            <Physics>
              <Bvh firstHitOnly>
                {enableCaustics ? (
                  <Caustics
                    color={[0.2, 0.8, 1]}
                    lightSource={[10, 20, 10]}
                    intensity={0.5}
                    worldRadius={0.3}
                    ior={1.2}
                    backside
                    causticsOnly={false}
                  >
                    {children}
                  </Caustics>
                ) : (
                  children
                )}
              </Bvh>
            </Physics>
          ) : (
            <Bvh firstHitOnly>
              {enableCaustics ? (
                  <Caustics
                    color={[0.2, 0.8, 1]}
                    lightSource={[10, 20, 10]}
                    intensity={0.5}
                    worldRadius={0.3}
                    ior={1.2}
                    backside
                    causticsOnly={false}
                  >
                    {children}
                  </Caustics>
                ) : (
                  children
                )}
            </Bvh>
          )}
        </AssetManager>

        {/* Optional Post-Processing */}
        {(enablePostProcessing && profile.enablePostProcessing) ? (
          <EffectComposer multisampling={8}>
            <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} radialModulation={false} modulationOffset={0} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
            {/* Added High-End Effects */}
            {/* Added High-End Effects */}
            <SSAO 
              samples={31} 
              radius={10} 
              intensity={20} 
              luminanceInfluence={0.5} 
              worldDistanceThreshold={10}
              worldDistanceFalloff={20}
              worldProximityThreshold={1}
              worldProximityFalloff={2}
            />
            <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
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
