import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { TableMesh, TABLE_LENGTH } from './TableMesh';
import { BallMesh, BALL_RADIUS } from './BallMesh';
import { CueStick } from './CueStick';
import { usePoolRules } from './RulesEngine';
import * as THREE from 'three';
import { Line, Environment, ContactShadows } from '@react-three/drei';

interface Scene3DProps {
  cueAngle: number;
  power: number;
}

export function Scene3D({ cueAngle, power }: Scene3DProps) {
  const { camera } = useThree();
  const turnState = usePoolRules(s => s.turnState);
  
  const cueBallRef = useRef<RapierRigidBody>(null);
  
  // Create the initial rack
  const initialBalls = useMemo(() => {
    const balls = [];
    const startZ = TABLE_LENGTH / 4;
    const spacing = BALL_RADIUS * 2.05; // slight gap
    const sqrt3 = Math.sqrt(3);
    
    let id = 1;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = (col - row / 2) * spacing;
        const z = startZ + row * (spacing * sqrt3 / 2);
        
        // Ensure 8-ball is in the middle of the 3rd row
        let ballId = id;
        if (row === 2 && col === 1) ballId = 8;
        else if (id === 8) ballId = 5;
        
        balls.push({ id: ballId, position: [x, BALL_RADIUS, z] as [number, number, number] });
        id++;
      }
    }
    return balls;
  }, []);

  const [cueBallPos, setCueBallPos] = useState<[number, number, number]>([0, BALL_RADIUS, -TABLE_LENGTH / 4]);

  useFrame(({ clock }) => {
    if (cueBallRef.current) {
      const pos = cueBallRef.current.translation();
      setCueBallPos([pos.x, pos.y, pos.z]);
      
      const t = clock.getElapsedTime();

      // Camera Logic
      if (turnState === 'AIMING' || turnState === 'BALL_IN_HAND') {
        // Mobile pool style: camera orbits behind the cue stick
        const camDistance = 4.0;
        const camHeight = 2.5;
        
        // Camera breathing effect
        const breathX = Math.sin(t * 1.5) * 0.05;
        const breathY = Math.cos(t * 1.2) * 0.05;

        // cueAngle is around Y, 0 means aiming down +Z
        const targetX = pos.x - Math.sin(cueAngle) * camDistance + breathX;
        const targetZ = pos.z - Math.cos(cueAngle) * camDistance;
        
        const targetCamPos = new THREE.Vector3(targetX, camHeight + breathY, targetZ);
        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(pos.x, pos.y, pos.z);
      } else {
        // Rolling camera: dynamic overhead/tracking, slightly offset
        const breathX = Math.sin(t * 1.0) * 0.1;
        const breathY = Math.cos(t * 0.8) * 0.1;
        camera.position.lerp(new THREE.Vector3(pos.x + breathX, 7 + breathY, pos.z + 5), 0.04);
        camera.lookAt(pos.x, 0, pos.z);
      }
    }
  });

  useEffect(() => {
    const handleStrike = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { power, angle } = customEvent.detail;
      
      if (cueBallRef.current && turnState === 'AIMING') {
        const forceMultiplier = 80.0; // Tuned for heavier physics feeling
        // The cue stick is pointing along the Z axis, rotated by `angle` around Y
        const fx = -Math.sin(angle) * power * forceMultiplier;
        const fz = -Math.cos(angle) * power * forceMultiplier;
        
        // Apply off-center impulse for english/spin if we had a spin vector, but just center for now
        cueBallRef.current.applyImpulse({ x: fx, y: 0, z: fz }, true);
        
        // Apply torque for initial spin/rolling effect
        const torqueMultiplier = 15.0;
        cueBallRef.current.applyTorqueImpulse({ 
          x: Math.cos(angle) * power * torqueMultiplier, 
          y: 0, 
          z: -Math.sin(angle) * power * torqueMultiplier 
        }, true);
        
        usePoolRules.getState().ballsRolling();
      }
    };
    
    window.addEventListener('pool-strike', handleStrike);
    return () => window.removeEventListener('pool-strike', handleStrike);
  }, [turnState]);

  // Check if balls stopped
  useEffect(() => {
    if (turnState === 'ROLLING') {
      const t = setTimeout(() => {
        usePoolRules.getState().resolveTurn(null, [], false);
      }, 6000);
      return () => clearTimeout(t);
    }
  }, [turnState]);

  return (
    <>
      <Environment preset="warehouse" background blur={0.8} />
      
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[-5, 12, 5]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[4096, 4096]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[5, 10, -5]} intensity={0.5} />
      
      {/* Dynamic soft contact shadows for ultra-realism */}
      <ContactShadows 
        position={[0, 0.01, 0]} 
        opacity={0.7} 
        scale={20} 
        blur={2.5} 
        far={1.0} 
        resolution={1024} 
        color="#000000"
      />
      
      <Physics gravity={[0, -9.81, 0]}>
        <TableMesh />
        
        <BallMesh ref={cueBallRef} id={0} position={cueBallPos} isCue />
        {initialBalls.map(b => (
          <BallMesh key={b.id} id={b.id} position={b.position} />
        ))}
      </Physics>

      <CueStick 
        position={cueBallPos} 
        rotation={cueAngle} 
        power={power} 
        isVisible={turnState === 'AIMING' || turnState === 'BALL_IN_HAND'} 
      />

      {/* Aim Guideline */}
      {(turnState === 'AIMING' || turnState === 'BALL_IN_HAND') && (
        <Line 
          points={[
            new THREE.Vector3(cueBallPos[0], BALL_RADIUS, cueBallPos[2]),
            new THREE.Vector3(
              cueBallPos[0] - Math.sin(cueAngle) * 15,
              BALL_RADIUS,
              cueBallPos[2] - Math.cos(cueAngle) * 15
            )
          ]} 
          color="#ffffff" 
          lineWidth={3}
          dashed={true}
          dashSize={0.3}
          dashScale={0.1}
          dashOffset={0}
        />
      )}
    </>
  );
}
