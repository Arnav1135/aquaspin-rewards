import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { TableMesh, TABLE_LENGTH } from './TableMesh';
import { BallMesh, BALL_RADIUS } from './BallMesh';
import { CueStick } from './CueStick';
import { usePoolRules } from './RulesEngine';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

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

  useFrame(() => {
    if (cueBallRef.current) {
      const pos = cueBallRef.current.translation();
      setCueBallPos([pos.x, pos.y, pos.z]);
      
      // Camera Logic
      if (turnState === 'AIMING' || turnState === 'BALL_IN_HAND') {
        // Mobile pool style: camera orbits behind the cue stick
        const camDistance = 4.0;
        const camHeight = 3.0;
        
        // cueAngle is around Y, 0 means aiming down +Z
        const targetX = pos.x - Math.sin(cueAngle) * camDistance;
        const targetZ = pos.z - Math.cos(cueAngle) * camDistance;
        
        const targetCamPos = new THREE.Vector3(targetX, camHeight, targetZ);
        camera.position.lerp(targetCamPos, 0.1);
        camera.lookAt(pos.x, pos.y, pos.z);
      } else {
        // Rolling camera: dynamic overhead/tracking
        camera.position.lerp(new THREE.Vector3(pos.x, 8, pos.z + 4), 0.05);
        camera.lookAt(pos.x, 0, pos.z);
      }
    }
  });

  useEffect(() => {
    const handleStrike = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { power, angle } = customEvent.detail;
      
      if (cueBallRef.current && turnState === 'AIMING') {
        const forceMultiplier = 50.0;
        // The cue stick is pointing along the Z axis, rotated by `angle` around Y
        const fx = -Math.sin(angle) * power * forceMultiplier;
        const fz = -Math.cos(angle) * power * forceMultiplier;
        
        cueBallRef.current.applyImpulse({ x: fx, y: 0, z: fz }, true);
        usePoolRules.getState().ballsRolling();
      }
    };
    
    window.addEventListener('pool-strike', handleStrike);
    return () => window.removeEventListener('pool-strike', handleStrike);
  }, [turnState]);

  // Check if balls stopped
  useEffect(() => {
    if (turnState === 'ROLLING') {
      // In a real implementation, we would poll all rigidbodies to see if linear/angular velocities are near zero.
      // For simplicity in this demo, we use a timeout, or ideally subscribe to physics updates.
      const t = setTimeout(() => {
        usePoolRules.getState().resolveTurn(null, [], false);
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [turnState]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0, 10, 0]} intensity={1.0} castShadow shadow-mapSize={[2048, 2048]} />
      
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
              cueBallPos[0] - Math.sin(cueAngle) * 10,
              BALL_RADIUS,
              cueBallPos[2] - Math.cos(cueAngle) * 10
            )
          ]} 
          color="#ffffff" 
          lineWidth={2}
          dashed={true}
          dashSize={0.2}
          dashScale={0.1}
          dashOffset={0}
        />
      )}
    </>
  );
}
