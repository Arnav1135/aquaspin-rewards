import { forwardRef, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSphere } from '@react-three/cannon';
import { usePoolStore } from './store';

import * as THREE from 'three';

const ballTextures = new Map<number, THREE.CanvasTexture | null>();

export function getBallTexture(id: number) {
  if (id === 0) return null;
  if (ballTextures.has(id)) return ballTextures.get(id)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  
  const color = BALL_COLORS[id];
  const isStripe = id > 8;

  if (isStripe) {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = color;
    ctx.fillRect(0, 64, 512, 128);
  } else {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 512, 256);
  }

  const drawNumberCircle = (x: number, y: number) => {
    ctx.beginPath();
    ctx.arc(x, y, 36, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    
    ctx.font = 'bold 44px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(id.toString(), x, y + 4);
    
    if (id === 6 || id === 9) {
      ctx.fillRect(x - 12, y + 20, 24, 4);
    }
  };

  drawNumberCircle(128, 128);
  drawNumberCircle(384, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.colorSpace = THREE.SRGBColorSpace;
  ballTextures.set(id, tex);
  return tex;
}

import { audioManager } from './AudioManager';

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
      const v = Math.abs(e.contact.impactVelocity);
      
      if (e.body.name === 'ball') {
        audioManager.playBallHit(v);
        // Only cue ball (id=0) needs to register first contacts for rules
        if (id === 0) {
          const contactId = Number(e.body.userData?.id);
          if (!isNaN(contactId)) {
            usePoolStore.getState().registerCollision(0, contactId, false);
          }
        }
      }
      
      if (e.body.name === 'cushion') {
         audioManager.playCushionHit(v);
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
      externalRef.current = { 
        ref, 
        api,
        getSpeed: () => Math.sqrt(velocity.current[0]**2 + velocity.current[1]**2 + velocity.current[2]**2)
      };
    }
    const unsubVel = api.velocity.subscribe((v) => (velocity.current = v));
    const unsubAng = api.angularVelocity.subscribe((v) => (angularVelocity.current = v));
    
    // Subscribe to pocketed events
    const unsubStore = usePoolStore.subscribe((state) => {
      if (state.currentShotEvents.ballsPocketed.includes(id) && !isPocketed.current) {
        isPocketed.current = true;
        audioManager.playPocketDrop();
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
      
      if (id === 0 && state.gameState === 'ballInHand') {
          isPocketed.current = false;
          api.position.set(-0.6, BALL_RADIUS, 0);
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);
          api.wakeUp();
          // Auto transition to aiming after a short delay
          setTimeout(() => usePoolStore.getState().placeBallInHand(), 100);
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

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshPhysicalMaterial 
        color={id === 0 ? '#ffffff' : '#ffffff'}
        map={id !== 0 ? getBallTexture(id) || undefined : undefined}
        roughness={0.08}
        metalness={0.0}
        clearcoat={1.0}
        clearcoatRoughness={0.02}
        reflectivity={1.0}
      />
    </mesh>
  );
});