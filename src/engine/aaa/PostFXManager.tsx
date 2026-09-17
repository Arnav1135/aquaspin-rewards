import React from 'react';
import { EffectComposer, Bloom, SSR, DepthOfField, Vignette, Noise, SMAA } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useQuality } from './QualityManager';

export const PostFXManager: React.FC = () => {
  const { tier, settings } = useQuality();

  if (!settings.postProcessing) return null;

  const isHighQuality = settings.shadowMapSize >= 2048;

  // Adaptive bloom settings to prevent over-blooming particles
  const bloomIntensity = tier === 'ULTRA' ? 1.0 : (tier === 'HIGH' ? 0.75 : 0.5);
  const bloomThreshold = tier === 'ULTRA' ? 0.95 : 0.85; // Higher threshold prevents standard bright objects from glowing

  return (
    <EffectComposer multisampling={settings.antialiasing ? 4 : 0}>
      {settings.antialiasing ? <SMAA /> : <></>}
      
      <Vignette eskil={false} offset={0.1} darkness={1.1} blendFunction={BlendFunction.NORMAL} />
      
      <Bloom 
        luminanceThreshold={bloomThreshold} 
        luminanceSmoothing={0.9} 
        intensity={bloomIntensity} 
        mipmapBlur={true}
      />

      {isHighQuality ? (
        <>
          <DepthOfField 
            focusDistance={0.0} 
            focalLength={0.02} 
            bokehScale={2} 
            height={480} 
          />
          <SSR 
            intensity={0.5}
            maxRoughness={1}
            ior={1.45}
          />
          <Noise opacity={0.02} blendFunction={BlendFunction.OVERLAY} />
        </>
      ) : <></>}
    </EffectComposer>
  );
};
