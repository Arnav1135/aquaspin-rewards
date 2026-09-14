import React, { useMemo } from 'react';
import { EffectComposer, Bloom, SSR, DepthOfField, Vignette, Noise, SMAA } from '@react-three/postprocessing';
import { useQuality } from './QualityManager';

export const PostFXManager: React.FC = () => {
  const { settings } = useQuality();

  if (!settings.postProcessing) return null;

  return (
    <EffectComposer multisampling={settings.antialiasing ? 4 : 0}>
      {settings.antialiasing ? <SMAA /> as any : null as any}
      <Bloom 
        luminanceThreshold={1.0} 
        luminanceSmoothing={0.9} 
        height={300} 
        intensity={1.5} 
      />
      {settings.shadowMapSize >= 2048 ? (
        <SSR 
          intensity={0.5}
          maxRoughness={1}
          ior={1.45}
        /> as any
      ) : null as any}
      <Vignette eskil={false} offset={0.1} darkness={1.1} />
      {settings.shadowMapSize >= 2048 ? <Noise opacity={0.02} /> as any : null as any}
    </EffectComposer>
  );
};
