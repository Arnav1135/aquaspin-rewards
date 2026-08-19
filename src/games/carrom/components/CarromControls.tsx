import React, { useRef, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import * as THREE from 'three';

export function CarromControls() {
  const turnState = useCarromStore(state => state.turnState);
  const setTurnState = useCarromStore(state => state.setTurnState);
  const strikerPosition = useCarromStore(state => state.strikerPosition);
  const setStrikerPosition = useCarromStore(state => state.setStrikerPosition);
  const setAimAngle = useCarromStore(state => state.setAimAngle);
  const setPower = useCarromStore(state => state.setPower);
  
  const [dragStart, setDragStart] = useState<THREE.Vector3 | null>(null);
  const [currentDrag, setCurrentDrag] = useState<THREE.Vector3 | null>(null);
  
  const planeRef = useRef<THREE.Mesh>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (turnState === 'PLACING_STRIKER' || turnState === 'AIMING') {
      setDragStart(e.point.clone());
      setCurrentDrag(e.point.clone());
      if (turnState === 'PLACING_STRIKER') {
        setTurnState('AIMING');
      }
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (turnState === 'PLACING_STRIKER') {
      // Restrict to baseline
      const baselineZ = 0.28;
      const x = Math.max(-0.25, Math.min(0.25, e.point.x));
      setStrikerPosition([x, CARROM_PHYSICS.STRIKER.HEIGHT / 2, baselineZ]);
    } else if (turnState === 'AIMING' && dragStart) {
      setCurrentDrag(e.point.clone());
      
      const dx = dragStart.x - e.point.x;
      const dz = dragStart.z - e.point.z;
      
      const distance = Math.sqrt(dx*dx + dz*dz);
      const angle = Math.atan2(dz, dx);
      
      const power = Math.min(100, Math.max(0, (distance / 0.2) * 100));
      
      setAimAngle(angle);
      setPower(power);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    if (turnState === 'AIMING' && dragStart) {
      useCarromStore.getState().recordReplay();
      setTurnState('SHOOTING');
      setDragStart(null);
      setCurrentDrag(null);
    } else if (turnState === 'PLACING_STRIKER') {
      setTurnState('AIMING');
    }
  };

  return (
    <group>
      {/* Invisible interaction plane */}
      <mesh 
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.02, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
        visible={false}
      >
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial transparent opacity={0.1} color="red" />
      </mesh>
      
      {/* Trajectory Guide */}
      {turnState === 'AIMING' && dragStart && currentDrag && (
        <group position={strikerPosition}>
          <mesh rotation={[0, -useCarromStore.getState().aimAngle, 0]}>
            {/* Draw a line or cylinder pointing towards aim direction */}
            <cylinderGeometry args={[0.002, 0.002, 0.5]} />
            <meshBasicMaterial color="rgba(255, 255, 255, 0.5)" />
          </mesh>
        </group>
      )}
    </group>
  );
}
