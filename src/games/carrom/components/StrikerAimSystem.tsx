import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCarromStore } from '../state/CarromState';

export function StrikerAimSystem() {
  const aimMode = useCarromStore((state) => state.aimMode);
  const power = useCarromStore((state) => state.power);
  const aimAngle = useCarromStore((state) => state.aimAngle);
  const strikerPosition = useCarromStore((state) => state.strikerPosition);
  const turnState = useCarromStore((state) => state.turnState);

  const lineRef = useRef<any>();
  const dotRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (turnState !== 'AIMING' && turnState !== 'SHOOTING') return;

    if (aimMode === 'CLASSIC' || aimMode === 'ASSISTED') {
      const length = 0.5 * power;
      const endX = strikerPosition[0] + Math.cos(aimAngle) * length;
      const endZ = strikerPosition[2] - Math.sin(aimAngle) * length;

      if (lineRef.current) {
        lineRef.current.setPoints([
          new THREE.Vector3(strikerPosition[0], 0.01, strikerPosition[2]),
          new THREE.Vector3(endX, 0.01, endZ)
        ]);
        
        const color = new THREE.Color().lerpColors(
          new THREE.Color(0x00ffff),
          new THREE.Color(0xff4400),
          power
        );
        lineRef.current.material.color = color;
        lineRef.current.material.opacity = 0.3 + (power * 0.7);
      }

      if (aimMode === 'ASSISTED' && dotRef.current) {
        dotRef.current.position.set(endX, 0.01, endZ);
        dotRef.current.visible = true;
      } else if (dotRef.current) {
        dotRef.current.visible = false;
      }
    }
  });

  if (turnState !== 'AIMING' && turnState !== 'SHOOTING') return null;

  return (
    <group>
      {aimMode !== 'EXPERT' && (
        <Line
          ref={lineRef}
          points={[[0, 0, 0], [0, 0, 0]]}
          color="cyan"
          lineWidth={2}
          transparent
          opacity={0.5}
        />
      )}
      <mesh ref={dotRef} visible={false}>
        <circleGeometry args={[0.01, 16]} />
        <meshBasicMaterial color="yellow" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}
