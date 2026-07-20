// src/engine/debug/DebugOverlay.tsx
import { useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

export interface DebugMetrics {
  fps: number;
  frameTimeMs: number;
  drawCalls: number;
  triangles: number;
  textures: number;
}

export function DebugCanvasOverlay() {
  const { gl } = useThree();

  useEffect(() => {
    gl.info.autoReset = false;
  }, [gl]);

  useFrame(() => {
    gl.info.reset();
  });

  return null;
}

export function DebugOverlay() {
  const [visible, setVisible] = useState<boolean>(process.env.NODE_ENV !== 'production');
  const [metrics, setMetrics] = useState<DebugMetrics>({
    fps: 60,
    frameTimeMs: 16.6,
    drawCalls: 0,
    triangles: 0,
    textures: 0,
  });

  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;

    const interval = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTime;
      const currentFps = Math.round((frames * 1000) / delta);
      const frameTimeMs = Number((delta / Math.max(1, frames)).toFixed(1));

      setMetrics((prev) => ({
        ...prev,
        fps: currentFps,
        frameTimeMs,
      }));

      frames = 0;
      lastTime = now;
    }, 500);

    const frameTick = () => {
      frames++;
      requestAnimationFrame(frameTick);
    };
    const animId = requestAnimationFrame(frameTick);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F3' || e.key === '`') {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="absolute top-2 left-2 z-50 p-3 bg-navy-950/85 backdrop-blur-md rounded-lg border border-cyan-500/30 text-xs font-mono text-cyan-300 pointer-events-auto select-none min-w-[180px] shadow-lg">
      <div className="font-bold text-white mb-1 flex justify-between">
        <span>ENGINE DEBUG (F3)</span>
      </div>
      <div>FPS: {metrics.fps} ({metrics.frameTimeMs} ms)</div>
      <div>Draw Calls: {metrics.drawCalls}</div>
      <div>Triangles: {metrics.triangles}</div>
    </div>
  );
}
