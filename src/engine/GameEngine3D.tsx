import { ReactNode, useMemo } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { PerformanceMonitor, Environment, Bvh } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { AssetManager } from './core/AssetLoader';
import { DeviceCapabilityDetector } from './core/DeviceCapabilityDetector';
import { EnvironmentAtmosphere } from './core/EnvironmentAtmosphere';
import { DebugCanvasOverlay, DebugOverlay } from './debug/DebugOverlay';
import { TouchControls } from './input/TouchControls';
import { createXRStore, XR } from '@react-three/xr';

const store = createXRStore();

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

        <Environment preset="night" />

        {/* Game Content wrapped in AssetManager (Suspense) and optional Physics */}
        <AssetManager>
          <XR store={store}>
            {enablePhysics ? (
              <Physics>
                <Bvh firstHitOnly>
                  {children}
                </Bvh>
              </Physics>
            ) : (
              <Bvh firstHitOnly>
                {children}
              </Bvh>
            )}
          </XR>
        </AssetManager>

        {/* Optional Post-Processing */}
        {(enablePostProcessing && profile.enablePostProcessing) ? (
          <EffectComposer multisampling={8}>
            <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur />
            <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={new THREE.Vector2(0.002, 0.002)} radialModulation={false} modulationOffset={0} />
            <Vignette eskil={false} offset={0.1} darkness={1.1} />
          </EffectComposer>
        ) : null}

        {enableDebugOverlay && <DebugCanvasOverlay />}
      </Canvas>

      {/* Layered UI / Touch Controls */}
      {enableTouchControls && profile.isTouch && <TouchControls />}
      {enableDebugOverlay && <DebugOverlay />}
      
      {/* WebXR Enter VR Button */}
      <button 
        onClick={() => store.enterVR()}
        className="absolute bottom-4 right-4 z-50 bg-blue-600/80 hover:bg-blue-500 text-white backdrop-blur-md px-4 py-2 rounded-xl font-bold shadow-[0_0_15px_rgba(59,130,246,0.5)] border border-blue-400/50 transition-all flex items-center gap-2"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 21c.8-1.5 1.5-2.9 3.5-3.8 2-1 3-2 3.5-3.2.5-1.2.5-2.5-.5-3.5a4 4 0 0 0-5.5-.5l-2.5 2.5a3 3 0 0 1-4-4l2.5-2.5a4 4 0 0 0-.5-5.5C8 1 6 1 4.5 2.5 3 4 3 6 4 8c1.5 2.5 3.5 3 4.5 5 1 2 1.5 3.5 1 4.5-.5 1-1.5 2-2.5 3.5z"/><path d="M4 10v6a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4V10"/><path d="M4 14h16"/></svg>
        Enter VR
      </button>
    </div>
  );
}
