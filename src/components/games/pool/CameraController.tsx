import { useFrame, useThree } from '@react-three/fiber';
import { usePoolStore } from './store';
import * as THREE from 'three';
import { useRef } from 'react';

export function CameraController({ cueBallRef }: { cueBallRef: any }) {
  const { camera } = useThree();
  const gameState = usePoolStore((state) => state.gameState);
  const aimAngle = usePoolStore((state) => state.aimAngle);
  
  const targetPos = useRef(new THREE.Vector3(0, 3.0, 2.0));
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0));
  const currentLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((_, delta) => {
    let ballPos = new THREE.Vector3(0, 0, 0);
    if (cueBallRef.current?.ref?.current) {
      ballPos.copy(cueBallRef.current.ref.current.position);
    }

    if (gameState === 'aiming') {
      // Zoom down behind the cue ball, pointing towards aim angle
      const camDist = 0.8;
      const camHeight = 0.4;
      targetPos.current.set(
        ballPos.x - Math.cos(aimAngle) * camDist,
        ballPos.y + camHeight,
        ballPos.z + Math.sin(aimAngle) * camDist
      );
      
      const lookDist = 1.0;
      lookTarget.current.set(
        ballPos.x + Math.cos(aimAngle) * lookDist,
        ballPos.y,
        ballPos.z - Math.sin(aimAngle) * lookDist
      );
    } else if (gameState === 'moving') {
      // Follow the cue ball slightly from a higher angle
      targetPos.current.set(
        ballPos.x,
        2.0,
        ballPos.z + 1.5
      );
      lookTarget.current.copy(ballPos);
    } else {
      // Overview (Menu, Game Over, etc)
      targetPos.current.set(0, 3.0, 2.0);
      lookTarget.current.set(0, 0, 0);
    }

    // Eased interpolation (smooth transitions)
    const lerpSpeed = 4.0 * delta;
    camera.position.lerp(targetPos.current, lerpSpeed);
    
    currentLookAt.current.lerp(lookTarget.current, lerpSpeed);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
