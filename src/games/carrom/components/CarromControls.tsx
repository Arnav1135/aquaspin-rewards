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
  const planeRef = useRef<THREE.Mesh>(null);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (turnState === 'PLACING_STRIKER' || turnState === 'AIMING') {
      // Capture pointer for reliable mobile touch tracking
      (e.target as Element).setPointerCapture(e.pointerId);
      
      setDragStart(e.point.clone());
      if (turnState === 'PLACING_STRIKER') {
        setTurnState('AIMING');
      }
    }
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (turnState === 'PLACING_STRIKER') {
      // Restrict to baseline with smoother clamping
      const baselineZ = 0.28;
      const playableWidth = CARROM_PHYSICS.BOARD.WIDTH / 2 - 0.12; 
      const x = Math.max(-playableWidth, Math.min(playableWidth, e.point.x));
      setStrikerPosition([x, CARROM_PHYSICS.STRIKER.HEIGHT / 2, baselineZ]);
    } else if (turnState === 'AIMING' && dragStart) {
      const dx = dragStart.x - e.point.x;
      const dz = dragStart.z - e.point.z;
      
      const distance = Math.sqrt(dx*dx + dz*dz);
      // Determine angle (invert dz because screen z is opposite to mathematical y in 2D)
      const angle = Math.atan2(-dz, dx);
      
      // Exponential curve for better fine-tune power on mobile
      const rawPower = Math.min(100, Math.max(0, (distance / 0.3) * 100));
      const power = Math.pow(rawPower / 100, 1.2) * 100;
      
      setAimAngle(angle);
      setPower(power);
    }
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (turnState === 'AIMING' && dragStart) {
      (e.target as Element).releasePointerCapture(e.pointerId);
      useCarromStore.getState().recordReplay();
      setTurnState('SHOOTING');
      setDragStart(null);
    } else if (turnState === 'PLACING_STRIKER') {
      (e.target as Element).releasePointerCapture(e.pointerId);
      setTurnState('AIMING');
    }
  };

  return (
    <group>
      {/* Invisible large interaction plane for reliable mobile panning/dragging */}
      <mesh 
        ref={planeRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0.02, 0]}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerOut={handlePointerUp}
        onPointerCancel={handlePointerUp}
        visible={false}
      >
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial transparent opacity={0.0} color="red" />
      </mesh>
    </group>
  );
}
