import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Environment } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type EnvironmentTheme = 'CASINO' | 'ARCADE' | 'STUDY' | 'NIGHTCLUB';

interface EnvironmentConfig {
  preset: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
  ambientIntensity: number;
  ambientColor: string;
  directionalIntensity: number;
  directionalColor: string;
  directionalPosition: [number, number, number];
  background?: string;
  fog?: { color: string, near: number, far: number };
}

const THEME_CONFIGS: Record<EnvironmentTheme, EnvironmentConfig> = {
  CASINO: {
    preset: 'lobby',
    ambientIntensity: 0.6,
    ambientColor: '#ffebd6',
    directionalIntensity: 1.2,
    directionalColor: '#ffffff',
    directionalPosition: [5, 15, 5],
    background: '#1a0b12',
    fog: { color: '#1a0b12', near: 20, far: 80 }
  },
  ARCADE: {
    preset: 'night',
    ambientIntensity: 0.4,
    ambientColor: '#4f1b8a',
    directionalIntensity: 2.5,
    directionalColor: '#00f0ff',
    directionalPosition: [-10, 10, 10],
    background: '#090014',
    fog: { color: '#090014', near: 10, far: 50 }
  },
  STUDY: {
    preset: 'apartment',
    ambientIntensity: 1.0,
    ambientColor: '#fff5e6',
    directionalIntensity: 0.8,
    directionalColor: '#fff8eb',
    directionalPosition: [10, 10, 5],
    background: '#f0e9df',
    fog: { color: '#f0e9df', near: 30, far: 100 }
  },
  NIGHTCLUB: {
    preset: 'studio',
    ambientIntensity: 0.2,
    ambientColor: '#ff0055',
    directionalIntensity: 2.0,
    directionalColor: '#a100ff',
    directionalPosition: [0, 20, 0],
    background: '#05000a',
    fog: { color: '#05000a', near: 15, far: 60 }
  }
};

interface EnvContextType {
  theme: EnvironmentTheme;
  setTheme: (theme: EnvironmentTheme) => void;
}

const EnvContext = createContext<EnvContextType | null>(null);

export const EnvironmentManager: React.FC<{ children: React.ReactNode, initialTheme?: EnvironmentTheme }> = ({ children, initialTheme = 'CASINO' }) => {
  const [theme, setTheme] = useState<EnvironmentTheme>(initialTheme);
  const config = useMemo(() => THEME_CONFIGS[theme], [theme]);

  // Handle time-of-day dynamics (e.g. slight dimming based on local time)
  const [timeMultiplier, setTimeMultiplier] = useState(1.0);
  
  useEffect(() => {
    const hour = new Date().getHours();
    // Dim lighting slightly at night (20:00 to 06:00)
    if (hour >= 20 || hour < 6) {
      setTimeMultiplier(0.7);
    } else {
      setTimeMultiplier(1.0);
    }
  }, []);

  return (
    <EnvContext.Provider value={{ theme, setTheme }}>
      {/* PBR Environment Map */}
      <Environment preset={config.preset} />
      
      {/* Dynamic Lighting */}
      <ambientLight intensity={config.ambientIntensity * timeMultiplier} color={config.ambientColor} />
      <directionalLight 
        position={new THREE.Vector3(...config.directionalPosition)} 
        intensity={config.directionalIntensity * timeMultiplier} 
        color={config.directionalColor} 
        castShadow 
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      {/* Global Background and Fog */}
      {config.background && <color attach="background" args={[config.background]} />}
      {config.fog && <fog attach="fog" args={[config.fog.color, config.fog.near, config.fog.far]} />}
      
      {children}
    </EnvContext.Provider>
  );
};

export const useEnvironmentTheme = () => {
  const context = useContext(EnvContext);
  if (!context) throw new Error("useEnvironmentTheme must be used within EnvironmentManager");
  return context;
};
