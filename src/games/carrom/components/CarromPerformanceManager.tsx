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
  const { gl, scene } = useThree();
  const frames = useRef(0);
  const prevTime = useRef(performance.now());
  const qualityRef = useRef<QualityLevel>('HIGH');
  const highFpsCounter = useRef(0);

  useFrame(() => {
    frames.current++;
    const time = performance.now();

    if (time >= prevTime.current + 1000) {
      const fps = (frames.current * 1000) / (time - prevTime.current);
      
      // Basic governor logic
      let newQuality = qualityRef.current;
      
      const drawCalls = gl.info.render.calls;
      const triangles = gl.info.render.triangles;
      // activeVFX and physics bodies could be polled from their systems
      
      if (fps < 40 && qualityRef.current !== 'LOW') {
        newQuality = 'LOW';
        highFpsCounter.current = 0;
      } else if (fps > 55) {
        highFpsCounter.current++;
        if (highFpsCounter.current >= 5) {
          if (qualityRef.current === 'LOW') newQuality = 'MEDIUM';
          else if (qualityRef.current === 'MEDIUM') newQuality = 'HIGH';
          else if (qualityRef.current === 'HIGH') newQuality = 'ULTRA';
          highFpsCounter.current = 0;
        }
      } else {
        highFpsCounter.current = 0;
      }
      
      if (newQuality !== qualityRef.current) {
        qualityRef.current = newQuality;
        console.log(`[PerformanceGovernor] Adjusting quality to ${newQuality} (FPS: ${fps.toFixed(1)}, Calls: ${drawCalls}, Tris: ${triangles})`);
        
        // Adjust DPR dynamically
        if (newQuality === 'LOW') {
          gl.setPixelRatio(1);
        } else if (newQuality === 'MEDIUM') {
          gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
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
