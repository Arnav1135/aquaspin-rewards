import { useGameState } from '../state/useGameState';

export class AudioMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private activePours: { gain: GainNode, panner: StereoPannerNode, ctx: AudioContext }[] = [];
  
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
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    
    // Base timings derived from animation timeline constraints
    const pourDuration = Math.min(1.15, Math.max(0.70, 0.70 + (amount - 1) * 0.14)) + 0.20;
    const intensity = Math.min(1.0, 0.6 + amount * 0.15);
    const pitchVar = 1.0 + (Math.random() - 0.5) * 0.05;
    
    const panner = this.ctx.createStereoPanner();
    const panPos = (sourcePan + destPan) / 2;
    panner.pan.setValueAtTime(Math.max(-1, Math.min(1, panPos)), now);
    panner.connect(this.sfxGain);
    
    const waterBus = this.ctx.createGain();
    waterBus.gain.value = 1.0;
    waterBus.connect(panner);
    
    this.activePours.push({ gain: waterBus, panner, ctx: this.ctx });
    
    // Vessel-specific acoustic profiles
    let resonanceFreq = 800;
    let resonanceQ = 2.0;
    if (vesselId.includes('bottle')) { resonanceFreq = 600; resonanceQ = 3.0; }
    else if (vesselId.includes('vase')) { resonanceFreq = 400; resonanceQ = 2.0; }
    else if (vesselId.includes('crystal')) { resonanceFreq = 1200; resonanceQ = 5.0; }
    else if (vesselId === 'heart_container') { resonanceFreq = 500; resonanceQ = 1.5; }

    const noiseBuffer = this.getNoiseBuffer();
    
    // ----------------------------------------------------
    // LAYER 1: LOW BODY (Continuous Stream)
    // ----------------------------------------------------
    const lowSource = this.ctx.createBufferSource();
    lowSource.buffer = noiseBuffer;
    lowSource.loop = true;
    
    const lowFilter = this.ctx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 350 * pitchVar;
    
    const lowGain = this.ctx.createGain();
    lowGain.gain.setValueAtTime(0.001, now);
    lowGain.gain.exponentialRampToValueAtTime(0.35 * intensity, now + 0.15);
    lowGain.gain.setValueAtTime(0.35 * intensity, now + pourDuration - 0.2);
    lowGain.gain.exponentialRampToValueAtTime(0.001, now + pourDuration);
    
    lowSource.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(waterBus);
    
    // ----------------------------------------------------
    // LAYER 2: MID TURBULENCE (Bubbling stream flow)
    // ----------------------------------------------------
    const midSource = this.ctx.createBufferSource();
    midSource.buffer = noiseBuffer;
    midSource.loop = true;
    
    const midFilter = this.ctx.createBiquadFilter();
    midFilter.type = 'bandpass';
    const baseMidFreq = 500 * pitchVar + (700 * fullnessRatio);
    midFilter.frequency.setValueAtTime(baseMidFreq, now);
    midFilter.frequency.linearRampToValueAtTime(baseMidFreq + 300, now + pourDuration);
    midFilter.Q.value = 1.2;
    
    const turbulenceLfo = this.ctx.createOscillator();
    turbulenceLfo.type = 'sine';
    turbulenceLfo.frequency.value = 12 + Math.random() * 4; // 12-16 Hz bubbling
    const turbulenceGainMod = this.ctx.createGain();
    turbulenceGainMod.gain.value = 0.5;
    turbulenceLfo.connect(turbulenceGainMod.gain);
    
    const midGain = this.ctx.createGain();
    midGain.gain.setValueAtTime(0.001, now);
    midGain.gain.exponentialRampToValueAtTime(0.25 * intensity, now + 0.2);
    midGain.gain.setValueAtTime(0.25 * intensity, now + pourDuration - 0.25);
    midGain.gain.exponentialRampToValueAtTime(0.001, now + pourDuration);
    
    midSource.connect(midFilter);
    midFilter.connect(turbulenceGainMod);
    turbulenceGainMod.connect(midGain);
    midGain.connect(waterBus);
    
    // ----------------------------------------------------
    // LAYER 3: POUR START (Wet Release)
    // ----------------------------------------------------
    const startOsc = this.ctx.createOscillator();
    startOsc.type = 'sine';
    startOsc.frequency.setValueAtTime(800 * pitchVar, now);
    startOsc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    
    const startGain = this.ctx.createGain();
    startGain.gain.setValueAtTime(0.001, now);
    startGain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
    startGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    
    startOsc.connect(startGain);
    startGain.connect(waterBus);
    
    // ----------------------------------------------------
    // LAYER 4: DESTINATION IMPACT (Water hitting water)
    // ----------------------------------------------------
    const impactTime = now + 0.18; // Approx when visually hitting the surface
    
    const impactSource = this.ctx.createBufferSource();
    impactSource.buffer = noiseBuffer;
    
    const impactFilter = this.ctx.createBiquadFilter();
    impactFilter.type = 'bandpass';
    impactFilter.frequency.setValueAtTime(350 * pitchVar, impactTime);
    impactFilter.frequency.exponentialRampToValueAtTime(900 * pitchVar, impactTime + 0.2);
    impactFilter.Q.value = 2.2;
    
    const impactGain = this.ctx.createGain();
    impactGain.gain.setValueAtTime(0.001, now);
    impactGain.gain.setValueAtTime(0.001, impactTime);
    impactGain.gain.linearRampToValueAtTime(0.25 * intensity, impactTime + 0.03);
    impactGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.25);
    
    impactSource.connect(impactFilter);
    impactFilter.connect(impactGain);
    impactGain.connect(waterBus);
    
    // ----------------------------------------------------
    // LAYER 5: GLASS RESONANCE
    // ----------------------------------------------------
    const resFilter = this.ctx.createBiquadFilter();
    resFilter.type = 'bandpass';
    resFilter.frequency.value = resonanceFreq;
    resFilter.Q.value = resonanceQ;
    
    const resGain = this.ctx.createGain();
    resGain.gain.value = 0.06; // Extremely subtle reflection body
    
    turbulenceGainMod.connect(resFilter);
    resFilter.connect(resGain);
    resGain.connect(waterBus);
    
    // ----------------------------------------------------
    // LAYER 6: FINAL DROPLETS (Settle)
    // ----------------------------------------------------
    const settleTime = now + pourDuration - 0.05;
    const settleOsc = this.ctx.createOscillator();
    settleOsc.type = 'sine';
    settleOsc.frequency.setValueAtTime(500 * pitchVar, settleTime);
    settleOsc.frequency.exponentialRampToValueAtTime(900 * pitchVar, settleTime + 0.1);
    
    const settleGain = this.ctx.createGain();
    settleGain.gain.setValueAtTime(0.001, now);
    settleGain.gain.setValueAtTime(0.001, settleTime);
    settleGain.gain.linearRampToValueAtTime(0.04, settleTime + 0.02);
    settleGain.gain.exponentialRampToValueAtTime(0.001, settleTime + 0.15);
    
    settleOsc.connect(settleGain);
    settleGain.connect(waterBus);
    
    // ----------------------------------------------------
    // START / SCHEDULE CLEANUP
    // ----------------------------------------------------
    const noiseStartOffset = Math.random();
    lowSource.start(now, noiseStartOffset);
    midSource.start(now, noiseStartOffset + 0.5); // Different phase
    turbulenceLfo.start(now);
    startOsc.start(now);
    impactSource.start(impactTime, Math.random());
    settleOsc.start(settleTime);
    
    const stopTime = now + pourDuration + 0.3;
    lowSource.stop(stopTime);
    midSource.stop(stopTime);
    turbulenceLfo.stop(stopTime);
    startOsc.stop(now + 0.15);
    impactSource.stop(impactTime + 0.3);
    settleOsc.stop(settleTime + 0.2);
    
    setTimeout(() => {
      // Periodic cleanup of activePours array
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
