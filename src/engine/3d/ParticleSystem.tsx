import { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useQuality } from '@/engine/aaa/QualityManager';

type ParticleCategory = 'BACKGROUND' | 'GAMEPLAY_VFX' | 'IMPACT_VFX' | 'REWARD_VFX' | 'DEBUG';

interface ParticleSystemProps {
  count?: number; // Override if strictly necessary, but defaults to quality-driven
  color?: string;
  category?: ParticleCategory;
  size?: number;
  opacity?: number;
  velocityRange?: number;
}

export function ParticleSystem({ 
  count, 
  color = '#ffffff', 
  category = 'GAMEPLAY_VFX',
  size = 15.0,
  opacity = 0.6,
  velocityRange = 2.0
}: ParticleSystemProps) {
  const { settings } = useQuality();
  const meshRef = useRef<THREE.Points>(null);

  // Derive budget from settings if count isn't explicitly provided, capped heavily
  const actualCount = useMemo(() => {
    if (count !== undefined) return Math.min(count, 5000); // hard cap manual counts to 5000
    
    // Quality-based caps per category
    const max = settings.maxParticles;
    switch(category) {
      case 'BACKGROUND': return Math.min(max * 0.1, 500);
      case 'GAMEPLAY_VFX': return Math.min(max * 0.5, 2000);
      case 'IMPACT_VFX': return Math.min(max * 0.3, 1000);
      case 'REWARD_VFX': return Math.min(max, 3000);
      case 'DEBUG': return 100;
      default: return 500;
    }
  }, [count, settings.maxParticles, category]);

  const [positions, uvs] = useMemo(() => {
    const positions = new Float32Array(actualCount * 3);
    const uvs = new Float32Array(actualCount * 2);

    for (let i = 0; i < actualCount; i++) {
      // Avoid exact zero which can cause NaN in some math
      const x = (Math.random() - 0.5) * 10;
      const y = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 10;
      
      positions[i * 3] = x === 0 ? 0.01 : x;
      positions[i * 3 + 1] = y === 0 ? 0.01 : y;
      positions[i * 3 + 2] = z === 0 ? 0.01 : z;
      
      uvs[i * 2] = Math.random();
      uvs[i * 2 + 1] = Math.random();
    }
    return [positions, uvs];
  }, [actualCount]);

  const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity }
    },
    vertexShader: `
      uniform float uSize;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        // Clamp depth to prevent division by zero or negative near plane issues
        float depth = max(-mvPosition.z, 0.1); 
        // Clamp size to prevent giant screen-filling neon circles
        gl_PointSize = clamp((uSize / depth), 1.0, 64.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      void main() {
        // Distance from center of point
        float dist = distance(gl_PointCoord, vec2(0.5));
        if (dist > 0.5) discard; // Circular cutoff
        
        // Soft edge alpha
        float alpha = (1.0 - (dist * 2.0)) * uOpacity;
        
        // Prevent negative alpha
        alpha = clamp(alpha, 0.0, 1.0);
        
        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    // Additive blending is fine as long as count and opacity are controlled
    blending: THREE.AdditiveBlending 
  }), [color, size, opacity]);

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial;
      material.uniforms.uTime.value = state.clock.getElapsedTime();
      // Gentle rotate
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute 
          attach="attributes-position" 
          count={actualCount} 
          array={positions} 
          itemSize={3} 
        />
        <bufferAttribute 
          attach="attributes-uv" 
          count={actualCount} 
          array={uvs} 
          itemSize={2} 
        />
      </bufferGeometry>
      <primitive object={shaderMaterial} attach="material" />
    </points>
  );
}
