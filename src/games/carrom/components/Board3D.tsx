import React, { useMemo } from 'react';
import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { useCarromStore } from '../state/CarromState';
import { triggerVFX } from './CarromVFXSystem';
import { getWoodTexture } from '../materials/ProceduralWood';
import { CarromMaterialProfile } from '../materials/CarromMaterialProfile';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

export function Board3D() {
  const pocketCoin = useCarromStore(state => state.pocketCoin);
  const woodTex = getWoodTexture();
  const surfaceMaterial = useMemo(() => CarromMaterialProfile.getBoardSurfaceMaterial(), []);
  const edgeMaterial = useMemo(() => CarromMaterialProfile.getBoardEdgeMaterial(woodTex), [woodTex]);
  
  const bw = CARROM_PHYSICS.BOARD.WIDTH;
  const border = CARROM_PHYSICS.BOARD.BORDER_WIDTH;
  const halfBw = bw / 2;
  const halfBorder = border / 2;
  const edgeH = 0.05; // Slightly taller frame
  const surfaceH = 0.02; // Thickness of the playing surface
  
  const pOffset = halfBw - 0.04;
  const pocketPositions: [number, number, number][] = [
    [-pOffset, 0, -pOffset],
    [pOffset, 0, -pOffset],
    [-pOffset, 0, pOffset],
    [pOffset, 0, pOffset],
  ];

  const boardShape = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-halfBw, -halfBw);
    shape.lineTo(halfBw, -halfBw);
    shape.lineTo(halfBw, halfBw);
    shape.lineTo(-halfBw, halfBw);
    shape.lineTo(-halfBw, -halfBw);

    const r = CARROM_PHYSICS.POCKET.RADIUS;
    
    pocketPositions.forEach(([x, _, z]) => {
      const hole = new THREE.Path();
      hole.absarc(x, -z, r, 0, Math.PI * 2, false); // -z because Shape uses X, Y(Z)
      shape.holes.push(hole);
    });

    return shape;
  }, [halfBw, pocketPositions]);

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
          <extrudeGeometry args={[boardShape, { depth: surfaceH, bevelEnabled: false, curveSegments: 32 }]} />
        </mesh>
        
        {/* Decorations */}
        <mesh position={[0, 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.1, 0.102, 64]} />
          <meshBasicMaterial color="#a67c52" transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.0001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.403, 64]} />
          <meshBasicMaterial color="#a67c52" transparent opacity={0.6} />
        </mesh>
      </RigidBody>

      {/* Frame / Borders */}
      <RigidBody 
        type="fixed" 
        restitution={CARROM_PHYSICS.BOARD.EDGE_RESTITUTION} 
        friction={CARROM_PHYSICS.BOARD.EDGE_FRICTION}
      >
        {/* Borders with RoundedBox for premium bevel */}
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2, -halfBw - halfBorder]} />
        <RoundedBox args={[bw + border * 2, edgeH, border]} radius={0.005} smoothness={16} position={[0, edgeH / 2, -halfBw - halfBorder]} receiveShadow castShadow material={edgeMaterial} />
        
        <CuboidCollider args={[halfBw + border, edgeH / 2, halfBorder]} position={[0, edgeH / 2, halfBw + halfBorder]} />
        <RoundedBox args={[bw + border * 2, edgeH, border]} radius={0.005} smoothness={16} position={[0, edgeH / 2, halfBw + halfBorder]} receiveShadow castShadow material={edgeMaterial} />

        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[-halfBw - halfBorder, edgeH / 2, 0]} />
        <RoundedBox args={[border, edgeH, bw]} radius={0.005} smoothness={16} position={[-halfBw - halfBorder, edgeH / 2, 0]} receiveShadow castShadow material={edgeMaterial} />

        <CuboidCollider args={[halfBorder, edgeH / 2, halfBw]} position={[halfBw + halfBorder, edgeH / 2, 0]} />
        <RoundedBox args={[border, edgeH, bw]} radius={0.005} smoothness={16} position={[halfBw + halfBorder, edgeH / 2, 0]} receiveShadow castShadow material={edgeMaterial} />
      </RigidBody>

      {/* Pocket Catchers (Below the board) */}
      {pocketPositions.map((pos, i) => (
        <RigidBody 
          key={`pocket-${i}`} 
          type="fixed" 
          position={[pos[0], -surfaceH - 0.02, pos[2]]} 
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
              console.log("Foul! Striker Pocketed");
            }
          }}
        >
          <CylinderCollider args={[0.01, CARROM_PHYSICS.POCKET.RADIUS * 1.5]} />
          {/* Pocket Net / Cavity */}
          <mesh rotation={[0, 0, 0]} position={[0, -0.015, 0]}>
            <cylinderGeometry args={[CARROM_PHYSICS.POCKET.RADIUS, CARROM_PHYSICS.POCKET.RADIUS * 0.8, 0.05, 16, 1, true]} />
            <meshStandardMaterial color="#222" side={THREE.DoubleSide} wireframe={true} transparent opacity={0.5} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  );
}
