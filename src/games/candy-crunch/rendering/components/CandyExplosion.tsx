import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ExplosionProps {
  position: [number, number, number];
  color: number;
  destructionType?: string;
  onComplete: () => void;
}

export const CandyExplosion: React.FC<ExplosionProps> = ({ position, color, destructionType = 'gummy_burst', onComplete }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  
  const particleCount = useMemo(() => {
    if (destructionType === 'spark_explosion') return 35;
    if (destructionType === 'glass_shards') return 25;
    return 20;
  }, [destructionType]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      return {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(
          Math.cos(angle1) * Math.sin(angle2) * speed,
          Math.cos(angle2) * speed + 2, // Slight upward bias
          Math.sin(angle1) * Math.sin(angle2) * speed
        ),
        rotationSpeed: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        scale: Math.random() * 0.4 + 0.2,
      }
    });
  }, [particleCount]);

  const age = useRef(0);
  const maxAge = 0.65;

  useFrame((state, delta) => {
    age.current += delta;
    if (age.current > maxAge) {
      onComplete();
      return;
    }
    
    const progress = age.current / maxAge;
    const easeOut = 1 - Math.pow(1 - progress, 3);
    
    // Core burst flash
    if (coreRef.current) {
      coreRef.current.scale.setScalar(1 + easeOut * 2);
      (coreRef.current.material as THREE.MeshBasicMaterial).opacity = 1 - easeOut;
    }

    // Dynamic light burst
    if (lightRef.current) {
      lightRef.current.intensity = (1 - easeOut) * 10;
    }

    if (meshRef.current) {
      particles.forEach((p, i) => {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= (destructionType === 'glass_shards' ? 12 : 8) * delta; // Gravity depends on weight
        
        const currentScale = Math.max(0, p.scale * (1 - progress));
        
        dummy.position.copy(p.position);
        dummy.rotation.x += p.rotationSpeed.x * delta;
        dummy.rotation.y += p.rotationSpeed.y * delta;
        dummy.rotation.z += p.rotationSpeed.z * delta;
        dummy.scale.set(currentScale, currentScale, currentScale);
        dummy.updateMatrix();
        
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
      (meshRef.current.material as THREE.Material).opacity = 1 - Math.pow(progress, 2);
    }
  });

  // Unique Geometry based on destruction type
  const particleGeometry = useMemo(() => {
    switch (destructionType) {
      case 'glass_shards':
        return new THREE.TetrahedronGeometry(0.15); // Shards
      case 'splash':
      case 'sticky_burst':
        return new THREE.SphereGeometry(0.12, 8, 8); // Droplets
      case 'spark_explosion':
        return new THREE.OctahedronGeometry(0.12); // Gem sparks
      case 'gummy_burst':
      default:
        return new THREE.BoxGeometry(0.15, 0.15, 0.15); // Gummy chunks
    }
  }, [destructionType]);

  // Unique Material based on destruction type
  const particleMaterial = useMemo(() => {
    if (destructionType === 'glass_shards' || destructionType === 'spark_explosion') {
      return new THREE.MeshPhysicalMaterial({
        color, transmission: 0.9, roughness: 0.05, ior: 2.0, clearcoat: 1.0, transparent: true
      });
    } else if (destructionType === 'splash' || destructionType === 'sticky_burst') {
      return new THREE.MeshPhysicalMaterial({
        color, transmission: 0.5, roughness: 0.1, ior: 1.33, clearcoat: 0.5, transparent: true
      });
    }
    return new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: true });
  }, [destructionType, color]);

  return (
    <group position={position}>
      {/* Light Burst */}
      <pointLight ref={lightRef} color={color} distance={4} decay={2} intensity={10} />
      
      {/* Core Flash */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={0xffffff} transparent opacity={1} />
      </mesh>

      {/* Unique Fragments */}
      <instancedMesh ref={meshRef} args={[particleGeometry, particleMaterial, particleCount]}>
      </instancedMesh>
    </group>
  );
};
