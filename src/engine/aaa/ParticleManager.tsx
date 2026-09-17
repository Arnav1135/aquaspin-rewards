import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useQuality } from './QualityManager';

export const ParticleManager: React.FC = () => {
  const { tier } = useQuality();
  
  // Dramatically reduce ambient dust particles so they don't pollute the screen
  const maxParticles = useMemo(() => {
    switch(tier) {
      case 'ULTRA': return 100;
      case 'HIGH': return 50;
      case 'MEDIUM': return 25;
      case 'LOW': return 0; // Disable ambient dust completely on LOW
      default: return 50;
    }
  }, [tier]);
  
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { geometry, shaderArgs } = useMemo(() => {
    if (maxParticles === 0) return { geometry: null, shaderArgs: null };

    // Use smaller geometry
    const geo = new THREE.PlaneGeometry(0.04, 0.04);
    
    const positions = new Float32Array(maxParticles * 3);
    const velocities = new Float32Array(maxParticles * 3);
    const lifespans = new Float32Array(maxParticles); 

    for (let i = 0; i < maxParticles; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 15;

      // Slower velocities for subtle dust
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.2;
      velocities[i * 3 + 1] = Math.random() * 0.5; // Float upwards slightly
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

      lifespans[i] = Math.random() * 4.0 + 2.0; // Live 2-6 seconds
    }

    geo.setAttribute('offset', new THREE.InstancedBufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.InstancedBufferAttribute(velocities, 3));
    geo.setAttribute('lifespan', new THREE.InstancedBufferAttribute(lifespans, 1));

    const uniforms = {
      uTime: { value: 0 },
      // Subtle white/blue, not intensely bright to avoid blooming like crazy
      uColor: { value: new THREE.Color('#a8c0ff') } 
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
        
        // Fade in and fade out curve
        vLife = sin((time / lifespan) * 3.14159);
        
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        // Slightly scale based on life
        mvPosition.xyz += position * (vLife * 0.5 + 0.5); 
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform vec3 uColor;
      varying float vLife;
      void main() {
        // Circle shape
        vec2 uv = gl_PointCoord.xy - vec2(0.5);
        if (length(uv) > 0.5) discard;

        // Multiply by 0.3 to keep it subtle and prevent aggressive blooming
        gl_FragColor = vec4(uColor, vLife * 0.3);
      }
    `;

    return { geometry: geo, shaderArgs: { uniforms, vertexShader, fragmentShader } };
  }, [maxParticles]);

  useFrame((state) => {
    if (materialRef.current && maxParticles > 0) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  if (maxParticles === 0 || !geometry || !shaderArgs) return null;

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
