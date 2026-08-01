import { AmbientMode } from '../types';

class SoundController {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private currentAmbientMode: AmbientMode = 'none';
  private ambientGainNode: GainNode | null = null;
  private ambientStopFns: (() => void)[] = [];
  private randomEventTimers: number[] = [];

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleSound(enable?: boolean): boolean {
    this.enabled = enable !== undefined ? enable : !this.enabled;
    if (!this.enabled) {
      this.stopAmbient();
    } else if (this.currentAmbientMode !== 'none') {
      this.startAmbient(this.currentAmbientMode);
    }
    return this.enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getAmbientMode(): AmbientMode {
    return this.currentAmbientMode;
  }

  public setAmbientMode(mode: AmbientMode) {
    this.currentAmbientMode = mode;
    if (!this.enabled || mode === 'none') {
      this.stopAmbient();
      return;
    }
    this.initContext();
    this.startAmbient(mode);
  }

  private stopAmbient() {
    // Clear all interval timers
    this.randomEventTimers.forEach(id => window.clearInterval(id));
    this.randomEventTimers = [];

    // Fade out ambient gain if present
    if (this.ambientGainNode && this.ctx) {
      const now = this.ctx.currentTime;
      this.ambientGainNode.gain.setValueAtTime(this.ambientGainNode.gain.value, now);
      this.ambientGainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    }

    // Stop all active ambient generator nodes after fadeout
    const stopFns = [...this.ambientStopFns];
    this.ambientStopFns = [];

    setTimeout(() => {
      stopFns.forEach(fn => {
        try { fn(); } catch { /* ignore */ }
      });
    }, 550);
  }

  private startAmbient(mode: AmbientMode) {
    this.stopAmbient();
    if (!this.ctx) return;

    const ctx = this.ctx;
    const masterAmbientGain = ctx.createGain();
    masterAmbientGain.gain.setValueAtTime(0.0001, ctx.currentTime);
    masterAmbientGain.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + 1.2);
    masterAmbientGain.connect(ctx.destination);
    this.ambientGainNode = masterAmbientGain;

    if (mode === 'quiet-study') {
      this.buildQuietStudyAmbient(ctx, masterAmbientGain);
    } else if (mode === 'tournament-hall') {
      this.buildTournamentHallAmbient(ctx, masterAmbientGain);
    }
  }

  // Synthesizes a calming, warm, acoustic library/study ambiance
  private buildQuietStudyAmbient(ctx: AudioContext, destination: GainNode) {
    // 1. Warm low room drone
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const droneGain = ctx.createGain();
    const droneFilter = ctx.createBiquadFilter();

    osc1.type = 'sine';
    osc1.frequency.value = 55; // Low A
    osc2.type = 'triangle';
    osc2.frequency.value = 110.5; // Soft sub octave

    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 140;

    droneGain.gain.value = 0.15;

    osc1.connect(droneFilter);
    osc2.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(destination);

    osc1.start();
    osc2.start();

    // 2. Soft air ventilation noise
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1);
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 220;
    noiseFilter.Q.value = 0.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.04;

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(destination);

    whiteNoise.start();

    // 3. Periodic subtle pendulum clock tick (every 1 second)
    const tickInterval = window.setInterval(() => {
      if (!this.enabled || this.currentAmbientMode !== 'quiet-study' || !this.ctx) return;
      const t = this.ctx.currentTime;
      const tickOsc = this.ctx.createOscillator();
      const tickGain = this.ctx.createGain();

      tickOsc.type = 'sine';
      tickOsc.frequency.setValueAtTime(1200, t);
      tickOsc.frequency.exponentialRampToValueAtTime(300, t + 0.015);

      tickGain.gain.setValueAtTime(0.015, t);
      tickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.02);

      tickOsc.connect(tickGain);
      tickGain.connect(destination);
      tickOsc.start(t);
      tickOsc.stop(t + 0.025);
    }, 1000);

    this.randomEventTimers.push(tickInterval);

    this.ambientStopFns.push(() => {
      osc1.stop();
      osc2.stop();
      whiteNoise.stop();
    });
  }

  // Synthesizes a grand chess tournament hall ambiance (reverberant room murmur, distant clicks)
  private buildTournamentHallAmbient(ctx: AudioContext, destination: GainNode) {
    // 1. Distant crowd room murmur (modulated bandpassed noise)
    const bufferSize = ctx.sampleRate * 3;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + (0.02 * white)) / 1.02; // Pink noise filter
      lastOut = data[i];
    }

    const crowdNoise = ctx.createBufferSource();
    crowdNoise.buffer = noiseBuffer;
    crowdNoise.loop = true;

    const crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = 'bandpass';
    crowdFilter.frequency.value = 350;
    crowdFilter.Q.value = 1.2;

    const crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.08;

    // LFO for slow room swell / breathing crowd effect
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15; // 0.15 Hz slow swell
    lfoGain.gain.value = 0.03;

    lfo.connect(lfoGain);
    lfoGain.connect(crowdGain.gain);

    crowdNoise.connect(crowdFilter);
    crowdFilter.connect(crowdGain);
    crowdGain.connect(destination);

    crowdNoise.start();
    lfo.start();

    // 2. Distant chess clock button clicks & muffled piece moves at random intervals
    const hallEventsInterval = window.setInterval(() => {
      if (!this.enabled || this.currentAmbientMode !== 'tournament-hall' || !this.ctx) return;
      if (Math.random() < 0.6) {
        const t = this.ctx.currentTime;
        // Distant clock button click
        const clickOsc = this.ctx.createOscillator();
        const clickGain = this.ctx.createGain();

        clickOsc.type = 'triangle';
        clickOsc.frequency.setValueAtTime(600 + Math.random() * 200, t);
        clickOsc.frequency.exponentialRampToValueAtTime(100, t + 0.03);

        const pan = (Math.random() - 0.5) * 0.8; // Random stereo placement
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
        if (panner) panner.pan.setValueAtTime(pan, t);

        clickGain.gain.setValueAtTime(0.025 + Math.random() * 0.02, t);
        clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

        if (panner) {
          clickOsc.connect(panner);
          panner.connect(clickGain);
        } else {
          clickOsc.connect(clickGain);
        }
        clickGain.connect(destination);

        clickOsc.start(t);
        clickOsc.stop(t + 0.045);
      }
    }, 3500);

    this.randomEventTimers.push(hallEventsInterval);

    this.ambientStopFns.push(() => {
      crowdNoise.stop();
      lfo.stop();
    });
  }

  // Realistic chess piece placement 'thud' sound (wood impact with low-pass noise)
  public playThud() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // Low wood impact pitch drop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(35, now + 0.07);

    gain.gain.setValueAtTime(0.75, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    // Warm felt/wood noise burst
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.22));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 450;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.35, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.08);
    noise.start(now);
  }

  public playMoveQuiet() {
    this.playThud();
  }

  public playMove() {
    this.playThud();
  }

  // Distinct sharp piece capture 'clack' - crisp dual collision sound
  public playClack() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // High frequency wood strike
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(180, now + 0.035);

    gain.gain.setValueAtTime(0.65, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    // Secondary marble resonance
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(420, now + 0.01);
    osc2.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    gain2.gain.setValueAtTime(0.7, now + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    // Sharp noise snap
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1800;
    noiseFilter.Q.value = 1.5;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
    osc2.start(now + 0.01);
    osc2.stop(now + 0.09);
    noise.start(now);
  }

  public playCapture() {
    this.playClack();
  }

  // Check alert crystalline chime
  public playChime() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const freqs = [659.25, 830.61, 987.77, 1318.51]; // E5, G#5, B5, E6 glass bell chord

    freqs.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.06);

      gain.gain.setValueAtTime(0, now + idx * 0.06);
      gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.06 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.45);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.06);
      osc.stop(now + idx * 0.06 + 0.5);
    });
  }

  public playCheck() {
    this.playChime();
  }

  // Checkmate / Victory Fanfare
  public playVictory() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.12);

      gain.gain.setValueAtTime(0.4, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + (i === 3 ? 0.8 : 0.25));

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + (i === 3 ? 0.85 : 0.3));
    });
  }

  public playGameOver() {
    this.playVictory();
  }

  // Button click UI
  public playClick() {
    if (!this.enabled) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.035);
  }
}

export const soundFx = new SoundController();
