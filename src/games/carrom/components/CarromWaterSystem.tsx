import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { carromVfxEvents, VFXEvent } from './CarromVFXSystem';

const WaterShader = {
  uniforms: {
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(0x3a8cff) },
    uRipples: { value: [] },
    uCameraPos: { value: new THREE.Vector3() },
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    uniform float uTime;
    
    #define MAX_RIPPLES 10
    uniform vec4 uRipples[MAX_RIPPLES];
    
    void main() {
      vUv = uv;
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      
      float displacement = 0.0;
      for(int i = 0; i < MAX_RIPPLES; i++) {
        if(uRipples[i].w > 0.0) {
          float dist = distance(worldPos.xz, uRipples[i].xy);
          float timeAlive = uTime - uRipples[i].z;
          if(timeAlive > 0.0 && timeAlive < 3.0) {
            float wave = sin(dist * 50.0 - timeAlive * 20.0) * exp(-dist * 8.0 - timeAlive * 1.5);
            displacement += wave * uRipples[i].w * 0.015;
          }
        }
      }
      
      worldPos.y += displacement;
      vWorldPosition = worldPos.xyz;
      
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  fragmentShader: `
    uniform vec3 uColor;
    uniform vec3 uCameraPos;
    
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vec3 viewDir = normalize(uCameraPos - vWorldPosition);
      
      vec3 dFdxPos = dFdx(vWorldPosition);
      vec3 dFdyPos = dFdy(vWorldPosition);
      vec3 normal = normalize(cross(dFdxPos, dFdyPos));
      
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 3.0);
      
      vec3 baseColor = uColor;
      vec3 reflectionColor = vec3(1.0, 1.0, 1.0) * fresnel;
      
      float alpha = clamp(fresnel * 1.5 + 0.2, 0.0, 0.8);
      
      gl_FragColor = vec4(mix(baseColor, reflectionColor, fresnel), alpha);
    }
  `
};

export function CarromWaterSystem() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();
  
  const ripples = useRef(new Array(10).fill(new THREE.Vector4(0, 0, -999, 0)));
  const rippleIdx = useRef(0);

  useEffect(() => {
    const handleEvent = (e: CustomEvent<VFXEvent>) => {
      const { type, position, intensity } = e.detail;
      if (type === 'impact' || type === 'pocket' || type === 'shot' || type === 'rail_hit' || type === 'multi_collision') {
        const idx = rippleIdx.current % 10;
        ripples.current[idx] = new THREE.Vector4(position[0], position[2], 0, Math.min(intensity, 2.5));
        rippleIdx.current++;
      }
    };
    
    carromVfxEvents.addEventListener('vfx', handleEvent as EventListener);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent as EventListener);
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
      materialRef.current.uniforms.uCameraPos.value.copy(camera.position);
      
      for(let i = 0; i < 10; i++) {
        if(ripples.current[i].w > 0) {
            if(ripples.current[i].z === 0) {
               ripples.current[i].z = state.clock.elapsedTime;
            }
        }
      }
      materialRef.current.uniforms.uRipples.value = ripples.current;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[1.6, 1.6, 256, 256]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={THREE.UniformsUtils.clone(WaterShader.uniforms)}
        vertexShader={WaterShader.vertexShader}
        fragmentShader={WaterShader.fragmentShader}
        transparent={true}
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </mesh>
  );
}
