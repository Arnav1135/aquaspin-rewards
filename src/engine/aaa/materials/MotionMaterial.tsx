import React, { forwardRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

export interface MotionMaterialProps extends Omit<JSX.IntrinsicElements['shaderMaterial'], 'ref'> {
  color?: THREE.ColorRepresentation;
  velocity?: THREE.Vector2;
}

export const MotionMaterial = forwardRef<THREE.ShaderMaterial, MotionMaterialProps>(
  ({ color = '#ffffff', velocity = new THREE.Vector2(), ...props }, ref) => {
    
    const uniforms = useMemo(() => ({
      uColor: { value: new THREE.Color(color) },
      uVelocity: { value: velocity },
      uTime: { value: 0 }
    }), [color, velocity]);

    useFrame((state) => {
      uniforms.uTime.value = state.clock.elapsedTime;
    });

    return (
      <shaderMaterial
        ref={ref}
        uniforms={uniforms}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform vec3 uColor;
          uniform vec2 uVelocity;
          uniform float uTime;
          varying vec2 vUv;
          
          void main() {
            vec3 finalColor = uColor + vec3(uVelocity.x, uVelocity.y, 0.0) * sin(uTime);
            gl_FragColor = vec4(finalColor, 1.0);
          }
        `}
        transparent={true}
        {...props}
      />
    );
  }
);
MotionMaterial.displayName = 'MotionMaterial';
