import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionProps {
  position: [number, number, number];
  color: number;
  onComplete: () => void;
}

export const CandyExplosion: React.FC<ExplosionProps> = ({ position, color, onComplete }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  
  const particleCount = 15;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => ({
      position: new THREE.Vector3(0, 0, 0),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
      ),
      scale: Math.random() * 0.5 + 0.5,
    }));
  }, []);

  const age = useRef(0);

  useFrame((state, delta) => {
    age.current += delta;
    if (age.current > 0.6) {
      onComplete();
      return;
    }
    
    if (meshRef.current) {
      particles.forEach((p, i) => {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 9.8 * delta; // Gravity
        
        const currentScale = Math.max(0, p.scale * (1 - age.current / 0.6));
        
        dummy.position.copy(p.position);
        dummy.scale.set(currentScale, currentScale, currentScale);
        dummy.updateMatrix();
        
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Fade out
      (meshRef.current.material as THREE.MeshStandardMaterial).opacity = 1 - (age.current / 0.6);
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, particleCount]} position={position}>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color={color} transparent opacity={1} roughness={0.2} metalness={0.1} />
    </instancedMesh>
  );
};
