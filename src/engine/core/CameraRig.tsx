import { useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import * as THREE from 'three';

export interface CameraRigProps {
  mode?: 'third-person' | 'first-person' | 'orbit';
  target?: THREE.Vector3;
  smoothing?: number;
}

/**
 * Phase 2 - Step 5: Camera System
 * Provides clean damping, first/third person presets using CameraControls.
 */
export function CameraRig({ mode = 'orbit', smoothing = 0.1 }: CameraRigProps) {
  const controlsRef = useRef<any>(null);

  return (
    <CameraControls
      ref={controlsRef}
      makeDefault
      dollyToCursor
      smoothTime={smoothing}
      minDistance={mode === 'first-person' ? 0 : 2}
      maxDistance={mode === 'first-person' ? 0.1 : 50}
    />
  );
}
