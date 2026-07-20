// src/engine/core/EnvironmentAtmosphere.tsx
import { Environment, Sky } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export interface EnvironmentAtmosphereProps {
  preset?: 'city' | 'night' | 'sunset' | 'dawn' | 'warehouse' | 'forest';
  hdriPath?: string;
  enableFog?: boolean;
  fogColor?: string;
  fogNear?: number;
  fogFar?: number;
  fogDensity?: number;
  fogType?: 'linear' | 'exponential';
  enableSky?: boolean;
  skySunPosition?: [number, number, number];
  dynamicDayNightSpeed?: number;
}

export function EnvironmentAtmosphere({
  preset = 'city',
  hdriPath,
  enableFog = false,
  fogColor = '#0a0d14',
  fogNear = 10,
  fogFar = 50,
  fogDensity = 0.02,
  fogType = 'linear',
  enableSky = false,
  skySunPosition = [0, 1, 0],
  dynamicDayNightSpeed = 0,
}: EnvironmentAtmosphereProps) {
  const skyRef = useRef<THREE.DirectionalLight>(null);

  useFrame((state, _delta) => {
    // Fog dynamic sync
    if (enableFog && state.scene) {
      if (fogType === 'exponential') {
        if (!(state.scene.fog instanceof THREE.FogExp2)) {
          state.scene.fog = new THREE.FogExp2(fogColor, fogDensity);
        } else {
          state.scene.fog.color.set(fogColor);
          state.scene.fog.density = fogDensity;
        }
      } else {
        if (!(state.scene.fog instanceof THREE.Fog)) {
          state.scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);
        } else {
          state.scene.fog.color.set(fogColor);
          state.scene.fog.near = fogNear;
          state.scene.fog.far = fogFar;
        }
      }
    }

    // Dynamic day/night light animation
    if (dynamicDayNightSpeed > 0 && skyRef.current) {
      const time = state.clock.getElapsedTime() * dynamicDayNightSpeed;
      skyRef.current.position.x = Math.cos(time) * 20;
      skyRef.current.position.y = Math.sin(time) * 20;
      skyRef.current.position.z = Math.sin(time * 0.5) * 10;
    }
  });

  return (
    <>
      {hdriPath ? (
        <Environment files={hdriPath} />
      ) : preset ? (
        <Environment preset={preset} />
      ) : null}

      {enableSky && (
        <Sky
          distance={450000}
          sunPosition={skySunPosition}
          inclination={0}
          azimuth={0.25}
        />
      )}

      {dynamicDayNightSpeed > 0 && (
        <directionalLight
          ref={skyRef}
          intensity={1.2}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
      )}
    </>
  );
}
