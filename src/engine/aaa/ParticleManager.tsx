import React, { useRef, useMemo, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from './QualityManager';

interface ParticleData {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

export const ParticleManager: React.FC = () => {
  const { settings } = useQuality();
  const maxParticles = settings.maxParticles;

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useRef<ParticleData[]>([]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    // Initialize particles
    particles.current = Array.from({ length: maxParticles }).map(() => ({
      position: new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      life: Math.random(),
      maxLife: 1 + Math.random(),
      color: new THREE.Color().setHSL(Math.random(), 1, 0.5),
      size: Math.random() * 0.2 + 0.1
    }));
  }, [maxParticles]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    const mesh = meshRef.current;

    particles.current.forEach((p, i) => {
      p.life -= delta;
      if (p.life <= 0) {
        p.life = p.maxLife;
        p.position.set(
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 10
        );
      }
      p.position.addScaledVector(p.velocity, delta);

      dummy.position.copy(p.position);
      const scale = p.size * (p.life / p.maxLife);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, p.color);
    });

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, maxParticles]} frustumCulled={false}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} transparent opacity={0.8} />
    </instancedMesh>
  );
};
