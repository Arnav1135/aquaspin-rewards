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

  public playToneWithPan(freq: number, type: OscillatorType, duration: number, vol: number, pan: number = 0) {
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
    if (!this.ctx || !this.sfxGain) return;
    
    // Hyper-realistic HD Water Pouring Synthesizer
    const duration = 0.8; // Match GSAP cinematic pour duration
    
    // 1. Create White Noise Buffer for the water stream
    const bufferSize = this.ctx.sampleRate * duration;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1; // White noise
    }
    
    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    // 2. Bandpass filter to shape the noise into a "water" sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    // Frequency shifts up as tube fills
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(1200, this.ctx.currentTime + duration);
    filter.Q.value = 1.5;

    // 3. Bubbling LFO (Amplitude Modulation) to create the glug-glug texture
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(15, this.ctx.currentTime); // 15 Hz bubbling rate
    
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.8; // depth of the bubbling
    lfo.connect(lfoGain.gain);
    
    // 4. Envelope / Gain staging
    const envGain = this.ctx.createGain();
    envGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    envGain.gain.exponentialRampToValueAtTime(0.15, this.ctx.currentTime + 0.1); // Attack
    envGain.gain.setValueAtTime(0.15, this.ctx.currentTime + duration - 0.2); // Sustain
    envGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration); // Release
    
    // 5. Spatial Panning
    const panner = this.ctx.createStereoPanner();
    const panPos = (sourcePan + destPan) / 2;
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panPos)), this.ctx.currentTime);
    
    // Connect the graph
    noiseSource.connect(filter);
    filter.connect(lfoGain); // Modulate volume with LFO
    lfoGain.connect(envGain);
    envGain.connect(panner);
    panner.connect(this.sfxGain);
    
    // Start nodes
    noiseSource.start(this.ctx.currentTime);
    lfo.start(this.ctx.currentTime);
    
    // Stop nodes
    noiseSource.stop(this.ctx.currentTime + duration);
    lfo.stop(this.ctx.currentTime + duration);
    
    // Layer 2: Subtle impact low-frequency tone at destination
    setTimeout(() => {
      this.playToneWithPan(120, 'triangle', 0.4, 0.05, destPan);
      this.triggerHaptic([15, 30, 15]);
    }, 200);
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
