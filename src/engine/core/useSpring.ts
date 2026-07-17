// src/engine/core/useSpring.ts
import { useEffect, useRef, useState } from 'react';
import { SpringPhysics } from './SpringPhysics';

export function useSpring(targetValue: number, config = { stiffness: 170, damping: 26 }) {
  const [value, setValue] = useState(targetValue);
  const springRef = useRef<SpringPhysics | null>(null);
  const animationFrameRef = useRef<number>(0);

  if (!springRef.current) {
    springRef.current = new SpringPhysics({ ...config, initialPosition: targetValue });
  }

  useEffect(() => {
    springRef.current?.setTarget(targetValue);
    let lastTime = performance.now();

    const tick = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const settled = springRef.current?.tick(deltaTime);
      
      if (springRef.current) {
        setValue(springRef.current.position);
      }

      if (!settled) {
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [targetValue]);

  return value;
}
