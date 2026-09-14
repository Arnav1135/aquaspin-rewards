import React, { useMemo } from 'react';
import { RigidBody, BallCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export const BALL_RADIUS = 0.285; // 57mm diameter scaled down

interface PoolBallProps {
  id: number;
  position: [number, number, number];
  isCue?: boolean;
  onPocketed?: (id: number) => void;
  onCollision?: (otherId: number | string) => void;
}

const BALL_COLORS = [
  '#ffffff', // 0: Cue
  '#ffdd00', // 1: Solid Yellow
  '#0000ff', // 2: Solid Blue
  '#ff0000', // 3: Solid Red
  '#800080', // 4: Solid Purple
  '#ff8c00', // 5: Solid Orange
  '#008000', // 6: Solid Green
  '#8b4513', // 7: Solid Maroon
  '#000000', // 8: 8-Ball Black
  '#ffdd00', // 9: Stripe Yellow
  '#0000ff', // 10: Stripe Blue
  '#ff0000', // 11: Stripe Red
  '#800080', // 12: Stripe Purple
  '#ff8c00', // 13: Stripe Orange
  '#008000', // 14: Stripe Green
  '#8b4513', // 15: Stripe Maroon
];

const BALL_MATERIALS = BALL_COLORS.map(color => {
  return new THREE.MeshPhysicalMaterial({
    color: color,
    roughness: 0.05, // Highly polished
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 2.5, // HDRI reflections boost
    ior: 1.5, // Polymer/phenolic resin index of refraction
  });
});

export const BallMesh = React.forwardRef<RapierRigidBody, PoolBallProps>(({ id, position, isCue, onPocketed, onCollision }, ref) => {
  const material = BALL_MATERIALS[id];

  // Striped balls need a white base and a colored stripe. 
  // For an educational build, we can use a canvas texture to generate the stripe and number,
  // but to keep it simple and performant, we'll just use a solid color for now, or a basic map.
  // Realism: Let's assume we have a basic stripe if `isStripe` is true. We can tint the mesh.

  return (
    <RigidBody
      ref={ref}
      position={position}
      colliders={false}
      type="dynamic"
      linearDamping={0.45} // Friction on the felt
      angularDamping={0.8} // Rolling friction/spin
      restitution={0.92} // Energy-preserving bouncy collisions
      friction={0.3} // Surface friction for spin/english transfer
      ccd={true} // Continuous Collision Detection (prevents tunneling through rails/balls)
      userData={{ id, isCue }}
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name?.startsWith('pocket')) {
          onPocketed?.(id);
        }
      }}
      onCollisionEnter={({ other }) => {
        const userData = other.rigidBodyObject?.userData;
        if (userData) {
          if (typeof userData.id === 'number') {
            onCollision?.(userData.id);
          } else if (userData.isRail) {
            onCollision?.('rail');
          }
        }
      }}
    >
      <BallCollider args={[BALL_RADIUS]} />
      <mesh castShadow receiveShadow material={material}>
        <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      </mesh>
    </RigidBody>
  );
});

BallMesh.displayName = 'BallMesh';
