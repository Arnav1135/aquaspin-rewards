import React from 'react';
import { Environment } from '@react-three/drei';
import { useEnvironmentProfile } from './CarromEnvironmentSystem';

interface Props {
  heroMode?: boolean;
}

export function CarromHeroStudio({ heroMode = false }: Props) {
  const profile = useEnvironmentProfile();
  
  const intensityMultiplier = heroMode ? 1.2 : 1.0;
  
  return (
    <>
      <ambientLight intensity={0.2 * intensityMultiplier} />
      
      {/* Key Light (Strong overhead dramatic light) */}
      <spotLight 
        position={[3, 15, 3]} 
        intensity={4.0 * intensityMultiplier} 
        angle={0.4}
        penumbra={0.8}
        castShadow 
        shadow-mapSize={[4096, 4096]} // PCF Soft shadows (Phase 5)
        shadow-bias={-0.0001}
        color="#ffecd1" // Warm indoor casino light
      />
      
      {/* Fill Light (Soft cool reflection) */}
      <spotLight 
        position={[-5, 10, -5]} 
        intensity={2.0 * intensityMultiplier} 
        angle={0.5}
        penumbra={1.0}
        castShadow={false}
        color="#e0f2fe"
      />
      
      {/* Rim Light (Glints on edges of coins/striker) */}
      <spotLight 
        position={[0, 5, -8]} 
        intensity={3.0 * intensityMultiplier} 
        angle={0.6}
        penumbra={0.5}
        castShadow={false}
        color="#ffffff"
      />

      {/* HDR Environment (Phase 4) */}
      <Environment preset="studio" />
    </>
  );
}
