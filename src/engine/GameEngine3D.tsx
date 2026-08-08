import { ReactNode, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas } from '@react-three/fiber';
import {
  EffectComposer,
  Bloom,
  ChromaticAberration,
  Vignette,
  SSAO,
  DepthOfField,
  SSR,
  GodRays,
} from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { PerformanceMonitor, Environment, Bvh, Caustics } from '@react-three/drei';
import { Physics } from '@react-three/rapier';
import { AssetManager } from './core/AssetLoader';
import { DeviceCapabilityDetector } from './core/DeviceCapabilityDetector';
import { EnvironmentAtmosphere } from './core/EnvironmentAtmosphere';
import { DebugCanvasOverlay, DebugOverlay } from './debug/DebugOverlay';
import { TouchControls } from './input/TouchControls';
import { AquaSpinQuality, RENDER_QUALITY_PROFILES, resolveQuality } from './core/QualityProfiles';

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
  enableSSR?: boolean;
  enableGodRays?: boolean;
  fogColor?: string;
  quality?: AquaSpinQuality;
}

/**
 * Shared 3D renderer for Aqua Spin games.
 *
 * Visual quality is controlled by one profile so individual games can opt into
 * AUTO/HIGH/ULTRA without creating duplicate rendering or performance systems.
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
  enableSSR = false,
  enableGodRays = false,
  fogColor,
  quality = 'auto',
}: GameEngine3DProps) {
  const deviceProfile = useMemo(() => DeviceCapabilityDetector.detect(), []);
  const resolvedQuality = useMemo(
    () => resolveQuality(quality, deviceProfile.tier),
    [quality, deviceProfile.tier],
  );
  const renderProfile = RENDER_QUALITY_PROFILES[resolvedQuality];
  const [sunMesh, setSunMesh] = useState<THREE.Mesh | null>(null);

  const usePostProcessing = enablePostProcessing && renderProfile.enablePostProcessing;
  const useSSR = enableSSR && renderProfile.enableSSR;
  const useGodRays = enableGodRays && renderProfile.enableGodRays;

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows={{ type: renderProfile.shadowType === 'soft' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap }}
        camera={{ position: cameraPosition, fov: cameraFov }}
        dpr={Math.min(deviceProfile.recommendedDpr, renderProfile.pixelRatioCap)}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={['#08111d']} />
        <ambientLight intensity={0.35} />
        <hemisphereLight args={['#d9efff', '#08111d', 0.5]} />
        <directionalLight
          position={[10, 20, 10]}
          intensity={2}
          castShadow
          shadow-mapSize={[renderProfile.shadowMapSize, renderProfile.shadowMapSize]}
          shadow-camera-far={60}
          shadow-camera-left={-12}
          shadow-camera-right={12}
          shadow-camera-top={12}
          shadow-camera-bottom={-12}
          shadow-bias={-0.00015}
          shadow-normalBias={0.02}
        />

        {useGodRays && (
          <mesh ref={setSunMesh} position={[10, 20, 10]}>
            <sphereGeometry args={[2, 32, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )}

        {enableAtmosphere && (
          <EnvironmentAtmosphere
            preset={environmentPreset}
            enableFog={!!fogColor}
            fogColor={fogColor}
          />
        )}

        <PerformanceMonitor onDecline={() => {}} />
        <Environment preset={environmentPreset} />

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
                ) : children}
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
              ) : children}
            </Bvh>
          )}
        </AssetManager>

        {usePostProcessing && (
          <EffectComposer multisampling={renderProfile.quality === 'ultra' ? 8 : 4}>
            {renderProfile.enableBloom && (
              <Bloom
                luminanceThreshold={0.85}
                luminanceSmoothing={0.7}
                intensity={0.8}
                mipmapBlur
              />
            )}
            {renderProfile.enableChromaticAberration && (
              <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={new THREE.Vector2(0.0005, 0.0005)}
                radialModulation={false}
                modulationOffset={0}
              />
            )}
            <Vignette eskil={false} offset={0.18} darkness={0.55} />
            <SSAO
              samples={renderProfile.quality === 'ultra' ? 24 : 16}
              radius={4}
              intensity={1.5}
              luminanceInfluence={0.35}
              worldDistanceThreshold={8}
              worldDistanceFalloff={12}
              worldProximityThreshold={1}
              worldProximityFalloff={2}
            />
            {renderProfile.enableDepthOfField && (
              <DepthOfField focusDistance={0.02} focalLength={0.02} bokehScale={1.5} height={480} />
            )}
            {useSSR && <SSR intensity={0.7} />}
            {useGodRays && sunMesh && (
              <GodRays
                sun={sunMesh}
                blendFunction={BlendFunction.SCREEN}
                samples={40}
                density={0.8}
                decay={0.9}
                weight={0.25}
                exposure={0.45}
                clampMax={1}
              />
            )}
          </EffectComposer>
        )}

        {enableDebugOverlay && <DebugCanvasOverlay />}
      </Canvas>

      {enableTouchControls && deviceProfile.isTouch && <TouchControls />}
      {enableDebugOverlay && <DebugOverlay />}
    </div>
  );
}
