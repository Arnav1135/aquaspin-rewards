import React from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromStore } from '../state/CarromState';
import { triggerVFX } from './CarromVFXSystem';
import { getWoodTexture } from '../materials/ProceduralWood';
import * as THREE from 'three';

export function Board3D() {
  const pocketCoin = useCarromStore(state => state.pocketCoin);
  const woodTex = getWoodTexture();
  
  const bw = CARROM_PHYSICS.BOARD.WIDTH;
  const border = CARROM_PHYSICS.BOARD.BORDER_WIDTH;
  const halfBw = bw / 2;
  const halfBorder = border / 2;
  const edgeH = 0.04;
  const surfaceH = 0.02; // Thickness of the playing surface
  
  const pOffset = halfBw - 0.04;
  const pocketPositions: [number, number, number][] = [
    [-pOffset, 0, -pOffset],
    [pOffset, 0, -pOffset],
    [-pOffset, 0, pOffset],
    [pOffset, 0, pOffset],
  ];

  return (
    <group>
      {/* Playing Surface */}
      <RigidBody 
        type="fixed" 
        restitution={CARROM_PHYSICS.BOARD.RESTITUTION} 
        friction={CARROM_PHYSICS.BOARD.FRICTION}
      >
        <CuboidCollider args={[halfBw, surfaceH / 2, halfBw]} position={[0, -surfaceH / 2, 0]} />
        <mesh position={[0, -surfaceH / 2, 0]} receiveShadow>
          <boxGeometry args={[bw, surfaceH, bw]} />
          <meshStandardMaterial color="#f0d5a3" roughness={0.6} />
        </mesh>
      </RigidBody>

      {/* Frame / Borders */}
      <RigidBody 
        type="fixed" 
        restitution={CARROM_PHYSICS.BOARD.EDGE_RESTITUTION} 
        friction={CARROM_PHYSICS.BOARD.EDGE_FRICTION}
      >
        {/* Top Border */}
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2, -halfBw - halfBorder]} />
        <mesh position={[0, edgeH / 2, -halfBw - halfBorder]} receiveShadow castShadow>
          <boxGeometry args={[bw + border * 2, edgeH, border]} />
          <meshPhysicalMaterial map={woodTex} color="#6b3e1b" roughness={0.8} clearcoat={0.1} />
        </mesh>
        
        {/* Bottom Border */}
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2, halfBw + halfBorder]} />
        <mesh position={[0, edgeH / 2, halfBw + halfBorder]} receiveShadow castShadow>
          <boxGeometry args={[bw + border * 2, edgeH, border]} />
          <meshPhysicalMaterial map={woodTex} color="#6b3e1b" roughness={0.8} clearcoat={0.1} />
        </mesh>

        {/* Left Border */}
        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[-halfBw - halfBorder, edgeH / 2, 0]} />
        <mesh position={[-halfBw - halfBorder, edgeH / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[border, edgeH, bw]} />
          <meshPhysicalMaterial map={woodTex} color="#6b3e1b" roughness={0.8} clearcoat={0.1} />
        </mesh>

        {/* Right Border */}
        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[halfBw + halfBorder, edgeH / 2, 0]} />
        <mesh position={[halfBw + halfBorder, edgeH / 2, 0]} receiveShadow castShadow>
          <boxGeometry args={[border, edgeH, bw]} />
          <meshPhysicalMaterial map={woodTex} color="#6b3e1b" roughness={0.8} clearcoat={0.1} />
        </mesh>
      </RigidBody>

      {/* Pocket Sensors */}
      {pocketPositions.map((pos, i) => (
        <RigidBody 
          key={`pocket-${i}`} 
          type="fixed" 
          position={pos} 
          sensor
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.userData?.isCoin) {
              pocketCoin(other.rigidBodyObject.userData.id);
              triggerVFX({
                type: 'pocket',
                position: pos,
                intensity: 1.0,
              });
            }
            if (other.rigidBodyObject?.userData?.isStriker) {
              // Handle foul logic (can call a state method)
              console.log("Foul! Striker Pocketed");
            }
          }}
        >
          <CylinderCollider args={[0.01, CARROM_PHYSICS.POCKET.RADIUS]} />
          {/* Visual hole */}
          <mesh rotation={[Math.PI/2, 0, 0]} position={[0, -surfaceH/2 + 0.001, 0]}>
            <circleGeometry args={[CARROM_PHYSICS.POCKET.RADIUS, 32]} />
            <meshBasicMaterial color="#111" transparent opacity={0.8} />
          </mesh>
          {/* Pocket Net / Cavity */}
          <mesh rotation={[0, 0, 0]} position={[0, -surfaceH/2 - 0.015, 0]}>
            <cylinderGeometry args={[CARROM_PHYSICS.POCKET.RADIUS, CARROM_PHYSICS.POCKET.RADIUS * 0.8, 0.03, 16, 1, true]} />
            <meshStandardMaterial color="#222" side={THREE.DoubleSide} wireframe={true} transparent opacity={0.5} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
