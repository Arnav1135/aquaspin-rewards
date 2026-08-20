import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
}

// Global VFX Event Emitter (Simple singleton for performance)
export type VFXEvent = {
  type: 'impact' | 'pocket' | 'dust' | 'pocket_shadow' | 'queen_capture' | 'victory' | 'striker_move' | 'shot' | 'foul' | 'rail_hit' | 'multi_collision';
  position: [number, number, number];
  intensity: number;
  mass?: number;
  velocity?: [number, number, number];
  color?: string;
  normal?: [number, number, number];
  sequenceIndex?: number;
};
export const carromVfxEvents = new EventTarget();
export const triggerVFX = (event: VFXEvent) => {
  carromVfxEvents.dispatchEvent(new CustomEvent('vfx', { detail: event }));
};

const MAX_PARTICLES = 1000;
const dummy = new THREE.Object3D();

/**
 * Carrom VFX System (Phase 43)
 * - GPU-friendly: uses InstancedMesh for batch rendering
 * - BufferGeometry shared across all instances
 * - Attribute updates via setMatrixAt/setColorAt
 * - No unbounded allocation (circular buffer index)
 */

import { carromQualityEvents, QualityLevel } from './CarromPerformanceManager';

export function CarromVFXSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const qualityRef = useRef<QualityLevel>('HIGH');
  
  useEffect(() => {
    const handleQuality = (e: Event) => {
      qualityRef.current = (e as CustomEvent).detail as QualityLevel;
    };
    carromQualityEvents.addEventListener('quality', handleQuality);
    return () => carromQualityEvents.removeEventListener('quality', handleQuality);
  }, []);

  
  // Use a static buffer instead of React state for performance
  const particles = useRef<Particle[]>(
    Array.from({ length: MAX_PARTICLES }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      color: new THREE.Color(),
      size: 0.01
    }))
  );
  
  const particleIndex = useRef(0);

  useEffect(() => {
    const handleEvent = ((e: CustomEvent<VFXEvent>) => {
      const { type, position, intensity, color, mass = 1, velocity = [0,0,0] } = e.detail;
      if (type === 'pocket_shadow') return; // Handled elsewhere

      if (type === 'dust' && qualityRef.current === 'LOW') return;

      let count = 0;
      let baseColor = new THREE.Color(color || '#FFD700');
      
      if (type === 'impact') {
        count = Math.min(Math.floor(intensity * mass * 5), 50);
      } else if (type === 'pocket') {
        count = 40; // Downward cone, gold sparkle
        baseColor = new THREE.Color('#FFD700');
        triggerVFX({ type: 'pocket_shadow', position, intensity }); // Emit shadow
      } else if (type === 'dust') {
        count = Math.floor(Math.random() * 6) + 5; // 5-10
        baseColor = new THREE.Color('#8b5a2b'); // brownish
      } else if (type === 'queen_capture') {
        count = 60; // premium alternating
      } else if (type === 'victory') {
        count = 100; // Gold shower
        baseColor = new THREE.Color('#FFD700');
      } else {
        count = 30;
      }

      for (let i = 0; i < count; i++) {
        const pIdx = particleIndex.current % MAX_PARTICLES;
        const p = particles.current[pIdx];
        
        p.position.set(position[0], position[1], position[2]);
        
        if (type === 'dust') {
          p.velocity.set(
            (Math.random() - 0.5) * 0.1,
            Math.random() * 0.1,
            (Math.random() - 0.5) * 0.1
          );
          p.life = 0.5;
          p.maxLife = 0.5;
          p.color.copy(baseColor);
          p.size = 0.003;
        } else if (type === 'pocket') {
          p.velocity.set(
            (Math.random() - 0.5) * 0.5,
            -Math.random() * 1.5,
            (Math.random() - 0.5) * 0.5
          );
          p.life = 1.5;
          p.maxLife = 1.5;
          p.color.copy(baseColor).addScalar((Math.random() - 0.5) * 0.2);
          p.size = Math.random() * 0.01 + 0.005;
        } else if (type === 'queen_capture') {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 2 + 1;
          p.velocity.set(Math.cos(angle) * speed, Math.random() * 2, Math.sin(angle) * speed);
          p.life = 2.0;
          p.maxLife = 2.0;
          p.color.copy(new THREE.Color(i % 2 === 0 ? '#E91E63' : '#FFD700'));
          p.size = 0.015;
        } else if (type === 'victory') {
          p.position.set(position[0] + (Math.random() - 0.5) * 2, 2.0 + Math.random(), position[2] + (Math.random() - 0.5) * 2);
          p.velocity.set(0, -Math.random() * 2, 0);
          p.life = 3.0;
          p.maxLife = 3.0;
          p.color.copy(baseColor).addScalar((Math.random() - 0.5) * 0.1);
          p.size = 0.01;
        } else {
          // impact or other
          p.velocity.set(
            velocity[0] * 0.2 + (Math.random() - 0.5) * intensity * 2,
            Math.abs(velocity[1]) * 0.2 + (Math.random() * intensity * 2) + 0.5,
            velocity[2] * 0.2 + (Math.random() - 0.5) * intensity * 2
          );
          p.life = 1.0;
          p.maxLife = 1.0 + Math.random() * 0.5;
          p.color.copy(baseColor).addScalar((Math.random() - 0.5) * 0.2);
          p.size = Math.random() * 0.01 + 0.005;
        }
        
        particleIndex.current++;
      }
    }) as EventListener;

    carromVfxEvents.addEventListener('vfx', handleEvent);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    let activeCount = 0;
    const gravity = -4.0;
    
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles.current[i];
      if (p.life > 0) {
        p.life -= delta;
        
        if (p.life > 0) {
          p.velocity.y += gravity * delta;
          p.position.addScaledVector(p.velocity, delta);
          
          dummy.position.copy(p.position);
          const scale = p.size * (p.life / p.maxLife); // Shrink over time
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          
          meshRef.current.setMatrixAt(activeCount, dummy.matrix);
          meshRef.current.setColorAt(activeCount, p.color);
          activeCount++;
        }
      }
    }
    
    meshRef.current.count = activeCount;
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}

const renderMicroDust = (impulse: number) => {
    if (impulse < 5) return null;
    return <Sparkles count={impulse * 2} scale={0.5} size={1} speed={0.4} color="#dddddd" />;
  };
