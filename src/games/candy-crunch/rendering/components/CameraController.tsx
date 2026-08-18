import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraControllerProps {
  boardCenter: [number, number, number];
  boardWidth: number;
  boardHeight: number;
  cameraShake?: number;
  zoomLevel?: 'normal' | 'zoomIn' | 'zoomOut';
}

export const CameraController: React.FC<CameraControllerProps> = ({
  boardCenter,
  boardWidth,
  boardHeight,
  cameraShake = 0,
  zoomLevel = 'normal',
}) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const shakeOffset = useRef(new THREE.Vector3());
  const currentShake = useRef(0);

  useEffect(() => {
    if (cameraShake > 0) {
      currentShake.current = cameraShake;
    }
  }, [cameraShake]);

  useFrame((state, delta) => {
    // 1. Determine base target position based on zoom level
    const baseZ = zoomLevel === 'zoomIn' ? 8 : zoomLevel === 'zoomOut' ? 14 : Math.max(boardWidth, boardHeight) * 1.2;
    const baseY = zoomLevel === 'zoomIn' ? boardCenter[1] - 1 : boardCenter[1];
    
    targetPos.current.set(boardCenter[0], baseY, baseZ);

    // 2. Smoothly move camera towards target
    camera.position.lerp(targetPos.current, 5 * delta);
    
    // 3. Handle camera shake
    if (currentShake.current > 0) {
      const shakeAmt = currentShake.current;
      shakeOffset.current.set(
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt,
        (Math.random() - 0.5) * shakeAmt
      );
      camera.position.add(shakeOffset.current);
      currentShake.current -= delta * 15; // Decay shake
      if (currentShake.current < 0) currentShake.current = 0;
    }

    // 4. Always look at the board center
    camera.lookAt(new THREE.Vector3(...boardCenter));
  });

  return null;
};
