import { forwardRef, useEffect } from 'react';
import { useSphere } from '@react-three/cannon';

const BALL_RADIUS = 0.028575; // 57.15mm / 2
const BALL_MASS = 0.17; // 170g

export const BALL_COLORS = [
  '#ffffff', // 0 (Cue)
  '#eacc15', // 1 (Yellow)
  '#2563eb', // 2 (Blue)
  '#dc2626', // 3 (Red)
  '#4f46e5', // 4 (Purple)
  '#ea580c', // 5 (Orange)
  '#16a34a', // 6 (Green)
  '#7c2d12', // 7 (Maroon)
  '#000000', // 8 (Black)
  '#eacc15', // 9 (Yellow Stripe)
  '#2563eb', // 10 (Blue Stripe)
  '#dc2626', // 11 (Red Stripe)
  '#4f46e5', // 12 (Purple Stripe)
  '#ea580c', // 13 (Orange Stripe)
  '#16a34a', // 14 (Green Stripe)
  '#7c2d12', // 15 (Maroon Stripe)
];

// Helper to get initial triangle rack positions
export function getRackPositions(): [number, number, number][] {
  const startX = 0.6;
  const positions: [number, number, number][] = [];
  const r = BALL_RADIUS;
  const d = r * 2.02; // slight gap
  
  let id = 1;
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      if (id > 15) break;
      const x = startX + row * d * 0.866;
      const z = (col - row / 2) * d;
      positions[id] = [x, r, z];
      id++;
    }
  }
  // Cue ball
  positions[0] = [-0.6, r, 0];
  
  // Swap 8 ball to center
  const p8 = positions[8];
  positions[8] = positions[5];
  positions[5] = p8;
  
  return positions;
}

export const PoolBall = forwardRef(({ id, position }: { id: number, position: [number, number, number] }, externalRef: any) => {
  const [ref, api] = useSphere(() => ({
    mass: BALL_MASS,
    args: [BALL_RADIUS],
    position,
    material: 'ball',
    linearDamping: 0.35,
    angularDamping: 0.55,
    allowSleep: true,
    sleepSpeedLimit: 0.05,
    sleepTimeLimit: 0.5,
  }));
  
  useEffect(() => {
    if (externalRef) {
      externalRef.current = { ref, api };
    }
  }, [api, ref, externalRef]);

  const isStripe = id > 8;

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshPhysicalMaterial 
        color={BALL_COLORS[id]}
        roughness={0.05}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.05}
        reflectivity={0.9}
      />
      {isStripe && (
        <mesh>
          <sphereGeometry args={[BALL_RADIUS + 0.0001, 32, 16, 0, Math.PI*2, Math.PI/3, Math.PI/3]} />
          <meshPhysicalMaterial color="#ffffff" roughness={0.05} clearcoat={1.0} />
        </mesh>
      )}
    </mesh>
  );
});