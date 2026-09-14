import React, { createContext, useContext, useMemo } from 'react';
import * as THREE from 'three';

export interface SharedMaterials {
  surface: THREE.MeshStandardMaterial;
  environment: THREE.MeshPhysicalMaterial;
  liquid: THREE.MeshPhysicalMaterial;
  motion: THREE.ShaderMaterial;
}

const MaterialContext = createContext<SharedMaterials | null>(null);

export const MaterialManager: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const materials = useMemo<SharedMaterials>(() => {
    return {
      surface: new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.1,
      }),
      environment: new THREE.MeshPhysicalMaterial({
        roughness: 0.8,
        metalness: 0.2,
        clearcoat: 0.1,
      }),
      liquid: new THREE.MeshPhysicalMaterial({
        roughness: 0.1,
        metalness: 0.0,
        transmission: 1.0,
        thickness: 0.5,
        ior: 1.33,
      }),
      motion: new THREE.ShaderMaterial({
        uniforms: {
          tDiffuse: { value: null },
          velocity: { value: new THREE.Vector2() },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 velocity;
          varying vec2 vUv;
          void main() {
            vec4 color = texture2D(tDiffuse, vUv);
            // Basic motion blur placeholder
            gl_FragColor = color;
          }
        `
      })
    };
  }, []);

  return (
    <MaterialContext.Provider value={materials}>
      {children}
    </MaterialContext.Provider>
  );
};

export const useMaterials = () => {
  const context = useContext(MaterialContext);
  if (!context) throw new Error('useMaterials must be used within MaterialManager');
  return context;
};
