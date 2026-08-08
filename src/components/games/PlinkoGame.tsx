import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';

/**
 * Premium Plinko shell.
 * Reward authority remains server-side; this component only owns presentation state.
 */
export default function PlinkoGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, reducedMotion ? 1 : 2);
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const w = rect.width;
    const h = rect.height;
    const pulse = reducedMotion ? 0 : (Math.sin(time * 0.0015) + 1) * 0.5;
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#0b1220');
    gradient.addColorStop(1, '#020617');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);

    const rows = 11;
    const spacing = Math.min(42, w / 10);
    const startY = 56;
    for (let row = 0; row < rows; row += 1) {
      const count = row + 1;
      const offset = (w - (count - 1) * spacing) / 2;
      const y = startY + row * Math.min(34, h / 14);
      for (let i = 0; i < count; i += 1) {
        const x = offset + i * spacing;
        const glow = 0.18 + pulse * 0.12;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(125, 211, 252, ${glow})`;
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(56,189,248,0.7)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    const bins = 8;
    const binWidth = w / bins;
    ctx.strokeStyle = 'rgba(148,163,184,0.35)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= bins; i += 1) {
      const x = i * binWidth;
      ctx.beginPath();
      ctx.moveTo(x, h - 52);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
  }, [reducedMotion]);

  useEffect(() => {
    const loop = (time: number) => {
      render(time);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [render]);

  return (
    <Card className="relative overflow-hidden bg-slate-950 text-white">
      <canvas ref={canvasRef} className="block h-[520px] w-full" aria-label="Plinko board" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950 to-transparent" />
    </Card>
  );
}
