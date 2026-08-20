import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { carromVfxEvents, VFXEvent } from './CarromVFXSystem';

const POCKET_POSITIONS = [
  [-0.45, 0, -0.45],
  [0.45, 0, -0.45],
  [-0.45, 0, 0.45],
  [0.45, 0, 0.45],
];

export function PocketNetSystem() {
  return (
    <group>
      {POCKET_POSITIONS.map((pos, i) => (
        <PocketNet key={i} position={pos as [number, number, number]} />
      ))}
    </group>
  );
}

function PocketNet({ position }: { position: [number, number, number] }) {
  const [active, setActive] = useState(false);
  
  const { scaleY, displacement } = useSpring({
    scaleY: active ? 1.5 : 1.0,
    displacement: active ? -0.05 : 0,
    config: { tension: 300, friction: 10 },
    onRest: () => setActive(false),
  });

  useEffect(() => {
    const handleEvent = (e: CustomEvent<VFXEvent>) => {
      const { type, position: evPos } = e.detail;
      if (type === 'pocket') {
        const dx = evPos[0] - position[0];
        const dz = evPos[2] - position[2];
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 0.1) {
          setActive(true);
        }
      }
    };
    
    carromVfxEvents.addEventListener('vfx', handleEvent as EventListener);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent as EventListener);
  }, [position]);

  return (
    <a.mesh 
      position-x={position[0]} 
      position-y={displacement}
      position-z={position[2]}
      scale-y={scaleY}
    >
      {/* A simple cylinder representing the net, open at the top */}
      <cylinderGeometry args={[0.04, 0.03, 0.08, 16, 1, true]} />
      <meshPhysicalMaterial 
        color="#222222" 
        wireframe={true} 
        roughness={0.8}
        metalness={0.2}
        transparent={true}
        opacity={0.5}
      />
    </a.mesh>
  );
}
