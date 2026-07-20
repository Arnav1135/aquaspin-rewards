// src/engine/audio/AudioSystem.ts

export type AudioBusType = 'music' | 'sfx' | 'ui';

export interface SoundOptions {
  bus?: AudioBusType;
  volume?: number;
  loop?: boolean;
  spatialPos?: [number, number, number];
}

export class AudioSystem {
  private static instance: AudioSystem;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private buses: Record<AudioBusType, GainNode> = {} as any;
  private busVolumes: Record<AudioBusType, number> = { music: 0.8, sfx: 1.0, ui: 1.0 };
  private bufferCache: Map<string, AudioBuffer> = new Map();

  private constructor() {
    this.initAudioContext();
  }

  public static getInstance(): AudioSystem {
    if (!AudioSystem.instance) {
      AudioSystem.instance = new AudioSystem();
    }
    return AudioSystem.instance;
  }

  private initAudioContext() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        (['music', 'sfx', 'ui'] as AudioBusType[]).forEach((bus) => {
          if (this.ctx && this.masterGain) {
            const gain = this.ctx.createGain();
            gain.gain.value = this.busVolumes[bus];
            gain.connect(this.masterGain);
            this.buses[bus] = gain;
          }
        });
      }
    } catch {
      // Audio context initialization fallback
    }
  }

  public setBusVolume(bus: AudioBusType, volume: number) {
    this.busVolumes[bus] = Math.max(0, Math.min(1, volume));
    if (this.buses[bus]) {
      this.buses[bus].gain.value = this.busVolumes[bus];
    }
  }

  public getBusVolume(bus: AudioBusType): number {
    return this.busVolumes[bus];
  }

  public async playSound(soundUrl: string, opts: SoundOptions = {}) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const bus = opts.bus || 'sfx';
    const volume = opts.volume ?? 1.0;

    let buffer = this.bufferCache.get(soundUrl);
    if (!buffer) {
      try {
        const resp = await fetch(soundUrl);
        const arrayBuf = await resp.arrayBuffer();
        buffer = await this.ctx.decodeAudioData(arrayBuf);
        this.bufferCache.set(soundUrl, buffer);
      } catch {
        // Fallback tone if sound file loading fails
        this.playSyntheticTone(bus, volume);
        return;
      }
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = opts.loop || false;

    const soundGain = this.ctx.createGain();
    soundGain.gain.value = volume;

    if (opts.spatialPos && this.ctx.createPanner) {
      const panner = this.ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.setPosition(...opts.spatialPos);
      source.connect(soundGain);
      soundGain.connect(panner);
      panner.connect(this.buses[bus] || this.masterGain!);
    } else {
      source.connect(soundGain);
      soundGain.connect(this.buses[bus] || this.masterGain!);
    }

    source.start(0);
  }

  private playSyntheticTone(bus: AudioBusType, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume * 0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.buses[bus] || this.masterGain!);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }
}

export const audioSystem = AudioSystem.getInstance();
