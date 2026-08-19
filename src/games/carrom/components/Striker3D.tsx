import React, { useRef, useEffect } from 'react';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { Trail, Line } from '@react-three/drei';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromStore } from '../state/CarromState';
import * as THREE from 'three';

export function Striker3D() {
  const bodyRef = useRef<RapierRigidBody>(null);
  const position = useCarromStore(state => state.strikerPosition);
  const turnState = useCarromStore(state => state.turnState);
  const aimAngle = useCarromStore(state => state.aimAngle);
  const power = useCarromStore(state => state.power);
  
  useEffect(() => {
    if (turnState === 'SHOOTING' && bodyRef.current) {
      const state = useCarromStore.getState();
      const force = (state.power / 100) * 0.5; // Tune physical impulse
      
      const fx = Math.cos(state.aimAngle) * force;
      const fz = Math.sin(state.aimAngle) * force;
      
      bodyRef.current.applyImpulse({ x: fx, y: 0, z: fz }, true);
      // Add slight top spin based on power (Phase 10 Striker Spin simple)
      bodyRef.current.applyTorqueImpulse({ x: fz * 0.1, y: 0, z: -fx * 0.1 }, true);
      
      // Immediately transition to physics active
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

      <Trail width={0.05} length={4} color="#00bcd4" attenuation={(t) => t * t}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[r, r, h, 64]} />
          <meshPhysicalMaterial 
            color="#FFF9C4" 
            roughness={0.2} 
            metalness={0.1} 
            clearcoat={0.8}
          />
        </mesh>
      </Trail>
    </RigidBody>
  );
}
