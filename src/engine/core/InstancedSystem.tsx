import { useRef, useEffect } from 'react';
import * as THREE from 'three';

export interface InstancedSystemProps {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  count: number;
  positions: THREE.Vector3[];
  scales?: THREE.Vector3[];
  rotations?: THREE.Euler[];
}

/**
 * Phase 2 - Step 3: Performance (InstancedMesh)
 * A generic wrapper for rendering large quantities of the same object in one draw call.
 */
export function InstancedSystem({ geometry, material, count, positions, scales, rotations }: InstancedSystemProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Recompute instance matrices when positions change
  useEffect(() => {
    if (!meshRef.current) return;
    
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      if (positions[i]) {
        dummy.position.copy(positions[i]);
      }
      if (scales && scales[i]) {
        dummy.scale.copy(scales[i]);
      } else {
        dummy.scale.set(1, 1, 1);
      }
      if (rotations && rotations[i]) {
        dummy.rotation.copy(rotations[i]);
      } else {
        dummy.rotation.set(0, 0, 0);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count, positions, scales, rotations]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, count]}
      castShadow
      receiveShadow
    />
  );
}
