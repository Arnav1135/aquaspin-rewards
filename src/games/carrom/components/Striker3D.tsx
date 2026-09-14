import React, { useRef, useEffect, useMemo } from 'react';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { Trail, Line } from '@react-three/drei';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromStore } from '../state/CarromState';
import { CarromMaterialProfile } from '../materials/CarromMaterialProfile';
import * as THREE from 'three';

export function Striker3D() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const position = useCarromStore(state => state.strikerPosition);
  const turnState = useCarromStore(state => state.turnState);
  const aimAngle = useCarromStore(state => state.aimAngle);
  const power = useCarromStore(state => state.power);
  const variant = useCarromStore(state => state.strikerVariant);
  
  const strikerMaterial = useMemo(() => CarromMaterialProfile.getStrikerVariant(variant), [variant]);

  
  useEffect(() => {
    if (turnState === 'SHOOTING' && bodyRef.current) {
      const state = useCarromStore.getState();
      const force = (state.power / 100) * 0.7; // Tune physical impulse for realism
      
      const fx = Math.cos(state.aimAngle) * force;
      const fz = Math.sin(state.aimAngle) * force;
      
      bodyRef.current.applyImpulse({ x: fx, y: 0, z: fz }, true);
      // Realistic spin
      bodyRef.current.applyTorqueImpulse({ x: fz * 0.05, y: 0, z: -fx * 0.05 }, true);
      
      state.setTurnState('PHYSICS_ACTIVE');
    } else if (turnState === 'PLACING_STRIKER' && bodyRef.current) {
      bodyRef.current.setTranslation({ x: position[0], y: position[1], z: position[2] }, true);
      bodyRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      bodyRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }, [turnState, position]);

  const r = CARROM_PHYSICS.STRIKER.RADIUS;
  const h = CARROM_PHYSICS.STRIKER.HEIGHT;

  // Calculate aim line points
  const aimLength = 0.1 + (power / 100) * 0.4;
  const aimPoints: [number, number, number][] = [
    [0, 0.005, 0],
    [Math.cos(aimAngle) * aimLength, 0.005, Math.sin(aimAngle) * aimLength]
  ];

  return (
    <RigidBody
      ref={bodyRef}
      type={turnState === 'PLACING_STRIKER' || turnState === 'AIMING' ? 'kinematicPosition' : 'dynamic'}
      position={position}
      colliders={false}
      mass={CARROM_PHYSICS.STRIKER.MASS}
      restitution={CARROM_PHYSICS.STRIKER.RESTITUTION}
      friction={CARROM_PHYSICS.STRIKER.FRICTION}
      linearDamping={CARROM_PHYSICS.STRIKER.LINEAR_DAMPING}
      angularDamping={CARROM_PHYSICS.STRIKER.ANGULAR_DAMPING}
      ccd={CARROM_PHYSICS.PHYSICS.CCD_ENABLED} 
      enabledRotations={[false, true, false]} // Prevent striker from flipping completely in mid-air
      userData={{ isStriker: true }}
    >
      <CylinderCollider args={[h / 2, r]} />
      
      {turnState === 'AIMING' && (
        <Line 
          points={aimPoints}
          color="#00bcd4"
          lineWidth={2}
          transparent
          opacity={0.5 + (power / 100) * 0.5}
        />
      )}

      <Trail width={0.08} length={6} color="#00bcd4" attenuation={(t) => t * t}>
        <group>
          {/* Main Cylinder with High Res */}
          <mesh castShadow receiveShadow material={strikerMaterial}>
            <cylinderGeometry args={[r - 0.001, r - 0.001, h - 0.002, 128]} />
          </mesh>
          {/* Micro-bevel Top */}
          <mesh castShadow receiveShadow material={strikerMaterial} position={[0, h/2 - 0.001, 0]} rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[r - 0.001, 0.001, 32, 128]} />
          </mesh>
          {/* Micro-bevel Bottom */}
          <mesh castShadow receiveShadow material={strikerMaterial} position={[0, -h/2 + 0.001, 0]} rotation={[Math.PI/2, 0, 0]}>
            <torusGeometry args={[r - 0.001, 0.001, 32, 128]} />
          </mesh>
          
          {/* Intricate Center design standard to ICF strikers */}
          <mesh position={[0, h/2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r * 0.3, r * 0.4, 64]} />
            <meshStandardMaterial color="#222" emissive="#111" />
          </mesh>
          <mesh position={[0, h/2 + 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[r * 0.25, 32]} />
            <meshStandardMaterial color="#111" />
          </mesh>
          
          {/* Spin and alignment indicator marks */}
          <mesh position={[r * 0.7, h/2 + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.002, 16]} />
            <meshBasicMaterial color="#00bcd4" />
          </mesh>
          <mesh position={[-r * 0.7, h/2 + 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.002, 16]} />
            <meshBasicMaterial color="#00bcd4" />
          </mesh>
        </group>
      </Trail>
    </RigidBody>
  );
}
