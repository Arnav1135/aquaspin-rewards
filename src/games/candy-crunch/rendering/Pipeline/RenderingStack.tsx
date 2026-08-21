import React from 'react';
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration } from '@react-three/postprocessing';
import * as THREE from 'three';

export const RenderingStack = () => {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
      <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
      <ChromaticAberration offset={new THREE.Vector2(0.002, 0.002) as any} radialModulation={false} modulationOffset={0} />
    </EffectComposer>
  );
}
