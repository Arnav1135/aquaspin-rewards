import React from 'react';
import { ContactShadows } from '@react-three/drei';
import { useCarromQuality } from '../components/CarromPerformanceManager';

export const SHADOW_TIERS = {
  LOW: { mapSize: 512, bias: -0.005, contactShadows: false, contactBlur: 1, opacity: 0 },
  MEDIUM: { mapSize: 1024, bias: -0.003, contactShadows: true, contactBlur: 2, opacity: 0.3 },
  HIGH: { mapSize: 2048, bias: -0.002, contactShadows: true, contactBlur: 3, opacity: 0.5 },
  ULTRA: { mapSize: 4096, bias: -0.001, contactShadows: true, contactBlur: 4, pcfSoft: true, opacity: 0.7 }
};

export function useCarromShadowConfig() {
  const quality = useCarromQuality();
  return SHADOW_TIERS[quality];
}

export function CarromContactShadows() {
  const config = useCarromShadowConfig();
  if (!config.contactShadows) return null;

  return (
    <ContactShadows
      position={[0, 0.001, 0]}
      opacity={config.opacity}
      scale={1.5}
      blur={config.contactBlur}
      far={0.05}
      resolution={config.mapSize}
      color="#000000"
    />
  );
}
