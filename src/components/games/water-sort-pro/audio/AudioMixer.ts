import { useGameState } from '../state/useGameState';

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  
  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      
      this.updateVolumes();
    }
  }

  public updateVolumes() {
    if (!this.ctx || !this.masterGain || !this.sfxGain) return;
    const state = useGameState.getState();
    this.masterGain.gain.setValueAtTime(state.volumeMaster, this.ctx.currentTime);
    this.sfxGain.gain.setValueAtTime(state.volumeEffects, this.ctx.currentTime);
  }

  private playToneWithPan(freq: number, type: OscillatorType, duration: number, vol: number, pan: number = 0) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    
    // Add subtle frequency randomization for variation (Prompt 13 requirement)
    const randomizedFreq = freq * (1 + (Math.random() - 0.5) * 0.05);
    
    osc.type = type;
    osc.frequency.setValueAtTime(randomizedFreq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
    
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  
  public triggerHaptic(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  public playSelect(pan: number = 0) {
    this.playToneWithPan(700, 'sine', 0.15, 0.2, pan);
    this.triggerHaptic(10); // Light tap
  }
  
  public playInvalidMove() {
    this.playToneWithPan(150, 'sawtooth', 0.2, 0.1, 0);
    this.triggerHaptic([20, 50, 20]); // Error buzz
  }

  public playPour(sourcePan: number, destPan: number) {
    // Layer 1: Lift (source)
    this.playToneWithPan(300, 'triangle', 0.2, 0.05, sourcePan);
    
    // Layer 2: Stream
    setTimeout(() => {
      this.playToneWithPan(400, 'sine', 0.3, 0.08, (sourcePan + destPan) / 2);
    }, 100);
    
    // Layer 3: Impact (destination)
    setTimeout(() => {
      this.playToneWithPan(200, 'square', 0.15, 0.05, destPan);
      this.triggerHaptic(20);
    }, 250);
  }

  public playWin() {
    // Layered completion sequence
    setTimeout(() => this.playToneWithPan(400, 'sine', 0.2, 0.15, 0), 0);
    setTimeout(() => this.playToneWithPan(500, 'sine', 0.2, 0.15, -0.5), 150);
    setTimeout(() => this.playToneWithPan(600, 'sine', 0.2, 0.15, 0.5), 300);
    setTimeout(() => {
      this.playToneWithPan(800, 'sine', 0.6, 0.2, 0);
      this.triggerHaptic([30, 50, 30, 50, 100]); // Celebration
    }, 450);
  }
  
  public playPerfectSolve() {
    this.playWin();
    // Extra sparkle layer
    setTimeout(() => this.playToneWithPan(1200, 'triangle', 0.8, 0.1, 0), 450);
  }
}

export const audioMixer = new AudioMixer();
