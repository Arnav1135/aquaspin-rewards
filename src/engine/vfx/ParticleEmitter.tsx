// src/engine/vfx/ParticleEmitter.tsx
import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface ParticleEmitterProps {
  count?: number;
  position?: [number, number, number];
  color?: string;
  size?: number;
  spread?: number;
  lifetime?: number; // seconds
  gravity?: number;
  speed?: number;
  autoDispose?: boolean;
  onComplete?: () => void;
}

export function ParticleEmitter({
  count = 100,
  position = [0, 0, 0],
  color = '#00f0ff',
  size = 0.15,
  spread = 1.0,
  lifetime = 2.0,
  gravity = -1.5,
  speed = 2.0,
  autoDispose = true,
  onComplete,
}: ParticleEmitterProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const startTime = useRef<number>(Date.now());
  const velocities = useMemo(() => {
    const vels = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      vels[i * 3] = (Math.random() - 0.5) * spread * speed;
      vels[i * 3 + 1] = (Math.random() * 0.5 + 0.5) * speed;
      vels[i * 3 + 2] = (Math.random() - 0.5) * spread * speed;
    }
    return vels;
  }, [count, spread, speed]);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position[0];
      pos[i * 3 + 1] = position[1];
      pos[i * 3 + 2] = position[2];
    }
    return pos;
  }, [count, position]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const geo = pointsRef.current.geometry;
    const posAttr = geo.attributes.position as THREE.BufferAttribute;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      array[i * 3] += velocities[i * 3] * delta;
      array[i * 3 + 1] += velocities[i * 3 + 1] * delta;
      array[i * 3 + 2] += velocities[i * 3 + 2] * delta;

      // Apply gravity
      velocities[i * 3 + 1] += gravity * delta;
    }

    posAttr.needsUpdate = true;

    // Check lifetime for auto dispose
    const elapsed = (Date.now() - startTime.current) / 1000;
    if (autoDispose && elapsed >= lifetime) {
      if (onComplete) onComplete();
    }
  });

  useEffect(() => {
    return () => {
      // Ensure proper memory disposal
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        if (Array.isArray(pointsRef.current.material)) {
          pointsRef.current.material.forEach((mat) => mat.dispose());
        } else {
          pointsRef.current.material.dispose();
        }
      }
    };
  }, []);

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={size}
        color={color}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}
