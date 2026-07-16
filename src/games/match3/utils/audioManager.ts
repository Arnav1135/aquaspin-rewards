// Audio Manager for Match-3 Game
// Handles sound effects and background music

export enum SoundEffect {
  SWAP = 'swap',
  MATCH = 'match',
  CASCADE = 'cascade',
  LEVEL_COMPLETE = 'levelComplete',
  LEVEL_FAILED = 'levelFailed',
  INVALID_MOVE = 'invalidMove',
  COMBO_1 = 'combo1',
  COMBO_2 = 'combo2',
  COMBO_3 = 'combo3',
  SPECIAL_ACTIVATED = 'specialActivated',
}

interface AudioConfig {
  enabled: boolean;
  volume: number;
  musicVolume: number;
}

class AudioManager {
  private config: AudioConfig = {
    enabled: true,
    volume: 0.7,
    musicVolume: 0.5,
  };

  private audioContext: AudioContext | null = null;
  private soundCache: Map<SoundEffect, AudioBuffer> = new Map();
  private currentMusicOscillators: OscillatorNode[] = [];

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && !this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  /**
   * Play a sound effect using Web Audio API
   */
  playSoundEffect(effect: SoundEffect, frequency: number = 440) {
    if (!this.config.enabled || !this.audioContext) return;

    const context = this.audioContext;
    const now = context.currentTime;

    switch (effect) {
      case SoundEffect.SWAP:
        this.playTone(400, 0.05, 'sine');
        break;

      case SoundEffect.MATCH:
        this.playTone(600, 0.1, 'sine');
        this.playTone(700, 0.1, 'sine', 0.05);
        break;

      case SoundEffect.CASCADE:
        // Ascending notes for cascade
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            this.playTone(400 + i * 100, 0.08, 'sine');
          }, i * 50);
        }
        break;

      case SoundEffect.LEVEL_COMPLETE:
        // Happy ascending notes
        this.playTone(523, 0.1, 'sine'); // C5
        setTimeout(() => this.playTone(659, 0.1, 'sine'), 100); // E5
        setTimeout(() => this.playTone(784, 0.15, 'sine'), 200); // G5
        break;

      case SoundEffect.LEVEL_FAILED:
        // Sad descending notes
        this.playTone(523, 0.1, 'sine'); // C5
        setTimeout(() => this.playTone(440, 0.1, 'sine'), 100); // A4
        setTimeout(() => this.playTone(349, 0.15, 'sine'), 200); // F4
        break;

      case SoundEffect.INVALID_MOVE:
        // Buzzer sound
        this.playTone(200, 0.08, 'square');
        setTimeout(() => this.playTone(150, 0.08, 'square'), 50);
        break;

      case SoundEffect.COMBO_1:
        this.playTone(600, 0.06, 'sine');
        break;

      case SoundEffect.COMBO_2:
        this.playTone(600, 0.06, 'sine');
        setTimeout(() => this.playTone(700, 0.06, 'sine'), 50);
        break;

      case SoundEffect.COMBO_3:
        this.playTone(600, 0.06, 'sine');
        setTimeout(() => this.playTone(700, 0.06, 'sine'), 50);
        setTimeout(() => this.playTone(800, 0.06, 'sine'), 100);
        break;

      case SoundEffect.SPECIAL_ACTIVATED:
        // Magical sound
        this.playTone(800, 0.1, 'sine');
        this.playTone(600, 0.1, 'sine', 0.05);
        break;
    }
  }

  /**
   * Play a tone using oscillator
   */
  private playTone(
    frequency: number,
    duration: number,
    waveType: OscillatorType = 'sine',
    delayTime: number = 0
  ) {
    if (!this.audioContext) return;

    const context = this.audioContext;
    const now = context.currentTime + delayTime;

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = waveType;

    // ADSR Envelope
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(this.config.volume * 0.3, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  /**
   * Play background music (simple procedural generation)
   */
  playBackgroundMusic() {
    if (!this.config.enabled || !this.audioContext) return;

    const context = this.audioContext;
    const notes = [261, 293, 329, 349, 392, 440, 494, 523]; // C Major scale

    const playSequence = (startTime: number) => {
      const sequence = [0, 2, 4, 5, 4, 2].map(i => notes[i]);

      sequence.forEach((freq, idx) => {
        const time = startTime + idx * 0.3;
        const osc = context.createOscillator();
        const gain = context.createGain();

        osc.connect(gain);
        gain.connect(context.destination);

        osc.frequency.value = freq;
        osc.type = 'triangle';

        gain.gain.setValueAtTime(this.config.musicVolume * 0.2, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);

        osc.start(time);
        osc.stop(time + 0.25);
      });

      // Loop the sequence
      setTimeout(() => playSequence(startTime + 1.8), 1800);
    };

    playSequence(context.currentTime);
  }

  /**
   * Stop all background music
   */
  stopBackgroundMusic() {
    this.currentMusicOscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Oscillator already stopped
      }
    });
    this.currentMusicOscillators = [];
  }

  /**
   * Set audio configuration
   */
  setConfig(config: Partial<AudioConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioConfig {
    return { ...this.config };
  }

  /**
   * Enable/disable audio
   */
  setEnabled(enabled: boolean) {
    this.config.enabled = enabled;
    if (!enabled) {
      this.stopBackgroundMusic();
    }
  }

  /**
   * Set volume (0-1)
   */
  setVolume(volume: number) {
    this.config.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Set music volume (0-1)
   */
  setMusicVolume(volume: number) {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
  }
}

// Singleton instance
export const audioManager = new AudioManager();

export default audioManager;
