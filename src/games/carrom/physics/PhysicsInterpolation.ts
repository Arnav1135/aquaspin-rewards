import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CARROM_PHYSICS } from './CarromPhysicsConstants';

export function usePhysicsInterpolation(
  meshRef: React.RefObject<THREE.Object3D>, 
  getPhysicsState: () => { position: THREE.Vector3, quaternion: THREE.Quaternion } | null
) {
  const prevPosition = useRef(new THREE.Vector3());
  const prevQuaternion = useRef(new THREE.Quaternion());
  const currPosition = useRef(new THREE.Vector3());
  const currQuaternion = useRef(new THREE.Quaternion());

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    const physicsState = getPhysicsState();
    if (physicsState) {
      prevPosition.current.copy(currPosition.current);
      prevQuaternion.current.copy(currQuaternion.current);
      currPosition.current.copy(physicsState.position);
      currQuaternion.current.copy(physicsState.quaternion);
    }
    
    if (CARROM_PHYSICS.PHYSICS.RENDER_INDEPENDENT && CARROM_PHYSICS.PHYSICS.INTERPOLATION_FACTOR) {
      const alpha = Math.min(1.0, CARROM_PHYSICS.PHYSICS.INTERPOLATION_FACTOR * (delta / (1 / 60)));
      meshRef.current.position.lerpVectors(prevPosition.current, currPosition.current, alpha);
      meshRef.current.quaternion.slerpQuaternions(prevQuaternion.current, currQuaternion.current, alpha);
    } else {
      meshRef.current.position.copy(currPosition.current);
      meshRef.current.quaternion.copy(currQuaternion.current);
    }
  });
}

export const interpolateRotation = (body: any, delta: number) => {
    if (!body) return;
    const angVel = body.angVel();
    // Smooth out rotational jitter
    body.setRotation({ x: body.rotation().x + angVel.x * delta, y: body.rotation().y + angVel.y * delta, z: body.rotation().z + angVel.z * delta }, true);
};
