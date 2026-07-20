import { useRef, forwardRef, useImperativeHandle, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { usePoolStore } from './store';
import { audioManager } from './AudioManager';

export interface CueRef {
  shoot: (power: number) => void;
}

export const CueStick = forwardRef<CueRef, { cueBallRef: any }>(({ cueBallRef }, ref) => {
  const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const aimAngle = usePoolStore((state) => state.aimAngle);
  const shotPower = usePoolStore((state) => state.shotPower);
  const gameState = usePoolStore((state) => state.gameState);

  const [ghostPos, setGhostPos] = useState(new THREE.Vector3(0,-10,0));
  const [lineEnd, setLineEnd] = useState(new THREE.Vector3(0,0,0));

  // Expose shoot function
  useImperativeHandle(ref, () => ({
    shoot: (power: number) => {
      // Shoot logic
      const forceMag = 1.0 + power * 3.0; // Scaled for Cannon
      const forceX = -Math.cos(aimAngle) * forceMag;
      const forceZ = Math.sin(aimAngle) * forceMag;
      const spin = usePoolStore.getState().spin;
      
      const maxOffset = 0.015;
      const localOffsetX = -spin.x * maxOffset;
      const localOffsetY = spin.y * maxOffset; // Up/down spin
      
      const worldOffsetX = localOffsetX * Math.cos(aimAngle);
      const worldOffsetZ = localOffsetX * Math.sin(aimAngle);
      
      if (cueBallRef.current?.api) {
        cueBallRef.current.api.applyImpulse(
          [forceX, 0, forceZ], 
          [worldOffsetX, localOffsetY, worldOffsetZ] // Contact offset
        );
      }
      audioManager.playCueStrike(power);
      usePoolStore.getState().startShot();
    }
  }));
  useFrame(() => {
    if (!cueBallRef?.current?.ref?.current || !groupRef.current) return;
    
    const cuePos = cueBallRef.current.ref.current.position;
    groupRef.current.position.copy(cuePos);
    
    groupRef.current.rotation.y = aimAngle;
    
    // Pull back animation driven by shotPower state
    groupRef.current.children[0].position.z = 0.1 + shotPower * 0.2;

    if (gameState === 'aiming') {
       // Raycast for ghost ball
       const dir = new THREE.Vector3(-Math.cos(aimAngle), 0, Math.sin(aimAngle)).normalize();
       const raycaster = new THREE.Raycaster(cuePos, dir);
       
       // intersect against balls and cushions
       const intersects = raycaster.intersectObjects(scene.children, true);
       let hit = false;
       for (const intersect of intersects) {
          // ignore the cue stick itself and the table surface
          if (intersect.object === groupRef.current.children[0]) continue;
          if (intersect.object.name === 'felt' || intersect.object.name === 'floor') continue;
          
          // We hit something!
          const distance = intersect.distance;
          
          // If we hit a ball, the distance to center is approx distance - BALL_RADIUS
          // For simplicity, just offset by BALL_RADIUS
          const BALL_RADIUS = 0.028575;
          const endPoint = cuePos.clone().add(dir.clone().multiplyScalar(distance - BALL_RADIUS));
          
          setGhostPos(endPoint);
          setLineEnd(endPoint);
          hit = true;
          break;
       }
       if (!hit) {
          const farEnd = cuePos.clone().add(dir.clone().multiplyScalar(5));
          setGhostPos(new THREE.Vector3(0, -10, 0)); // hide
          setLineEnd(farEnd);
       }
    } else {
       setGhostPos(new THREE.Vector3(0, -10, 0));
       setLineEnd(cuePos);
    }
  });

  return (
    <group>
      <group ref={groupRef}>
        <mesh position={[0, 0.05, 0.1]} castShadow>
          <cylinderGeometry args={[0.005, 0.01, 1.2, 16]} />
          <meshPhysicalMaterial color={0x8B4513} roughness={0.3} clearcoat={0.8} />
        </mesh>
      </group>
      
      {/* Aim Line */}
      {gameState === 'aiming' && cueBallRef?.current?.ref?.current && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                cueBallRef.current.ref.current.position.x, cueBallRef.current.ref.current.position.y, cueBallRef.current.ref.current.position.z,
                lineEnd.x, lineEnd.y, lineEnd.z
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={0xffffff} transparent opacity={0.5} />
        </line>
      )}

      {/* Ghost Ball */}
      {gameState === 'aiming' && ghostPos.y > -5 && (
        <mesh position={ghostPos}>
          <sphereGeometry args={[0.028575, 16, 16]} />
          <meshBasicMaterial color={0xffffff} transparent opacity={0.3} wireframe />
        </mesh>
      )}
    </group>
  );
});