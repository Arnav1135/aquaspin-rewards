// Phase 13: Board Depth
import React from 'react';
import * as THREE from 'three';

export const BoardRenderer = () => {
  return (
    <group position={[0,0,-1]}>
      {/* Deep Shadow Layer */}
      <mesh position={[0,0,-0.5]}>
         <boxGeometry args={[10, 10, 1]} />
         <meshStandardMaterial color={0x0a0a0a} roughness={0.9} />
      </mesh>
      
      {/* 3D Contact Bevel Grid */}
      <gridHelper args={[10, 10, 0x333333, 0x111111]} rotation={[Math.PI/2, 0, 0]} />
      
      {/* Parallax Background Glass */}
      <mesh position={[0,0,-1.5]}>
         <planeGeometry args={[15, 15]} />
         <meshPhysicalMaterial color={0x110033} transmission={0.9} roughness={0.3} clearcoat={1.0} />
      </mesh>
    </group>
  )
}
