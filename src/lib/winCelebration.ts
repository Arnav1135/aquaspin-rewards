// src/lib/winCelebration.ts
import confetti from 'canvas-confetti';
import { audio } from '@/lib/audioEngine';

export type WinMagnitude = 'small' | 'medium' | 'large' | 'mega';

export function triggerWinCelebration(magnitude: WinMagnitude, origin: { x: number, y: number } = { x: 0.5, y: 0.6 }) {
  const duration = magnitude === 'mega' ? 3000 : magnitude === 'large' ? 1500 : magnitude === 'medium' ? 800 : 400;
  const particleCount = magnitude === 'mega' ? 150 : magnitude === 'large' ? 80 : magnitude === 'medium' ? 40 : 15;
  const spread = magnitude === 'mega' ? 100 : magnitude === 'large' ? 80 : magnitude === 'medium' ? 60 : 40;
  const velocity = magnitude === 'mega' ? 45 : magnitude === 'large' ? 35 : magnitude === 'medium' ? 25 : 15;
  
  // Play coordinated sound
  switch (magnitude) {
    case 'mega':
      audio.playChime(400, 1.0, 0.6);
      setTimeout(() => audio.playChime(600, 1.0, 0.6), 150);
      setTimeout(() => audio.playChime(800, 1.5, 0.7), 300);
      break;
    case 'large':
      audio.playChime(600, 0.8, 0.5);
      setTimeout(() => audio.playChime(900, 1.0, 0.6), 150);
      break;
    case 'medium':
      audio.playChime(800, 0.6, 0.4);
      break;
    case 'small':
      audio.playChime(1000, 0.4, 0.3);
      break;
  }

  // Trigger screen shake via a global custom event
  const shakeIntensity = magnitude === 'mega' ? 'heavy' : magnitude === 'large' ? 'medium' : magnitude === 'medium' ? 'light' : 'none';
  if (shakeIntensity !== 'none') {
    window.dispatchEvent(new CustomEvent('screen-shake', { detail: { intensity: shakeIntensity } }));
  }

  if (magnitude === 'mega') {
    const end = Date.now() + duration;
    const colors = ['#facc15', '#60a5fa', '#f472b6', '#34d399'];

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  } else {
    confetti({
      particleCount,
      spread,
      origin,
      startVelocity: velocity,
      colors: ['#facc15', '#ffffff', '#fb923c']
    });
  }
}
