import { useEffect, useRef } from 'react';
import { carromVfxEvents } from './CarromVFXSystem';
import { playTone } from '@/lib/utils';
import { useCarromQuality } from './CarromPerformanceManager';

export function CarromAudioSystem() {
  const quality = useCarromQuality();
  const audioCtxRef = useRef<AudioContext | null>(null);
  const roomToneNodeRef = useRef<OscillatorNode | null>(null);
  const roomToneGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    // Room tone setup
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      if (Ctx) audioCtxRef.current = new Ctx();
    }

    if (audioCtxRef.current && quality !== 'LOW') {
      const ctx = audioCtxRef.current;
      if (!roomToneNodeRef.current) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 50; // Low hum
        gain.gain.value = 0.02; // Very quiet
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        roomToneNodeRef.current = osc;
        roomToneGainRef.current = gain;
      } else if (roomToneGainRef.current) {
        roomToneGainRef.current.gain.value = 0.02;
      }
    } else if (roomToneGainRef.current) {
      roomToneGainRef.current.gain.value = 0;
    }

    return () => {
      if (roomToneNodeRef.current) {
        try { roomToneNodeRef.current.stop(); } catch(e){}
        roomToneNodeRef.current.disconnect();
        roomToneNodeRef.current = null;
      }
    };
  }, [quality]);

  useEffect(() => {
    const handleEvent = ((e: CustomEvent) => {
      const { type, intensity, mass = 1, velocity = [0,0,0] } = e.detail;

      const velMag = Math.sqrt(velocity[0]*velocity[0] + velocity[1]*velocity[1] + velocity[2]*velocity[2]);
      
      const volume = Math.min(intensity * 0.1, 1.0);
      const pitchMod = (velMag * 5); // + up to ~50Hz
      const decay = Math.min(Math.max(mass * 0.1, 0.05), 0.15); // heavier = longer decay

      if (type === 'impact' || type === 'coin_hit') {
        if (volume > 0.01) {
          playTone(450 + pitchMod, decay, 'square', volume);
        }
      } else if (type === 'rail_hit') {
        if (volume > 0.01) {
          playTone(250 + pitchMod, decay * 1.5, 'square', volume * 0.8);
          setTimeout(() => playTone(120, decay, 'sine', volume * 0.6), 10);
        }
      } else if (type === 'shot') {
        playTone(600 + pitchMod, 0.1, 'square', Math.min(volume + 0.2, 1.0));
      } else if (type === 'striker_move') {
        playTone(300, 0.05, 'sine', 0.05);
      } else if (type === 'multi_collision') {
        playTone(500, 0.05, 'square', volume * 0.5);
        setTimeout(() => playTone(450, 0.05, 'square', volume * 0.4), 30);
        setTimeout(() => playTone(400, 0.05, 'square', volume * 0.3), 60);
      } else if (type === 'pocket') {
        playTone(800, 0.1, 'sine', 0.5);
        setTimeout(() => playTone(1200, 0.2, 'sine', 0.5), 100);
      } else if (type === 'queen_capture') {
        // Chord
        playTone(523.25, 0.5, 'sine', 0.5); // C5
        playTone(659.25, 0.5, 'sine', 0.5); // E5
        playTone(783.99, 0.5, 'sine', 0.5); // G5
      } else if (type === 'foul') {
        playTone(300, 0.3, 'sawtooth', 0.4);
        playTone(315, 0.3, 'sawtooth', 0.4); // Dissonant
      } else if (type === 'victory') {
        // Ascending sequence
        playTone(440, 0.2, 'square', 0.5);
        setTimeout(() => playTone(554.37, 0.2, 'square', 0.5), 200);
        setTimeout(() => playTone(659.25, 0.4, 'square', 0.5), 400);
      }
    }) as EventListener;

    carromVfxEvents.addEventListener('vfx', handleEvent);
    return () => carromVfxEvents.removeEventListener('vfx', handleEvent);
  }, []);

  return null;
}

// Phase 3: Audio Physicality, Audio Layering, Environment Audio
