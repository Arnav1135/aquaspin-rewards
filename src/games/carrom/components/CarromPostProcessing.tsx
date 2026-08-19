import React from 'react';
import { EffectComposer, Bloom, SSAO, ToneMapping, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCarromQuality } from './CarromPerformanceManager';
import { BlendFunction } from 'postprocessing';

export function CarromPostProcessing() {
  const quality = useCarromQuality();

  if (quality === 'LOW') {
    return null; // Disable completely on low end
  }

  const bloom = (
    <Bloom 
      luminanceThreshold={1.2} 
      luminanceSmoothing={0.9} 
      intensity={0.5} 
    />
  );
  
  const vignette = (
    <Vignette 
      offset={0.5} 
      darkness={0.5} 
      eskil={false} 
      blendFunction={BlendFunction.NORMAL} 
    />
  );

  const tone = (
    <ToneMapping 
      blendFunction={BlendFunction.NORMAL} 
      adaptive={true} 
      resolution={256}
      middleGrey={0.6}
      maxLuminance={16.0}
      averageLuminance={1.0}
      adaptationRate={1.0}
    />
  );

  if (quality === 'MEDIUM') {
    return (
      <EffectComposer multisampling={0}>
        {tone}
        {bloom}
        {vignette}
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={quality === 'ULTRA' ? 4 : 0}>
      {tone}
      <SSAO 
        samples={quality === 'ULTRA' ? 16 : 9} 
        radius={0.05} 
        intensity={15} 
        luminanceInfluence={0.5} 
        color={new THREE.Color("black") as any}
        worldDistanceThreshold={0.2}
        worldDistanceFalloff={0.1}
        worldProximityThreshold={0.1}
        worldProximityFalloff={0.1}
      />
      {bloom}
      {vignette}
    </EffectComposer>
  );
}
