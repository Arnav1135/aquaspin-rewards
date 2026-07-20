import { useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { usePoolStore } from './store';

export function CueStick({ cueBallRef, onShoot }: { cueBallRef: any, onShoot: (force: THREE.Vector3) => void }) {
  const groupRef = useRef<THREE.Group>(null);
  const [charge, setCharge] = useState(0);
  const [angle, setAngle] = useState(0);
  const [isCharging, setIsCharging] = useState(false);

  // Simplified interactions: Auto rotate slowly and shoot on click
  useFrame((_state, delta) => {
    if (!cueBallRef?.current?.ref?.current || !groupRef.current) return;
    
    const cuePos = cueBallRef.current.ref.current.position;
    groupRef.current.position.copy(cuePos);
    
    if (!isCharging) {
      setAngle((a) => a + delta * 0.5); // auto aim sweep for demo
    }
    
    groupRef.current.rotation.y = angle;
    
    // Pull back animation
    groupRef.current.children[0].position.z = 0.1 + charge * 0.2;
  });

  const handlePointerDown = () => {
    setIsCharging(true);
  };
  
  const handlePointerUp = () => {
    if (isCharging) {
      setIsCharging(false);
      // Shoot
      const forceMag = 1.0 + charge * 3.0; // Scaled for Cannon
      const forceX = -Math.cos(angle) * forceMag;
      const forceZ = Math.sin(angle) * forceMag;
      const spin = usePoolStore.getState().spin;
      
      // Calculate contact point offset based on spin
      // If angle is 0 (shooting +Z), right spin (+X) offsets contact point to -X
      // We must rotate the offset vector by the aim angle.
      // Maximum safe offset is slightly less than ball radius.
      const maxOffset = 0.015;
      const localOffsetX = -spin.x * maxOffset;
      const localOffsetY = spin.y * maxOffset; // Up/down spin
      
      // Rotate local offset by the current aim angle
      const worldOffsetX = localOffsetX * Math.cos(angle);
      const worldOffsetZ = localOffsetX * Math.sin(angle);
      
      if (cueBallRef.current?.api) {
        cueBallRef.current.api.applyImpulse(
          [forceX, 0, forceZ], 
          [worldOffsetX, localOffsetY, worldOffsetZ] // Contact offset
        );
      }
      usePoolStore.getState().startShot();
      onShoot(new THREE.Vector3(forceX, 0, forceZ));
      setCharge(0);
    }
  };

  useFrame((_state, delta) => {
    if (isCharging) {
      setCharge((c) => Math.min(1, c + delta * 1.5));
    }
  });

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      <mesh position={[0, 0.05, 0.1]} castShadow>
        <cylinderGeometry args={[0.005, 0.01, 1.2, 16]} />
        <meshPhysicalMaterial color={0x8B4513} roughness={0.3} clearcoat={0.8} />
      </mesh>
      
      {/* Interactive invisible hit plane for easy clicking */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0,0,0]} visible={false}>
         <planeGeometry args={[10, 10]} />
         <meshBasicMaterial />
      </mesh>
    </group>
  );
}