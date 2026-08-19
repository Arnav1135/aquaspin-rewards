import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useCarromStore } from '../state/CarromState';

export function CarromCameraController() {
  const turnState = useCarromStore(state => state.turnState);
  const aimAngle = useCarromStore(state => state.aimAngle);
  const strikerPosition = useCarromStore(state => state.strikerPosition);
  
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  const vec = new THREE.Vector3();
  const target = new THREE.Vector3();

  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    if (turnState === 'AIMING') {
      // Move camera behind striker based on aim angle
      const camDist = 0.5;
      const camHeight = 0.4;
      vec.set(
        strikerPosition[0] - Math.cos(aimAngle) * camDist,
        camHeight,
        strikerPosition[2] - Math.sin(aimAngle) * camDist
      );
      target.set(strikerPosition[0], 0, strikerPosition[2]);
    } else if (turnState === 'SHOOTING' || turnState === 'PHYSICS_ACTIVE') {
      // Follow action somewhat statically
      vec.set(0, 0.8, 0.6);
      target.set(0, 0, 0);
    } else {
      // Default top-down perspective
      vec.set(0, 1.0, 0.05);
      target.set(0, 0, 0);
    }

    cameraRef.current.position.lerp(vec, 0.05); // Smooth transition
    
    // Smooth lookat
    const currentLookAt = new THREE.Vector3(0,0,1).applyQuaternion(cameraRef.current.quaternion);
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(cameraRef.current.position, target, new THREE.Vector3(0,1,0))
    );
    cameraRef.current.quaternion.slerp(targetQuat, 0.05);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />;
}
