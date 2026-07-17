// src/components/layout/AmbientBackground.tsx
import { useEffect, useRef } from 'react';
import { ParticleSystem } from '@/engine/renderers/ParticleSystem';

export function AmbientBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const system = new ParticleSystem(canvasRef.current);
    
    return () => {
      system.destroy();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[-1] pointer-events-none overflow-hidden bg-[#EFF6FF]">
      {/* Dynamic Particle Nebula */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full opacity-60"
        style={{ mixBlendMode: 'screen' }}
      />
      
      {/* Aurora SVG Filter overlay */}
      <svg className="hidden">
        <filter id="aurora-waves">
          <feTurbulence type="fractalNoise" baseFrequency="0.01 0.05" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="50" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div 
        className="absolute inset-0 opacity-30 mix-blend-overlay"
        style={{
          background: 'linear-gradient(45deg, #93C5FD 0%, transparent 50%, #60A5FA 100%)',
          filter: 'url(#aurora-waves)',
          animation: 'aurora-shift 20s infinite alternate linear'
        }}
      />
    </div>
  );
}
