import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useVFX } from '../../../engine/aaa';
import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromQuality } from './CarromPerformanceManager';
import { getWoodTexture } from '../materials/ProceduralWood';
import { CarromMaterialProfile } from '../materials/CarromMaterialProfile';

const bw = CARROM_PHYSICS.BOARD.WIDTH;
const border = CARROM_PHYSICS.BOARD.BORDER_WIDTH;
const halfBw = bw / 2;
const halfBorder = border / 2;
const edgeH = CARROM_PHYSICS.BOARD.THICKNESS + 0.02; // Edge sits above surface
const surfaceH = CARROM_PHYSICS.BOARD.THICKNESS; 
const pOffset = halfBw - 0.04;
const POCKET_POSITIONS: [number, number, number][] = [
  [-pOffset, 0, -pOffset],
  [pOffset, 0, -pOffset],
  [-pOffset, 0, pOffset],
  [pOffset, 0, pOffset],
];

export function Board3D() {
  const pocketCoin = useCarromStore(state => state.pocketCoin);
  const addPocketedThisTurn = useCarromStore(state => state.addPocketedThisTurn);
  const setStrikerFouled = useCarromStore(state => state.setStrikerFouled);
  const { spawnEffect } = useVFX();
  
  const quality = useCarromQuality();
  const woodTex = getWoodTexture();
  const surfaceMaterial = useMemo(() => CarromMaterialProfile.getBoardSurfaceMaterial(), []);
  const edgeMaterial = useMemo(() => CarromMaterialProfile.getBoardEdgeMaterial(woodTex), [woodTex]);
  
  const boardShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfBw, -halfBw);
    shape.lineTo(halfBw, -halfBw);
    shape.lineTo(halfBw, halfBw);
    shape.lineTo(-halfBw, halfBw);
    shape.lineTo(-halfBw, -halfBw);

    const r = CARROM_PHYSICS.POCKET.RADIUS;
    
    POCKET_POSITIONS.forEach(([x, _, z]) => {
      const hole = new THREE.Path();
      hole.absarc(x, -z, r, 0, Math.PI * 2, false); // -z because Shape uses X, Y(Z)
      shape.holes.push(hole);
    });

    return shape;
  }, []);

  return (
    <group>
      {/* Playing Surface with real holes */}
      <RigidBody 
        type="fixed" 
        restitution={CARROM_PHYSICS.BOARD.RESTITUTION} 
        friction={CARROM_PHYSICS.BOARD.FRICTION}
        colliders="trimesh"
      >
        <mesh receiveShadow material={surfaceMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, -surfaceH, 0]}>
          <extrudeGeometry args={[boardShape, { depth: surfaceH, bevelEnabled: true, bevelThickness: 0.001, bevelSize: 0.001, bevelSegments: 3, curveSegments: 64 }]} />
        </mesh>
        
        {/* Decorations - High Res */}
        <mesh position={[0, 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.102, 128]} />
          <meshBasicMaterial color="#a67c52" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.403, 128]} />
          <meshBasicMaterial color="#a67c52" transparent opacity={0.8} />
        </mesh>
      </RigidBody>

      {/* Frame / Borders */}
      <RigidBody 
        type="fixed" 
        restitution={CARROM_PHYSICS.BOARD.EDGE_RESTITUTION} 
        friction={CARROM_PHYSICS.BOARD.EDGE_FRICTION}
      >
        {/* Top Border */}
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2 - surfaceH, -halfBw - halfBorder]} />
        <RoundedBox args={[bw + border * 2, edgeH, border]} radius={0.01} smoothness={32} position={[0, edgeH / 2 - surfaceH, -halfBw - halfBorder]} receiveShadow castShadow material={edgeMaterial} />
        
        {/* Bottom Border */}
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2 - surfaceH, halfBw + halfBorder]} />
        <RoundedBox args={[bw + border * 2, edgeH, border]} radius={0.01} smoothness={32} position={[0, edgeH / 2 - surfaceH, halfBw + halfBorder]} receiveShadow castShadow material={edgeMaterial} />

        {/* Left Border */}
        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[-halfBw - halfBorder, edgeH / 2 - surfaceH, 0]} />
        <RoundedBox args={[border, edgeH, bw]} radius={0.01} smoothness={32} position={[-halfBw - halfBorder, edgeH / 2 - surfaceH, 0]} receiveShadow castShadow material={edgeMaterial} />

        {/* Right Border */}
        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[halfBw + halfBorder, edgeH / 2 - surfaceH, 0]} />
        <RoundedBox args={[border, edgeH, bw]} radius={0.01} smoothness={32} position={[halfBw + halfBorder, edgeH / 2 - surfaceH, 0]} receiveShadow castShadow material={edgeMaterial} />
      </RigidBody>

      {/* Deep Pocket Catchers (Below the board) */}
      {POCKET_POSITIONS.map((pos, i) => (
        <RigidBody 
          key={`pocket-${i}`} 
          type="fixed" 
          position={[pos[0], -surfaceH - (CARROM_PHYSICS.POCKET.DEPTH / 2), pos[2]]} 
          sensor
          onIntersectionEnter={({ other }) => {
            if (other.rigidBodyObject?.userData?.isCoin) {
              const coinId = other.rigidBodyObject.userData.id;
              pocketCoin(coinId);
              addPocketedThisTurn(coinId);
              spawnEffect('pocket', new THREE.Vector3(pos[0], pos[1], pos[2]), {
                intensity: 1.5,
              });
            }
            if (other.rigidBodyObject?.userData?.isStriker) {
              setStrikerFouled(true);
            }
          }}
        >
          <CylinderCollider args={[CARROM_PHYSICS.POCKET.DEPTH / 2, CARROM_PHYSICS.POCKET.RADIUS * 1.2]} />
          {/* High quality Pocket Net / Cavity */}
          <mesh rotation={[0, 0, 0]} position={[0, 0, 0]}>
            <cylinderGeometry args={[CARROM_PHYSICS.POCKET.RADIUS, CARROM_PHYSICS.POCKET.RADIUS * 0.9, CARROM_PHYSICS.POCKET.DEPTH, 32, 1, true]} />
            <meshStandardMaterial color="#111" side={THREE.DoubleSide} wireframe={true} transparent opacity={0.6} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
