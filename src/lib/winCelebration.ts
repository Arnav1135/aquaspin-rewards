// src/lib/winCelebration.ts
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audioEngine';

export type WinMagnitude = 'small' | 'medium' | 'large' | 'mega';
export interface WinCelebrationHandle { cancel: () => void; }

export function triggerWinCelebration(
  magnitude: WinMagnitude,
  origin: { x: number; y: number } = { x: 0.5, y: 0.6 },
): WinCelebrationHandle {
  const timers: ReturnType<typeof setTimeout>[] = [];
  let frameId: number | null = null;
  let cancelled = false;
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    timers.forEach(clearTimeout);
    timers.length = 0;
    if (frameId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }
  };
  const handle = { cancel };
  if (typeof window === 'undefined') return handle;

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const duration = reducedMotion ? 0 : magnitude === 'mega' ? 3000 : magnitude === 'large' ? 1500 : magnitude === 'medium' ? 800 : 400;
  const particleCount = reducedMotion ? 0 : magnitude === 'mega' ? 150 : magnitude === 'large' ? 80 : magnitude === 'medium' ? 40 : 15;
  const spread = magnitude === 'mega' ? 100 : magnitude === 'large' ? 80 : magnitude === 'medium' ? 60 : 40;
  const velocity = magnitude === 'mega' ? 45 : magnitude === 'large' ? 35 : magnitude === 'medium' ? 25 : 15;

  switch (magnitude) {
    case 'mega':
      audio.playChime(400, 1.0, 0.6);
      if (!reducedMotion) {
        timers.push(setTimeout(() => { if (!cancelled) audio.playChime(600, 1.0, 0.6); }, 150));
        timers.push(setTimeout(() => { if (!cancelled) audio.playChime(800, 1.5, 0.7); }, 300));
      }
      break;
    case 'large':
      audio.playChime(600, 0.8, 0.5);
      if (!reducedMotion) timers.push(setTimeout(() => { if (!cancelled) audio.playChime(900, 1.0, 0.6); }, 150));
      break;
    case 'medium': audio.playChime(800, 0.6, 0.4); break;
    case 'small': audio.playChime(1000, 0.4, 0.3); break;
  }

  const shakeIntensity = magnitude === 'mega' ? 'heavy' : magnitude === 'large' ? 'medium' : magnitude === 'medium' ? 'light' : 'none';
  if (!reducedMotion && shakeIntensity !== 'none') {
    window.dispatchEvent(new CustomEvent('screen-shake', { detail: { intensity: shakeIntensity } }));
  }
  if (particleCount === 0) return handle;

  if (magnitude === 'mega') {
    const end = performance.now() + duration;
    const colors = ['#facc15', '#60a5fa', '#f472b6', '#34d399'];
    const frame = (now: number) => {
      if (cancelled) return;
      confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, colors });
      if (now < end) frameId = window.requestAnimationFrame(frame);
      else frameId = null;
    };
    frameId = window.requestAnimationFrame(frame);
  } else {
    confetti({ particleCount, spread, origin, startVelocity: velocity, colors: ['#facc15', '#ffffff', '#fb923c'] });
  }
  return handle;
}
