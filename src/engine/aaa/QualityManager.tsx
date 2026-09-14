import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

export type QualityTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

export interface QualitySettings {
  resolutionScale: number;
  shadows: boolean;
  shadowMapSize: number;
  antialiasing: boolean;
  postProcessing: boolean;
  maxParticles: number;
  environmentMapResolution: number;
}

const TIER_SETTINGS: Record<QualityTier, QualitySettings> = {
  LOW: {
    resolutionScale: 0.5,
    shadows: false,
    shadowMapSize: 512,
    antialiasing: false,
    postProcessing: false,
    maxParticles: 100,
    environmentMapResolution: 256,
  },
  MEDIUM: {
    resolutionScale: 0.75,
    shadows: true,
    shadowMapSize: 1024,
    antialiasing: true,
    postProcessing: true,
    maxParticles: 500,
    environmentMapResolution: 512,
  },
  HIGH: {
    resolutionScale: 1.0,
    shadows: true,
    shadowMapSize: 2048,
    antialiasing: true,
    postProcessing: true,
    maxParticles: 2000,
    environmentMapResolution: 1024,
  },
  ULTRA: {
    resolutionScale: 1.0,
    shadows: true,
    shadowMapSize: 4096,
    antialiasing: true,
    postProcessing: true,
    maxParticles: 10000,
    environmentMapResolution: 2048,
  }
};

interface QualityContextType {
  tier: QualityTier;
  settings: QualitySettings;
  setTier: (tier: QualityTier) => void;
}

const QualityContext = createContext<QualityContextType | null>(null);

export const QualityManager: React.FC<{ children: React.ReactNode, initialTier?: QualityTier }> = ({ children, initialTier = 'HIGH' }) => {
  const [tier, setTier] = useState<QualityTier>(initialTier);
  const settings = useMemo(() => TIER_SETTINGS[tier], [tier]);
  
  return (
    <QualityContext.Provider value={{ tier, settings, setTier }}>
      <QualityEnforcer settings={settings} />
      {children}
    </QualityContext.Provider>
  );
};

const QualityEnforcer: React.FC<{ settings: QualitySettings }> = ({ settings }) => {
  const { gl } = useThree();

  useEffect(() => {
    // Cap pixel ratio to max 2.0 to avoid mobile overheating and massive performance hits
    const targetPixelRatio = Math.min(2.0, window.devicePixelRatio) * settings.resolutionScale;
    gl.setPixelRatio(targetPixelRatio);
    
    gl.shadowMap.enabled = settings.shadows;
    if (settings.shadows) {
      gl.shadowMap.type = THREE.PCFSoftShadowMap;
    }
  }, [gl, settings]);

  return null;
};

export const useQuality = () => {
  const context = useContext(QualityContext);
  if (!context) throw new Error('useQuality must be used within QualityManager');
  return context;
};
