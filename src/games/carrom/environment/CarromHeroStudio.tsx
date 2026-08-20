import React from 'react';
import { useEnvironmentProfile } from './CarromEnvironmentSystem';

interface Props {
  heroMode?: boolean;
}

export function CarromHeroStudio({ heroMode = false }: Props) {
  const profile = useEnvironmentProfile();
  
  const intensityMultiplier = heroMode ? 1.2 : 1.0;
  
  return (
    <>
      <ambientLight intensity={profile.ambientIntensity * intensityMultiplier} />
      
      <directionalLight 
        position={[5, 10, 5]} 
        intensity={profile.lightIntensity * intensityMultiplier} 
        castShadow 
        shadow-mapSize={[2048, 2048]}
        color={profile.skyColor}
      />
      
      <directionalLight 
        position={[-5, 8, -5]} 
        intensity={(profile.lightIntensity * 0.4) * intensityMultiplier} 
        castShadow={false}
        color={profile.groundColor}
      />
      
      <directionalLight 
        position={[0, 5, -8]} 
        intensity={(profile.lightIntensity * 0.6) * intensityMultiplier} 
        castShadow={false}
        color="#ffffff"
      />
    </>
  );
}
