import React from 'react';
import { EffectComposer, Bloom, SSR, DepthOfField, Vignette, Noise, SMAA } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import { useQuality } from './QualityManager';

export const PostFXManager: React.FC = () => {
  const { settings } = useQuality();

  if (!settings.postProcessing) return null;

  const isHighQuality = settings.shadowMapSize >= 2048;

  const children: any[] = [];

  if (settings.antialiasing) {
    children.push(<SMAA key="smaa" />);
  }

  children.push(<Vignette key="vignette" eskil={false} offset={0.1} darkness={1.1} blendFunction={BlendFunction.NORMAL} />);
  
  children.push(
    <Bloom 
      key="bloom"
      luminanceThreshold={0.8} 
      luminanceSmoothing={0.9} 
      intensity={1.5} 
      mipmapBlur={true}
    />
  );

  if (isHighQuality) {
    children.push(
      <DepthOfField 
        key="dof"
        focusDistance={0.0} 
        focalLength={0.02} 
        bokehScale={2} 
        height={480} 
      />
    );
    children.push(
      <SSR 
        key="ssr"
        intensity={0.5}
        maxRoughness={1}
        ior={1.45}
      />
    );
    children.push(
      <Noise key="noise" opacity={0.03} blendFunction={BlendFunction.OVERLAY} />
    );
  }

  return (
    <EffectComposer multisampling={settings.antialiasing ? 4 : 0}>
      {children}
    </EffectComposer>
  );
};
