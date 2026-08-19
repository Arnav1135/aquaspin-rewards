import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Particle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

// Global VFX Event Emitter (Simple singleton for performance)
type VFXEvent = {
  type: 'impact' | 'pocket';
  position: [number, number, number];
  intensity: number;
  color?: string;
};
export const carromVfxEvents = new EventTarget();
export const triggerVFX = (event: VFXEvent) => {
  carromVfxEvents.dispatchEvent(new CustomEvent('vfx', { detail: event }));
};

const MAX_PARTICLES = 1000;
const dummy = new THREE.Object3D();

export function CarromVFXSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const particleId = useRef(0);

  useEffect(() => {
    const handleEvent = ((e: CustomEvent<VFXEvent>) => {
      const { type, position, intensity, color } = e.detail;
      const count = type === 'impact' ? Math.floor(intensity * 10) : 30;
      
      const newParticles: Particle[] = [];
      const baseColor = new THREE.Color(color || '#FFD700');

      for (let i = 0; i < count; i++) {
        const vel = new THREE.Vector3(
          (Math.random() - 0.5) * intensity * 2,
          (Math.random() * intensity * 2) + 0.5,
          (Math.random() - 0.5) * intensity * 2
        );
        newParticles.push({
          id: particleId.current++,
          position: new THREE.Vector3(...position),
          velocity: vel,
          life: 1.0,
          maxLife: 1.0 + Math.random() * 0.5,
          color: baseColor.clone().addScalar((Math.random() - 0.5) * 0.2), // variance
          size: Math.random() * 0.01 + 0.005
        });
      }

      setParticles(prev => [...prev, ...newParticles].slice(-MAX_PARTICLES));
    }) as EventListener;

    carromVfxEvents.addEventListener('vfx', handleEvent);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Gravity and updates
    const gravity = -4.0;
    
    setParticles(prev => prev.filter(p => p.life > 0).map(p => {
      p.life -= delta;
      p.velocity.y += gravity * delta;
      p.position.addScaledVector(p.velocity, delta);
      return p;
    }));

    // Update InstancedMesh
    particles.forEach((p, i) => {
      if (i >= MAX_PARTICLES) return;
      dummy.position.copy(p.position);
      const scale = p.size * (p.life / p.maxLife); // Shrink over time
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, p.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
    meshRef.current.count = Math.min(particles.length, MAX_PARTICLES);
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
