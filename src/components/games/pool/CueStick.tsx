import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CueStickProps {
  position: [number, number, number];
  rotation: number; // yaw angle around Y
  power: number; // 0 to 1
  isVisible: boolean;
  onStrike?: () => void;
}

export function CueStick({ position, rotation, power, isVisible }: CueStickProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    
    // Smoothly apply the power pullback
    const targetZ = 0.5 + (power * 2.0); // Pull back up to 2 units
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, 0.2);
  });

  if (!isVisible) return null;

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {/* The group rotates around the cue ball (0,0,0) locally, but we pull the stick back along local Z */}
      <group ref={groupRef}>
        {/* Shaft */}
        <mesh position={[0, 0, 3]} castShadow>
          <cylinderGeometry args={[0.04, 0.08, 6]} />
          <meshStandardMaterial color="#d2b48c" roughness={0.7} />
        </mesh>
        {/* Tip */}
        <mesh position={[0, 0, 0.05]} castShadow>
          <cylinderGeometry args={[0.038, 0.04, 0.1]} />
          <meshStandardMaterial color="#0000ff" roughness={0.9} />
        </mesh>
        {/* Base / Grip */}
        <mesh position={[0, 0, 5.5]} castShadow>
          <cylinderGeometry args={[0.08, 0.085, 2]} />
          <meshStandardMaterial color="#111111" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
