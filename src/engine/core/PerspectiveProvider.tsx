// src/engine/core/PerspectiveProvider.tsx
import { useEffect, useRef } from 'react';
import { PerspectiveController } from './PerspectiveController';
import { ParallaxEngine } from './ParallaxEngine';

// Global instances
export const perspective = new PerspectiveController();
export const parallax = new ParallaxEngine();

export function PerspectiveProvider({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      const { rotX, rotY } = perspective.update(deltaTime);
      parallax.update(deltaTime);

      if (containerRef.current) {
        containerRef.current.style.setProperty('--perspective-x', `${rotX}deg`);
        containerRef.current.style.setProperty('--perspective-y', `${rotY}deg`);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ perspective: '1200px' }}
      className="perspective-root min-h-screen"
    >
      <div 
        className="perspective-container min-h-screen"
        style={{ 
          transform: 'rotateX(var(--perspective-x, 0deg)) rotateY(var(--perspective-y, 0deg))',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.1s linear' // smooth micro-stutters
        }}
      >
        {children}
      </div>
    </div>
  );
}
