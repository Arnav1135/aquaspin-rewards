import { useEffect } from 'react';
import { carromVfxEvents } from './CarromVFXSystem';
import { playTone } from '@/lib/utils';

export function CarromAudioSystem() {
  useEffect(() => {
    const handleEvent = ((e: CustomEvent) => {
      const { type, intensity } = e.detail;

      if (type === 'impact') {
        const volume = Math.min(intensity * 0.05, 1.0);
        if (volume > 0.01) {
          // Play a sharp knock sound synthetically using playTone for now
          playTone(300 + Math.random() * 50, 0.05, 'square', volume);
          // And a slightly lower thump
          setTimeout(() => playTone(150, 0.08, 'sine', volume * 0.8), 10);
        }
      } else if (type === 'pocket') {
        playTone(800, 0.1, 'sine', 0.5);
        setTimeout(() => playTone(1200, 0.2, 'sine', 0.5), 100);
      }
    }) as EventListener;

    carromVfxEvents.addEventListener('vfx', handleEvent);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent);
  }, []);

  return null;
}
