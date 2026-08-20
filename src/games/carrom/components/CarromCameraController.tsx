import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useCarromStore } from '../state/CarromState';
import { carromVfxEvents, VFXEvent } from './CarromVFXSystem';

const CAMERA_PROFILES: Record<string, any> = {
  NORMAL: { position: [0, 1.0, 0.05], target: [0, 0, 0], fov: 45 },
  AIM: { position: 'dynamic', target: 'striker', fov: 35 },
  SHOT: { position: [0, 0.8, 0.6], target: [0, 0, 0], fov: 40 },
  IMPACT: { position: 'dynamic', target: 'impact_point', fov: 38, shake: true },
  POCKET: { position: 'dynamic', target: 'pocket', fov: 35 },
  QUEEN: { position: [0, 0.5, 0.3], target: [0, 0, 0], fov: 30 },
  VICTORY: { position: [0, 1.5, 0.8], target: [0, 0, 0], fov: 50 },
  REPLAY: { position: [0, 0.6, 0.5], target: [0, 0, 0], fov: 42 }
};

export function CarromCameraController() {
  const turnState = useCarromStore(state => state.turnState);
  const aimAngle = useCarromStore(state => state.aimAngle);
  const strikerPosition = useCarromStore(state => state.strikerPosition);
  const cameraProfile = useCarromStore(state => state.cameraProfile);
  
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  
  const vec = new THREE.Vector3();
  const target = new THREE.Vector3();
  
  const shakeRef = useRef(new THREE.Vector3());
  const shakeIntensity = useRef(0);

  useEffect(() => {
    const handleEvent = (e: CustomEvent<VFXEvent>) => {
      const { type, intensity } = e.detail;
      if (type === 'impact' && intensity > 2) {
        shakeIntensity.current = Math.min(intensity * 0.002, 0.01);
      }
    };
    
    carromVfxEvents.addEventListener('vfx', handleEvent as EventListener);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent as EventListener);
  }, []);

  useFrame((state, delta) => {
    if (!cameraRef.current) return;

    let profileName = cameraProfile;
    // Override profile based on turnState if standard mode
    if (cameraProfile === 'NORMAL') {
      if (turnState === 'AIMING') profileName = 'AIM';
      else if (turnState === 'SHOOTING' || turnState === 'PHYSICS_ACTIVE') profileName = 'SHOT';
      else if (turnState === 'GAME_OVER') profileName = 'VICTORY';
    }
    
    const profile = CAMERA_PROFILES[profileName] || CAMERA_PROFILES.NORMAL;
    
    let targetFov = profile.fov;

    if (profileName === 'AIM') {
      const camDist = 0.5;
      const camHeight = 0.4;
      vec.set(
        strikerPosition[0] - Math.cos(aimAngle) * camDist,
        camHeight,
        strikerPosition[2] - Math.sin(aimAngle) * camDist
      );
      target.set(strikerPosition[0], 0, strikerPosition[2]);
    } else {
      if (Array.isArray(profile.position)) {
        vec.fromArray(profile.position);
      }
      if (Array.isArray(profile.target)) {
        target.fromArray(profile.target);
      }
    }

    // Apply Shake
    if (shakeIntensity.current > 0) {
      shakeRef.current.set(
        (Math.random() - 0.5) * shakeIntensity.current,
        (Math.random() - 0.5) * shakeIntensity.current,
        (Math.random() - 0.5) * shakeIntensity.current
      );
      vec.add(shakeRef.current);
      shakeIntensity.current *= 0.9; // decay
      if (shakeIntensity.current < 0.0001) shakeIntensity.current = 0;
    }

    cameraRef.current.position.lerp(vec, 0.05); // Smooth transition
    cameraRef.current.fov = THREE.MathUtils.lerp(cameraRef.current.fov, targetFov, 0.05);
    cameraRef.current.updateProjectionMatrix();
    
    // Smooth lookat
    const targetQuat = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().lookAt(cameraRef.current.position, target, new THREE.Vector3(0,1,0))
    );
    cameraRef.current.quaternion.slerp(targetQuat, 0.05);
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault fov={45} />;
}
