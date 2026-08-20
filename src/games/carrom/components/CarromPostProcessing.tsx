import React from 'react';
import { EffectComposer, Bloom, SSAO, ToneMapping, Vignette, BrightnessContrast, HueSaturation, DepthOfField } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useCarromQuality } from './CarromPerformanceManager';
import { BlendFunction } from 'postprocessing';
import { useCarromStore } from '../state/CarromState';

const COLOR_GRADING: Record<string, any> = {
  CLASSIC: { saturation: 1.0, brightness: 1.0, contrast: 1.0, hue: 0 },
  WARM_WOOD: { saturation: 1.1, brightness: 1.05, contrast: 1.05, hue: 0.05 }, // hue in radians approx
  CINEMATIC: { saturation: 0.9, brightness: 0.95, contrast: 1.15, hue: 0 },
  NIGHT_STUDIO: { saturation: 0.85, brightness: 0.8, contrast: 1.2, hue: 0 },
  TOURNAMENT: { saturation: 1.05, brightness: 1.1, contrast: 1.0, hue: 0 }
};

export function CarromPostProcessing() {
  const quality = useCarromQuality();
  const colorGradingProfile = useCarromStore(state => state.colorGradingProfile);
  const cameraProfile = useCarromStore(state => state.cameraProfile);

  if (quality === 'LOW') {
    return null; // Disable completely on low end
  }

  const profile = COLOR_GRADING[colorGradingProfile] || COLOR_GRADING.CLASSIC;
  const isCinematic = cameraProfile === 'QUEEN' || cameraProfile === 'VICTORY';

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

  const colorEffects = (
    <>
      <BrightnessContrast brightness={profile.brightness - 1} contrast={profile.contrast - 1} />
      <HueSaturation hue={profile.hue} saturation={profile.saturation - 1} />
    </>
  );

  const dof = isCinematic ? (
    <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
  ) : null;

  if (quality === 'MEDIUM') {
    return (
      <EffectComposer multisampling={0}>
        {tone}
        {colorEffects}
        {bloom}
        {vignette}
      </EffectComposer>
    );
  }

  return (
    <EffectComposer multisampling={quality === 'ULTRA' ? 4 : 0}>
      {tone}
      {colorEffects}
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
      {dof || <></>}
      {bloom}
      {vignette}
    </EffectComposer>
  );
}
