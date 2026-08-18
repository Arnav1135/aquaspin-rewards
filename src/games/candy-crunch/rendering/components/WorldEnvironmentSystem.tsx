import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Sky, Stars, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

interface WorldEnvironmentSystemProps {
  theme: string;
  isNight?: boolean;
}

export const WorldEnvironmentSystem: React.FC<WorldEnvironmentSystemProps> = ({ theme, isNight = false }) => {
  const fogColor = useMemo(() => {
    if (theme.includes('Frozen')) return isNight ? '#0b132b' : '#a0c4ff';
    if (theme.includes('Gummy')) return isNight ? '#2a0a4a' : '#c8b6ff';
    if (theme.includes('Caramel')) return isNight ? '#3a1f04' : '#ffb703';
    return isNight ? '#020024' : '#ffc8dd';
  }, [theme, isNight]);

  return (
    <>
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 10, 30]} />

      {/* Global Lighting */}
      <ambientLight intensity={isNight ? 0.2 : 0.6} />
      <directionalLight
        position={[5, 10, 5]}
        intensity={isNight ? 0.5 : 1.5}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        color={isNight ? '#a0c4ff' : '#ffffff'}
      />
      <directionalLight
        position={[-5, 5, -5]}
        intensity={isNight ? 0.2 : 0.5}
        color={theme.includes('Caramel') ? '#ffb703' : '#ffc8dd'}
      />

      {/* Dynamic Sky / Environment */}
      {!isNight && theme.includes('Frozen') && (
        <Sky sunPosition={[10, 1, 10]} turbidity={0.1} rayleigh={0.1} mieCoefficient={0.005} mieDirectionalG={0.8} />
      )}
      {isNight && (
        <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
      )}

      {/* Weather / Particles */}
      {theme.includes('Frozen') && (
        <Sparkles count={200} scale={20} size={2} speed={0.4} opacity={0.5} color="#ffffff" />
      )}
      {theme.includes('Galactic') && (
        <Sparkles count={500} scale={30} size={1} speed={1.5} opacity={0.8} color="#a0c4ff" />
      )}
      {theme.includes('Gummy') && (
        <Sparkles count={100} scale={15} size={3} speed={0.2} opacity={0.6} color="#c8b6ff" />
      )}
      
      {/* Fallback Environment reflection */}
      <Environment preset={isNight ? "night" : "sunset"} />
    </>
  );
};
