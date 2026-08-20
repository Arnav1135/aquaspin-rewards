import React, { useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface DebugOptions {
  wireframe: boolean;
  normals: boolean;
  shadowMap: boolean;
  physics: boolean;
  vfx: boolean;
  lod: boolean;
  materials: boolean;
}

export function CarromDebugOverlay() {
  const [enabled, setEnabled] = useState(false);
  const [options, setOptions] = useState<DebugOptions>({
    wireframe: false, normals: false, shadowMap: false,
    physics: false, vfx: false, lod: false, materials: false
  });
  const { scene } = useThree();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F9') setEnabled(prev => !prev);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useFrame(() => {
    if (!enabled) return;
    if (options.wireframe) {
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach(m => {
                if ('wireframe' in m) m.wireframe = true;
              });
            } else {
              if ('wireframe' in obj.material) obj.material.wireframe = true;
            }
          }
        }
      });
    }
  });

  return null; // Debug overlay is side-effect only in 3D
}
