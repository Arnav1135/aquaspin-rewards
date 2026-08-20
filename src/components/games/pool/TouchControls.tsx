import React, { useRef, useEffect } from 'react';
import { usePoolRules } from './RulesEngine';

interface TouchControlsProps {
  onAimChange: (deltaX: number) => void;
  onStrike: (power: number) => void;
  power: number;
  setPower: (p: number) => void;
}

/* eslint-disable react-hooks/rules-of-hooks */
export function TouchControls({ onAimChange, onStrike, power, setPower }: TouchControlsProps) {
  const turnState = usePoolRules(s => s.turnState);
  const isDraggingAim = useRef(false);
  const isDraggingPower = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);

  // We only show controls when aiming
  if (turnState !== 'AIMING' && turnState !== 'BALL_IN_HAND') return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    // Check if clicking on the power slider
    const powerSlider = document.getElementById('pool-power-slider');
    if (powerSlider && powerSlider.contains(e.target as Node)) {
      isDraggingPower.current = true;
      lastY.current = e.clientY;
      // Also set initial power based on click
      const rect = powerSlider.getBoundingClientRect();
      const p = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
      setPower(p);
      return;
    }

    // Otherwise, aim drag
    isDraggingAim.current = true;
    lastX.current = e.clientX;
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (isDraggingAim.current) {
      const deltaX = e.clientX - lastX.current;
      onAimChange(deltaX * 0.005); // Sensitivity
      lastX.current = e.clientX;
    }

    if (isDraggingPower.current) {
      const powerSlider = document.getElementById('pool-power-slider');
      if (powerSlider) {
        const rect = powerSlider.getBoundingClientRect();
        // Power is 1 at top, 0 at bottom
        let p = 1 - (e.clientY - rect.top) / rect.height;
        p = Math.max(0, Math.min(1, p));
        setPower(p);
      }
    }
  };

  const handlePointerUp = () => {
    if (isDraggingAim.current) {
      isDraggingAim.current = false;
    }

    if (isDraggingPower.current) {
      isDraggingPower.current = false;
      // Strike!
      const p = power;
      if (p > 0.05) {
        onStrike(p);
      }
      setPower(0);
    }
  };

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [power]);

  return (
    <div 
      className="absolute inset-0 z-10 touch-none pointer-events-auto"
      onPointerDown={handlePointerDown}
    >
      {/* Power Slider UI */}
      <div 
        id="pool-power-slider"
        className="absolute left-6 top-1/4 bottom-1/4 w-12 bg-black/50 border-2 border-white/20 rounded-full flex flex-col justify-end overflow-hidden shadow-[0_0_15px_rgba(0,0,0,0.5)]"
      >
        <div 
          className="w-full bg-gradient-to-t from-orange-500 to-red-500 rounded-full shadow-[0_0_20px_rgba(255,0,0,0.8)]"
          style={{ height: `${power * 100}%` }}
        />
        {/* Sweet spot indicator */}
        <div className="absolute top-[10%] left-0 right-0 h-1 bg-red-400/80 shadow-[0_0_5px_red]" />
      </div>

      <div className="absolute left-8 bottom-12 text-white/50 text-xs font-bold uppercase tracking-widest rotate-[-90deg] origin-left">
        Drag to Strike
      </div>
      
      <div className="absolute bottom-12 right-12 w-24 h-24 bg-white/5 rounded-full border border-white/20 flex items-center justify-center pointer-events-none">
        <div className="text-white/30 text-xs text-center font-bold uppercase tracking-widest">
          Drag screen<br/>to aim
        </div>
      </div>
    </div>
  );
}
