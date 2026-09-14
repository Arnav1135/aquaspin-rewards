import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useQuality } from '../../../engine/aaa';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

// Singleton event target for quality changes
export const carromQualityEvents = new EventTarget();

export function useCarromQuality() {
  const { tier } = useQuality();
  return tier as QualityLevel;
}

export function CarromPerformanceManager() {
  const { tier, setTier } = useQuality();
  const { gl } = useThree();
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  const highFpsCounter = useRef(0);

  useFrame(() => {
    frames.current++;
    const time = performance.now();

    if (time >= prevTime.current + 1000) {
      const fps = (frames.current * 1000) / (time - prevTime.current);
      
      let newQuality = tier;
      
      if (fps < 40 && tier !== 'LOW') {
        newQuality = 'LOW';
        highFpsCounter.current = 0;
      } else if (fps > 55) {
        highFpsCounter.current++;
        if (highFpsCounter.current >= 5) {
          if (tier === 'LOW') newQuality = 'MEDIUM';
          else if (tier === 'MEDIUM') newQuality = 'HIGH';
          else if (tier === 'HIGH') newQuality = 'ULTRA';
          highFpsCounter.current = 0;
        }
      } else {
        highFpsCounter.current = 0;
      }
      
      if (newQuality !== tier) {
        setTier(newQuality);
        carromQualityEvents.dispatchEvent(new CustomEvent('quality', { detail: newQuality }));
      }

      frames.current = 0;
      prevTime.current = time;
    }
  });

  return null;
}
