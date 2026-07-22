import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { usePoolStore } from './store';
import { MathUtils, Vector3 } from 'three';

export function PoolControls() {
  const { camera } = useThree();
  const phase = usePoolStore((state) => state.phase);
  const setPhase = usePoolStore((state) => state.setPhase);
  const aimAngle = usePoolStore((state) => state.aimAngle);
  const setAimAngle = usePoolStore((state) => state.setAimAngle);
  const power = usePoolStore((state) => state.power);
  const setPower = usePoolStore((state) => state.setPower);
  const cueBallPosition = usePoolStore((state) => state.cueBallPosition);
  const incrementShots = usePoolStore((state) => state.incrementShots);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  // Camera distance from cue ball
  const camDist = 12;

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      if (phase === 'aiming') {
        setIsDragging(true);
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      if (phase === 'aiming') {
        const dx = e.clientX - dragStart.current.x;
        const dy = e.clientY - dragStart.current.y;
        
        // Horizontal drag changes aim angle
        setAimAngle(aimAngle - dx * 0.005);
        
        // Vertical drag (pulling down) increases power
        const newPower = MathUtils.clamp(power + dy * 0.002, 0, 1);
        setPower(newPower);
        
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handlePointerUp = () => {
      if (isDragging && phase === 'aiming') {
        setIsDragging(false);
        if (power > 0.05) {
          // Shoot!
          setPhase('shooting');
          incrementShots();
          // The actual physics impulse is handled via an event dispatch or store listener,
          // but since we need the `api` from `useSphere` which is inside PoolBall3D,
          // we can dispatch a custom event.
          window.dispatchEvent(new CustomEvent('pool-shoot', { detail: { angle: aimAngle, power } }));
        }
        setPower(0);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, phase, aimAngle, power, setAimAngle, setPower, setPhase, incrementShots]);

  useFrame(() => {
    // Camera follow logic
    const cx = cueBallPosition[0];
    const cy = cueBallPosition[1];
    const cz = cueBallPosition[2];

    if (phase === 'aiming' || phase === 'shooting') {
      // Position camera behind the cue ball, looking at it along the aim angle
      // Aim angle 0 means looking down the negative Z axis.
      const targetCamX = cx + Math.sin(aimAngle) * camDist;
      const targetCamY = cy + 5; // Height above table
      const targetCamZ = cz + Math.cos(aimAngle) * camDist;

      camera.position.lerp(new Vector3(targetCamX, targetCamY, targetCamZ), 0.1);
      camera.lookAt(cx, cy, cz);
    }
  });

  return null;
}
