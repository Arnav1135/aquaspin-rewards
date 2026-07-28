import React, { useMemo } from 'react';
import { RigidBody, BallCollider, RapierRigidBody } from '@react-three/rapier';
import * as THREE from 'three';

export const BALL_RADIUS = 0.285; // 57mm diameter scaled down

interface PoolBallProps {
  id: number;
  position: [number, number, number];
  isCue?: boolean;
  onPocketed?: (id: number) => void;
  onCollision?: (otherId: number) => void;
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

export const BallMesh = React.forwardRef<RapierRigidBody, PoolBallProps>(({ id, position, isCue, onPocketed, onCollision }, ref) => {
  const baseColor = BALL_COLORS[id];
  
  // Create a realistic PBR material for the ball
  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: 0.1,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
  }, [baseColor]);

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
      linearDamping={0.4} // Friction on the felt
      angularDamping={0.4} 
      restitution={0.9} // Bouncy collisions
      friction={0.2}
      ccd={true} // Continuous Collision Detection (prevents tunneling through rails/balls)
      userData={{ id, isCue }}
      onIntersectionEnter={({ other }) => {
        if (other.rigidBodyObject?.name?.startsWith('pocket')) {
          onPocketed?.(id);
        }
      }}
      onCollisionEnter={({ other }) => {
        const otherId = other.rigidBodyObject?.userData?.id;
        if (typeof otherId === 'number') {
          onCollision?.(otherId);
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
