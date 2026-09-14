import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from './QualityManager';

export const ParticleManager: React.FC = () => {
  const { settings } = useQuality();
  const maxParticles = settings.maxParticles;
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, shaderArgs } = useMemo(() => {
    const geo = new THREE.PlaneGeometry(0.1, 0.1);
    
    const positions = new Float32Array(maxParticles * 3);
    const velocities = new Float32Array(maxParticles * 3);
    const lifespans = new Float32Array(maxParticles); // [life, maxLife, delay]

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities[i * 3 + 0] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 2;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 2;

      lifespans[i] = Math.random() * 2.0;
    }

    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.InstancedBufferAttribute(velocities, 3));
    geo.setAttribute('lifespan', new THREE.InstancedBufferAttribute(lifespans, 1));

    const uniforms = {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#4488ff') }
    };

    const vertexShader = `
      uniform float uTime;
      attribute vec3 offset;
      attribute vec3 velocity;
      attribute float lifespan;
      
      varying float vLife;

      void main() {
        float time = mod(uTime, lifespan);
        vec3 pos = offset + velocity * time;
        vLife = 1.0 - (time / lifespan);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        mvPosition.xyz += position * vLife; // Scale with life
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor;
      varying float vLife;
      void main() {
        gl_FragColor = vec4(uColor, vLife);
      }
    `;

    return { geometry: geo, shaderArgs: { uniforms, vertexShader, fragmentShader } };
  }, [maxParticles]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, maxParticles]} frustumCulled={false}>
      <shaderMaterial 
        ref={materialRef} 
        transparent 
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        {...shaderArgs} 
      />
    </instancedMesh>
  );
};
