// Phase 17: Post-Processing Stack
import React from 'react';
import { EffectComposer, Bloom, DepthOfField, ChromaticAberration } from '@react-three/postprocessing';

export const RenderingStack = () => {
  return (
    <EffectComposer>
      <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
      <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
      <ChromaticAberration offset={[0.002, 0.002]} />
    </EffectComposer>
  );
}
