import { forwardRef, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { usePoolStore } from './store';

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
    linearDamping: 0.1, // Reduced baseline damping, we will apply manual rolling resistance
    angularDamping: 0.1,
    allowSleep: true,
    sleepSpeedLimit: 0.05,
    sleepTimeLimit: 0.5,
    onCollide: (e) => {
      // Only cue ball (id=0) needs to register first contacts for rules
      if (id === 0 && e.body.name === 'ball') {
        const contactId = Number(e.body.userData?.id);
        if (!isNaN(contactId)) {
          usePoolStore.getState().registerCollision(0, contactId, false);
        }
      }
      if (e.body.name === 'cushion') {
         usePoolStore.getState().registerCollision(id, -1, true);
      }
    },
    userData: { id },
  }));
  
  
  const velocity = useRef([0, 0, 0]);
  const angularVelocity = useRef([0, 0, 0]);
  const isPocketed = useRef(false);

  useEffect(() => {
    if (externalRef) {
      externalRef.current = { ref, api };
    }
    const unsubVel = api.velocity.subscribe((v) => (velocity.current = v));
    const unsubAng = api.angularVelocity.subscribe((v) => (angularVelocity.current = v));
    
    // Subscribe to pocketed events
    const unsubStore = usePoolStore.subscribe((state) => {
      if (state.currentShotEvents.ballsPocketed.includes(id) && !isPocketed.current) {
        isPocketed.current = true;
        api.position.set(id * 0.1, -1, 0);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        api.sleep();
      }
      if (state.gameState === 'menu' || state.gameState === 'aiming') {
         // Reset pocketed state on new game, logic here needs to be more robust for full game
         if (state.currentShotEvents.ballsPocketed.length === 0) {
            // isPocketed.current = false;
         }
      }
    });

    return () => {
      unsubVel();
      unsubAng();
      unsubStore();
    };
  }, [api, ref, externalRef, id]);

  useFrame((_, delta) => {
    if (isPocketed.current) return;

    // Apply custom rolling resistance (non-linear deceleration)
    const [vx, vy, vz] = velocity.current;
    const speed = Math.sqrt(vx * vx + vz * vz);
    
    if (speed > 0.001) {
      // Pool balls decelerate roughly constantly due to rolling friction
      const frictionForce = 0.08; // Adjust for realistic felt friction
      const drop = frictionForce * delta;
      const multiplier = Math.max(0, speed - drop) / speed;
      
      // We apply manual damping by scaling down velocity
      if (multiplier < 1) {
        api.velocity.set(vx * multiplier, vy, vz * multiplier);
      }
    } else if (speed > 0 && speed <= 0.001) {
      api.velocity.set(0, 0, 0);
    }
  });

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