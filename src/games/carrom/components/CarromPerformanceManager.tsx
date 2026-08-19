import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

// Singleton event target for quality changes
export const carromQualityEvents = new EventTarget();

export function useCarromQuality() {
  const [quality, setQuality] = useState<QualityLevel>('HIGH');

  useEffect(() => {
    const handleQuality = (e: Event) => {
      setQuality((e as CustomEvent).detail);
    };
    carromQualityEvents.addEventListener('quality', handleQuality);
    return () => carromQualityEvents.removeEventListener('quality', handleQuality);
  }, []);

  return quality;
}

export function CarromPerformanceManager() {
  const { gl } = useThree();
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  const qualityRef = useRef<QualityLevel>('HIGH');

  useFrame(() => {
    frames.current++;
    const time = performance.now();

    if (time >= prevTime.current + 1000) {
      const fps = (frames.current * 1000) / (time - prevTime.current);
      
      // Basic governor logic
      let newQuality = qualityRef.current;
      if (fps < 40 && qualityRef.current !== 'LOW') {
        newQuality = 'LOW';
      } else if (fps > 55 && qualityRef.current === 'LOW') {
        newQuality = 'MEDIUM'; // recover slowly
      }
      
      if (newQuality !== qualityRef.current) {
        qualityRef.current = newQuality;
        console.log(`[PerformanceGovernor] Adjusting quality to ${newQuality} (FPS: ${fps.toFixed(1)})`);
        
        // Adjust DPR dynamically
        if (newQuality === 'LOW') {
          gl.setPixelRatio(1);
        } else {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        }

        carromQualityEvents.dispatchEvent(new CustomEvent('quality', { detail: newQuality }));
      }

      frames.current = 0;
      prevTime.current = time;
    }
  });

  return null;
}
