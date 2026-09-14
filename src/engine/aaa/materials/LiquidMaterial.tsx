import React, { forwardRef } from 'react';
import * as THREE from 'three';

export interface LiquidMaterialProps extends Omit<JSX.IntrinsicElements['meshPhysicalMaterial'], 'ref'> {
  color?: THREE.ColorRepresentation;
  thickness?: number;
  transmission?: number;
  ior?: number;
}

export const LiquidMaterial = forwardRef<THREE.MeshPhysicalMaterial, LiquidMaterialProps>(
  ({ color = '#ffffff', thickness = 1.0, transmission = 1.0, ior = 1.33, ...props }, ref) => {
    return (
      <meshPhysicalMaterial
        ref={ref}
        color={color}
        roughness={0.0}
        metalness={0.0}
        transmission={transmission}
        thickness={thickness}
        ior={ior}
        transparent={true}
        {...props}
      />
    );
  }
);
LiquidMaterial.displayName = 'LiquidMaterial';
