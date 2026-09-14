import React, { forwardRef } from 'react';
import * as THREE from 'three';

export interface SurfaceMaterialProps extends Omit<JSX.IntrinsicElements['meshStandardMaterial'], 'ref'> {
  color?: THREE.ColorRepresentation;
  roughness?: number;
  metalness?: number;
  bumpScale?: number;
}

export const SurfaceMaterial = forwardRef<THREE.MeshStandardMaterial, SurfaceMaterialProps>(
  ({ color = '#ffffff', roughness = 0.5, metalness = 0.1, ...props }, ref) => {
    return (
      <meshStandardMaterial
        ref={ref}
        color={color}
        roughness={roughness}
        metalness={metalness}
        envMapIntensity={1.0}
        {...props}
      />
    );
  }
);
SurfaceMaterial.displayName = 'SurfaceMaterial';
