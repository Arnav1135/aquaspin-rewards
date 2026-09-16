import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Environment, ContactShadows, SoftShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface LightingSystemProps {
  preset: 'city' | 'night' | 'warehouse' | 'studio' | 'sunset';
  shadowMapSize: number;
  quality: 'high' | 'medium' | 'low';
}

export function LightingSystem({ preset, shadowMapSize, quality }: LightingSystemProps) {
  const dirLightRef = useRef<THREE.DirectionalLight>(null);

  // Soft shadows for high quality
  return (
    <>
      {/* Dynamic ambient color based on preset */}
      <ambientLight intensity={preset === "night" ? 0.2 : (preset === "sunset" ? 0.5 : 0.4)} color={preset === "sunset" ? "#ffedd6" : (preset === "night" ? "#d6e4ff" : "#ffffff")} />
      
      {/* Hemisphere light for rich GI feel */}
      <hemisphereLight color={preset === "sunset" ? "#ffb347" : "#ffffff"} groundColor={preset === "night" ? "#0a0a2a" : "#444444"} intensity={0.3} />
      
      {quality === 'high' && <SoftShadows size={15} samples={16} focus={0.5} />}

      <directionalLight
        ref={dirLightRef}
        castShadow
        position={[5, 12, 8]}
        intensity={1.8}
        shadow-mapSize={[shadowMapSize, shadowMapSize]}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0005}
      />
      
      <Environment preset={preset} />

      {quality !== 'low' && (
        <ContactShadows 
          position={[0, -0.05, 0]} 
          opacity={0.65} 
          scale={20} 
          blur={quality === "high" ? 4.0 : 2.5} 
          far={10} 
          resolution={quality === 'high' ? 512 : 256} 
          color="#000000"
        />
      )}
    </>
  );
}
