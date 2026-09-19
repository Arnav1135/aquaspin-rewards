import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { carromQualityEvents, QualityLevel } from './CarromPerformanceManager';

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

export function CarromVFXSystem() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const qualityRef = useRef<QualityLevel>('ULTRA');
  
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

  // Shockwave Rings State
  const [shockwaves, setShockwaves] = React.useState<{id: number, pos: [number,number,number], intensity: number, color: string, createdAt: number}[]>([]);
  const shockwaveId = useRef(0);

  useEffect(() => {
    const handleEvent = ((e: CustomEvent<VFXEvent>) => {
      const { type, position, intensity, color, mass = 1, velocity = [0,0,0] } = e.detail;
      if (type === 'pocket_shadow') return; // Handled elsewhere

      if (type === 'dust' && qualityRef.current === 'LOW') return;

      // Trigger Shockwave for strong impacts
      if (type === 'impact' && intensity > 1.5) {
        setShockwaves(prev => [...prev, {
          id: shockwaveId.current++,
          pos: position,
          intensity,
          color: color || '#ffffff',
          createdAt: Date.now()
        }]);
      }

      let count = 0;
      let baseColor = new THREE.Color(color || '#FFD700');
      
      if (type === 'impact') {
        count = Math.min(Math.floor(intensity * mass * 5), 50);
      } else if (type === 'pocket') {
        count = 40; 
        baseColor = new THREE.Color('#FFD700');
        triggerVFX({ type: 'pocket_shadow', position, intensity }); 
      } else if (type === 'dust') {
        count = Math.floor(Math.random() * 6) + 5; 
        baseColor = new THREE.Color('#8b5a2b'); 
      } else if (type === 'queen_capture') {
        count = 60; 
      } else if (type === 'victory') {
        count = 100; 
        baseColor = new THREE.Color('#FFD700');
      } else {
        count = 30;
      }
      
      // Adaptive Quality Multiplier
      let multiplier = 1.0;
      if (qualityRef.current === 'HIGH') multiplier = 0.75;
      else if (qualityRef.current === 'MEDIUM') multiplier = 0.5;
      else if (qualityRef.current === 'LOW') multiplier = 0.25;
      
      count = Math.floor(count * multiplier);

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
          // Cinematic Impact (Sparks)
          const impactScale = intensity > 2 ? 3 : intensity > 0.5 ? 1.5 : 0.5;
          p.velocity.set(
            velocity[0] * 0.2 + (Math.random() - 0.5) * intensity * impactScale,
            Math.abs(velocity[1]) * 0.2 + (Math.random() * intensity * impactScale) + (intensity > 2 ? 1.0 : 0.2),
            velocity[2] * 0.2 + (Math.random() - 0.5) * intensity * impactScale
          );
          p.life = intensity > 2 ? 1.5 : 0.8;
          p.maxLife = p.life + Math.random() * 0.5;
          p.color.copy(baseColor).addScalar((Math.random() - 0.5) * 0.2);
          if (intensity > 2) {
             p.color.lerp(new THREE.Color('#ffffff'), 0.5); // Impact flash glow
          }
          p.size = (Math.random() * 0.01 + 0.005) * (intensity > 2 ? 1.5 : 1.0);
        }
        
        particleIndex.current++;
      }
    }) as EventListener;

    carromVfxEvents.addEventListener('vfx', handleEvent);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent);
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Clean up dead shockwaves
    const now = Date.now();
    setShockwaves(prev => prev.filter(sw => now - sw.createdAt < 500));

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
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_PARTICLES]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {shockwaves.map(sw => {
        const age = (Date.now() - sw.createdAt) / 500;
        const scale = 1 + age * sw.intensity * 2;
        const opacity = 1 - age;
        return (
          <mesh key={sw.id} position={sw.pos} rotation={[-Math.PI/2, 0, 0]} scale={[scale, scale, scale]}>
            <ringGeometry args={[0.02, 0.025, 32]} />
            <meshBasicMaterial color={sw.color} transparent opacity={opacity} toneMapped={false} />
          </mesh>
        );
      })}
    </>
  );
}
