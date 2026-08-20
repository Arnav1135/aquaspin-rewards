import { useGameState } from '../state/useGameState';

/* eslint-disable no-empty */
export class AudioMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pourBuffer: AudioBuffer | null = null;
  private activePours: { gain: GainNode, panner: StereoPannerNode, ctx: AudioContext, source: AudioBufferSourceNode }[] = [];
  
  public async init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      
      this.updateVolumes();
    }
    await this.preloadPourAudio();
  }

  public async preloadPourAudio() {
    if (this.pourBuffer || (this.ctx && this.pourBuffer)) return;
    try {
      const response = await fetch('/water-sort/audio/pour.mp3');
      const arrayBuffer = await response.arrayBuffer();
      // If ctx is not ready yet, we can decode it later, but AudioContext is usually needed to decode.
      // We will create a temporary offline context to decode if ctx is null.
      const ctx = this.ctx || new (window.AudioContext || (window as any).webkitAudioContext)();
      this.pourBuffer = await ctx.decodeAudioData(arrayBuffer);
    } catch (err) {
      console.error("Failed to preload pour audio", err);
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

  private getNoiseBuffer(): AudioBuffer {
    if (!this.ctx) throw new Error("AudioContext not initialized");
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = this.ctx.sampleRate * 2.0; // 2 seconds of noise
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2.0 - 1.0;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  public stopAllPours() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activePours.forEach(pour => {
      try {
        pour.gain.gain.cancelScheduledValues(now);
        pour.gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
        pour.source.stop(now + 0.1);
        setTimeout(() => {
          try {
            pour.gain.disconnect();
            pour.panner.disconnect();
          } catch (e) {}
        }, 150);
      } catch (e) {}
    });
    this.activePours = [];
  }

  public playPour(sourcePan: number, destPan: number, fullnessRatio: number = 1.0, amount: number = 1, vesselId: string = 'classic_tube') {
    if (!this.ctx || !this.sfxGain || !this.pourBuffer) return;
    
    // Stop previous pour if user tapped rapidly (Phase 11)
    this.stopAllPours();

    const now = this.ctx.currentTime;
    
    // Base timings derived from animation timeline constraints
    const pourDuration = Math.min(1.15, Math.max(0.70, 0.70 + (amount - 1) * 0.14)) + 0.20;
    
    const panner = this.ctx.createStereoPanner();
    const panPos = (sourcePan + destPan) / 2;
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panPos)), now);
    panner.connect(this.sfxGain);
    
    const waterBus = this.ctx.createGain();
    // Fade in
    waterBus.gain.setValueAtTime(0.001, now);
    waterBus.gain.exponentialRampToValueAtTime(1.0, now + 0.05);
    // Fade out exactly at stream end (Phase 6 Case A: fade short natural out)
    waterBus.gain.setValueAtTime(1.0, now + pourDuration - 0.1);
    waterBus.gain.linearRampToValueAtTime(0.001, now + pourDuration + 0.05);

    waterBus.connect(panner);
    
    // Play MP3
    const source = this.ctx.createBufferSource();
    source.buffer = this.pourBuffer;
    source.loop = false; // We just play a section of the long file
    
    // Pitch goes up as the vessel fills up (simulate resonance chamber shrinking)
    const basePitch = 0.9 + (fullnessRatio * 0.6); // 0.9 (empty) to 1.5 (full)
    const pitchVar = basePitch + (Math.random() - 0.5) * 0.04;
    source.playbackRate.value = pitchVar;

    source.connect(waterBus);
    
    this.activePours.push({ gain: waterBus, panner, ctx: this.ctx, source });

    // Start at a slight offset to avoid initial silence if any
    const startOffset = 0.05; 
    source.start(now, startOffset);
    source.stop(now + pourDuration + 0.1);
    
    setTimeout(() => {
      this.activePours = this.activePours.filter(p => p.gain !== waterBus);
      try {
        waterBus.disconnect();
        panner.disconnect();
      } catch(e) {}
    }, (pourDuration + 0.5) * 1000);
  }

  public playDrop(pan: number = 0, pitchModifier: number = 1.0) {
    if (!this.ctx || !this.sfxGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const panner = this.ctx.createStereoPanner();
    
    // Drop sound: sharp attack, fast frequency sweep UP
    const baseFreq = 400 + (300 * pitchModifier);
    osc.type = 'sine';
    
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.8, this.ctx.currentTime + 0.08);
    
    gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.3, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, pan)), this.ctx.currentTime);
    
    osc.connect(gain);
    gain.connect(panner);
    panner.connect(this.sfxGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
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
