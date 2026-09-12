import { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
import { gsap } from 'gsap';

interface CameraSystemProps {
  mode: 'default' | 'cinematic' | 'follow' | 'impact';
  fov?: number;
  position?: [number, number, number];
  orthographic?: boolean;
  zoom?: number;
}

export function CameraSystem({ mode, fov = 50, position = [0, 8, 12], orthographic = false, zoom = 45 }: CameraSystemProps) {
  const pCameraRef = useRef<THREE.PerspectiveCamera>(null);
  const oCameraRef = useRef<THREE.OrthographicCamera>(null);
  
  const cam = orthographic ? oCameraRef : pCameraRef;

  useEffect(() => {
    if (!cam.current) return;
    
    if (mode === 'cinematic') {
      gsap.to(cam.current.position, {
        y: position[1] - 2,
        z: position[2] - 4,
        duration: 2,
        ease: 'power2.inOut'
      });
    } else if (mode === 'impact') {
      gsap.fromTo(cam.current.position, 
        { y: cam.current.position.y - 0.5 },
        { y: cam.current.position.y + 0.5, duration: 0.1, yoyo: true, repeat: 3, ease: 'rough' }
      );
    } else {
      gsap.to(cam.current.position, {
        x: position[0],
        y: position[1],
        z: position[2],
        duration: 1.5,
        ease: 'power2.out'
      });
    }
  }, [mode, position]);

  useFrame((state) => {
    if (cam.current) {
      if (mode === 'cinematic') {
        const t = state.clock.getElapsedTime();
        const breathX = Math.sin(t * 0.5) * Math.cos(t * 0.3) * 0.05;
        const breathY = Math.cos(t * 0.4) * Math.sin(t * 0.2) * 0.05;
        
        // Target focal point is [0,0,0]
        const currentTargetPos = { x: position[0], y: position[1] - 2, z: position[2] - 4 };
        
        cam.current.position.x += (currentTargetPos.x + breathX - cam.current.position.x) * 0.05;
        cam.current.position.y += (currentTargetPos.y + breathY - cam.current.position.y) * 0.05;
      }
      cam.current.lookAt(0, 0, 0);
    }
  });

  return orthographic ? (
    <OrthographicCamera ref={oCameraRef} makeDefault position={position} zoom={zoom} />
  ) : (
    <PerspectiveCamera ref={pCameraRef} makeDefault fov={fov} position={position} />
  );
}
