import React, { useEffect, useRef, useState } from 'react';
import { useSpring, a } from '@react-spring/three';
import { RigidBody, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromStore } from '../state/CarromState';
import { CarromCoinData } from '../types/CarromTypes';
import { triggerVFX } from './CarromVFXSystem';

function createInitialCoins(): CarromCoinData[] {
  const coins: CarromCoinData[] = [];
  let id = 0;
  
  coins.push({
    id: `coin-${id++}`,
    type: 'queen',
    position: [0, CARROM_PHYSICS.COIN.HEIGHT / 2, 0],
    isPocketed: false
  });
  
  const r = 0.035;
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    coins.push({
      id: `coin-${id++}`,
      type: i % 2 === 0 ? 'white' : 'black',
      position: [Math.cos(angle) * r, CARROM_PHYSICS.COIN.HEIGHT / 2, Math.sin(angle) * r],
      isPocketed: false
    });
  }

  const r2 = 0.07;
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    coins.push({
      id: `coin-${id++}`,
      type: i % 2 === 0 ? 'black' : 'white',
      position: [Math.cos(angle) * r2, CARROM_PHYSICS.COIN.HEIGHT / 2, Math.sin(angle) * r2],
      isPocketed: false
    });
  }

  return coins;
}

function Coin3D({ coin }: { coin: CarromCoinData }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const [pocketPos, setPocketPos] = useState<[number, number, number] | null>(null);

  useEffect(() => {
    if (coin.isPocketed && bodyRef.current && !pocketPos) {
      const pos = bodyRef.current.translation();
      setPocketPos([pos.x, pos.y, pos.z]);
    }
  }, [coin.isPocketed, pocketPos]);

  const yTarget = pocketPos ? pocketPos[1] - 0.1 : coin.position[1];
  
  const { scale, y } = useSpring({
    scale: coin.isPocketed ? 0 : 1,
    y: coin.isPocketed ? yTarget : coin.position[1],
    config: { mass: 1, tension: 170, friction: 26 }
  });

  const r = CARROM_PHYSICS.COIN.RADIUS;
  const h = CARROM_PHYSICS.COIN.HEIGHT;

  const CoinVisuals = (
    <a.group scale={scale} position-y={coin.isPocketed ? y : 0}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[r, r, h, 32]} />
        <meshPhysicalMaterial 
          color={coin.type === 'queen' ? '#b71c1c' : (coin.type === 'white' ? '#fff9e6' : '#1a1a1a')}
          roughness={0.2}
          metalness={coin.type === 'queen' ? 0.4 : 0.0}
          clearcoat={0.3}
          clearcoatRoughness={0.1}
          envMapIntensity={1.5}
        />
      </mesh>
      <mesh position={[0, h/2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.5, r * 0.8, 32]} />
        <meshBasicMaterial color={coin.type === 'queen' ? '#f44336' : (coin.type === 'white' ? '#ffcc00' : '#444')} />
      </mesh>
      <mesh position={[0, -h/2 - 0.001, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.5, r * 0.8, 32]} />
        <meshBasicMaterial color={coin.type === 'queen' ? '#f44336' : (coin.type === 'white' ? '#ffcc00' : '#444')} />
      </mesh>
    </a.group>
  );

  if (coin.isPocketed && pocketPos) {
    return (
      <group position={[pocketPos[0], 0, pocketPos[2]]}>
        {CoinVisuals}
      </group>
    );
  }

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      position={coin.position}
      colliders={false}
      mass={CARROM_PHYSICS.COIN.MASS}
      restitution={CARROM_PHYSICS.COIN.RESTITUTION}
      friction={CARROM_PHYSICS.COIN.FRICTION}
      linearDamping={CARROM_PHYSICS.COIN.LINEAR_DAMPING}
      angularDamping={CARROM_PHYSICS.COIN.ANGULAR_DAMPING}
      ccd={CARROM_PHYSICS.PHYSICS.CCD_ENABLED} 
      userData={{ id: coin.id, type: coin.type, isCoin: true }}
      onContactForce={(payload) => {
        if (payload.totalForce > 0.05) {
          const pos = payload.target.rigidBodyObject?.position;
          if (pos) {
            triggerVFX({
              type: 'impact',
              position: [pos.x, pos.y, pos.z],
              intensity: Math.min(payload.totalForce * 5, 10),
              color: coin.type === 'queen' ? '#E91E63' : (coin.type === 'white' ? '#fff' : '#444')
            });
          }
        }
      }}
    >
      <CylinderCollider args={[h / 2, r]} />
      {CoinVisuals}
    </RigidBody>
  );
}

export function CoinManager() {
  const coins = useCarromStore(state => state.coins);
  const initGame = useCarromStore(state => state.initGame);

  useEffect(() => {
    if (Object.keys(coins).length === 0) {
      initGame(createInitialCoins());
    }
  }, [coins, initGame]);

  return (
    <group>
      {Object.values(coins).map((coin) => (
        <Coin3D key={coin.id} coin={coin} />
      ))}
    </group>
  );
}
