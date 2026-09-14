import React, { forwardRef } from 'react';
import * as THREE from 'three';

export interface EnvironmentMaterialProps extends Omit<JSX.IntrinsicElements['meshPhysicalMaterial'], 'ref'> {
  color?: THREE.ColorRepresentation;
  clearcoat?: number;
  clearcoatRoughness?: number;
}

export const EnvironmentMaterial = forwardRef<THREE.MeshPhysicalMaterial, EnvironmentMaterialProps>(
  ({ color = '#ffffff', clearcoat = 0.5, clearcoatRoughness = 0.1, ...props }, ref) => {
    return (
      <meshPhysicalMaterial
        ref={ref}
        color={color}
        roughness={0.2}
        metalness={0.8}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        envMapIntensity={1.5}
        {...props}
      />
    );
  }
);
EnvironmentMaterial.displayName = 'EnvironmentMaterial';
