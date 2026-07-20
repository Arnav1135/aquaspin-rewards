// src/engine/input/TouchControls.tsx
import { useState } from 'react';
import { inputManager, InputAction } from './InputManager';

export interface TouchControlsProps {
  showJoystick?: boolean;
  actionButtons?: Array<{ action: InputAction; label: string; color?: string }>;
}

export function TouchControls({
  showJoystick = true,
  actionButtons = [
    { action: 'jump', label: 'JUMP', color: 'bg-cyan-500/30 border-cyan-400' },
    { action: 'interact', label: 'ACTION', color: 'bg-purple-500/30 border-purple-400' },
  ],
}: TouchControlsProps) {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [joystickPos, setJoystickPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  };

  const handleJoystickMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 40;

    const angle = Math.atan2(dy, dx);
    const clampedDist = Math.min(dist, maxRadius);
    const normX = (clampedDist * Math.cos(angle)) / maxRadius;
    const normY = (clampedDist * Math.sin(angle)) / maxRadius;

    setJoystickPos({ x: normX * maxRadius, y: normY * maxRadius });

    // Feed into InputManager
    inputManager.setVirtualAction('moveRight', normX > 0.3);
    inputManager.setVirtualAction('moveLeft', normX < -0.3);
    inputManager.setVirtualAction('moveBackward', normY > 0.3);
    inputManager.setVirtualAction('moveForward', normY < -0.3);
  };

  const handleJoystickEnd = () => {
    setTouchStart(null);
    setJoystickPos({ x: 0, y: 0 });
    inputManager.setVirtualAction('moveRight', false);
    inputManager.setVirtualAction('moveLeft', false);
    inputManager.setVirtualAction('moveBackward', false);
    inputManager.setVirtualAction('moveForward', false);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex justify-between p-6 select-none">
      {/* Virtual Joystick */}
      {showJoystick && (
        <div
          className="pointer-events-auto self-end w-28 h-28 rounded-full border-2 border-cyan-500/40 bg-navy-900/60 backdrop-blur-md flex items-center justify-center relative touch-none"
          onTouchStart={handleJoystickStart}
          onTouchMove={handleJoystickMove}
          onTouchEnd={handleJoystickEnd}
        >
          <div
            className="w-12 h-12 rounded-full bg-cyan-400/80 shadow-[0_0_15px_rgba(0,240,255,0.6)]"
            style={{
              transform: `translate(${joystickPos.x}px, ${joystickPos.y}px)`,
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="pointer-events-auto self-end flex gap-3">
        {actionButtons.map((btn) => (
          <button
            key={btn.action}
            className={`w-14 h-14 rounded-full border backdrop-blur-md flex items-center justify-center font-bold text-xs text-white active:scale-95 transition-transform ${btn.color || 'bg-cyan-500/30 border-cyan-400'}`}
            onTouchStart={() => inputManager.setVirtualAction(btn.action, true)}
            onTouchEnd={() => inputManager.setVirtualAction(btn.action, false)}
            onMouseDown={() => inputManager.setVirtualAction(btn.action, true)}
            onMouseUp={() => inputManager.setVirtualAction(btn.action, false)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}
