import React, { createContext, useContext, useCallback } from 'react';
import * as THREE from 'three';

interface VFXContextType {
  spawnEffect: (type: string, position: THREE.Vector3, options?: any) => void;
  triggerScreenShake: (intensity: number, duration: number) => void;
}

const VFXContext = createContext<VFXContextType | null>(null);

export const VFXManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const spawnEffect = useCallback((type: string, position: THREE.Vector3, options?: any) => {
    // Basic implementation for spawning effect
    console.log(`Spawning VFX ${type} at`, position);
  }, []);

  const triggerScreenShake = useCallback((intensity: number, duration: number) => {
    // Basic screen shake
    console.log(`Triggering screen shake intensity ${intensity} for ${duration}s`);
  }, []);

  return (
    <VFXContext.Provider value={{ spawnEffect, triggerScreenShake }}>
      {children}
    </VFXContext.Provider>
  );
};

export const useVFX = () => {
  const context = useContext(VFXContext);
  if (!context) throw new Error('useVFX must be used within VFXManager');
  return context;
};
