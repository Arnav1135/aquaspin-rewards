import { useCallback, useRef } from 'react';

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!window._audioContext) {
    window._audioContext = new AudioContext();
  }
  return window._audioContext;
};

export const useAudio = () => {
  const playSound = useCallback((frequency: number, type: OscillatorType, duration: number, volumeLevel: number = 0.1) => {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gainNode.gain.setValueAtTime(volumeLevel, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }, []);

  const playClick = useCallback(() => {
    playSound(600, 'sine', 0.1, 0.05);
  }, [playSound]);

  const playWin = useCallback(() => {
    playSound(880, 'sine', 0.1, 0.1);
    setTimeout(() => playSound(1108.73, 'sine', 0.1, 0.1), 100);
    setTimeout(() => playSound(1318.51, 'sine', 0.3, 0.1), 200);
  }, [playSound]);

  const playLose = useCallback(() => {
    playSound(300, 'sawtooth', 0.3, 0.1);
    setTimeout(() => playSound(250, 'sawtooth', 0.4, 0.1), 200);
  }, [playSound]);

  const playCoin = useCallback(() => {
    playSound(1200, 'sine', 0.1, 0.05);
    setTimeout(() => playSound(1600, 'sine', 0.2, 0.05), 80);
  }, [playSound]);

  return {
    playClick,
    playWin,
    playLose,
    playCoin,
  };
};

declare global {
  interface Window {
    _audioContext: AudioContext;
  }
}
