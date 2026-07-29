// Web Audio Engine for Aqua Blue Games
// Provides synthesis-based and buffer-based audio routing, buses, and distinct palettes.

type AudioBus = 'master' | 'sfx' | 'music' | 'ambient';

export class AudioEngine {
  private static instance: AudioEngine;
  
  public context: AudioContext | null = null;
  private buses: Record<AudioBus, GainNode | null> = {
    master: null,
    sfx: null,
    music: null,
    ambient: null
  };
  
  private isMuted: boolean = false;
  private volume: number = 0.5;

  private constructor() {}

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public init() {
    if (this.context) return;
    
    try {
      this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Setup buses
      this.buses.master = this.context.createGain();
      this.buses.sfx = this.context.createGain();
      this.buses.music = this.context.createGain();
      this.buses.ambient = this.context.createGain();
      
      // Routing: sfx/music/ambient -> master -> destination
      this.buses.sfx.connect(this.buses.master);
      this.buses.music.connect(this.buses.master);
      this.buses.ambient.connect(this.buses.master);
      this.buses.master.connect(this.context.destination);
      
      // Default volumes
      this.updateVolume();
      
      // Gentle limiter on master
      const compressor = this.context.createDynamicsCompressor();
      compressor.threshold.value = -12;
      compressor.knee.value = 10;
      compressor.ratio.value = 12;
      compressor.attack.value = 0;
      compressor.release.value = 0.25;
      
      this.buses.master.disconnect();
      this.buses.master.connect(compressor);
      compressor.connect(this.context.destination);
      
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateVolume();
  }
  
  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.updateVolume();
  }

  private updateVolume() {
    if (this.buses.master && this.context) {
      const target = this.isMuted ? 0 : this.volume;
      this.buses.master.gain.setTargetAtTime(target, this.context.currentTime, 0.05);
    }
  }
  
  public resume() {
    if (this.context && this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  // --- Synthesis Engine ---
  
  // Creates a quick transient percussive click (UI, short impacts)
  public playClick(freq = 800, decay = 0.05, type: OscillatorType = 'sine') {
    if (!this.context || !this.buses.sfx) return;
    const t = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.1, t + decay);
    
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + decay);
    
    osc.connect(gain);
    gain.connect(this.buses.sfx);
    
    osc.start(t);
    osc.stop(t + decay);
  }
  
  // Creates a tonal chime/bell (Wins, notifications)
  public playChime(freq = 1200, decay = 0.5, volume = 0.3) {
    if (!this.context || !this.buses.sfx) return;
    const t = this.context.currentTime;
    
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + decay);
    
    osc.connect(gain);
    gain.connect(this.buses.sfx);
    
    osc.start(t);
    osc.stop(t + decay);
  }
  
  // Generic Noise burst for impacts (Crash, drops)
  public playNoiseBurst(duration = 0.2, filterFreq = 1000) {
    if (!this.context || !this.buses.sfx) return;
    const t = this.context.currentTime;
    
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.context.createBufferSource();
    noise.buffer = buffer;
    
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.buses.sfx);
    
    noise.start(t);
  }

  // --- Specific Game Sound Definitions ---
  // Using pure synthesis to avoid 404s on missing files, generating hyper-realistic layered tones.
  
  public play(gameId: string, eventName: string, params: any = {}) {
    this.resume();
    
    // Slight random round-robin pitch shifting for repetition
    const jitter = 1 + (Math.random() * 0.04 - 0.02); // +/- 2%
    
    switch(gameId) {
      case 'mines':
        if (eventName === 'tile-flip') this.playClick(600 * jitter, 0.05, 'square');
        if (eventName === 'safe-reveal') {
          const combo = params.combo || 1;
          this.playChime(600 + (combo * 50), 0.4, 0.4);
        }
        if (eventName === 'mine-hit') {
          this.playNoiseBurst(0.8, 3000);
          this.playClick(200, 0.5, 'sawtooth');
        }
        if (eventName === 'cash-out') {
          setTimeout(() => this.playChime(600, 0.3), 0);
          setTimeout(() => this.playChime(800, 0.3), 100);
          setTimeout(() => this.playChime(1000, 0.6), 200);
        }
        break;
        
      case 'plinko':
        if (eventName === 'peg-bounce') {
          // X-position based pitch (left lower, right higher)
          const baseFreq = 500 + (params.x || 0) * 10; 
          this.playClick(baseFreq * jitter, 0.1, 'triangle');
        }
        if (eventName === 'bucket-landing') {
          this.playClick(300, 0.15, 'square');
          if (params.multiplier && params.multiplier >= 10) {
             this.playChime(1200, 0.8, 0.5);
             this.playNoiseBurst(0.4, 2000);
          }
        }
        if (eventName === 'ball-drop-launch') {
          this.playClick(400, 0.05, 'sine');
        }
        break;
        
      case 'crash':
      case 'limbo':
        if (eventName === 'tick') this.playClick(1000, 0.02, 'sine');
        if (eventName === 'crash') {
          this.playNoiseBurst(0.6, 1500); // Shatter
          this.playClick(100, 0.4, 'sawtooth'); // Thud
        }
        if (eventName === 'cash-out') {
          this.playChime(880, 0.5, 0.6);
        }
        break;
        
      case 'roulette':
        if (eventName === 'wheel-spin-up') this.playClick(800 * jitter, 0.03, 'square');
        if (eventName === 'ball-settling-clicks') this.playClick(1200 * jitter, 0.02, 'triangle');
        if (eventName === 'result-chime') {
          if (params.win) this.playChime(1000, 0.8, 0.5);
          else this.playChime(400, 0.4, 0.2);
        }
        break;
        
      case 'dragontiger':
        if (eventName === 'card-deal') this.playClick(400 * jitter, 0.08, 'sawtooth'); // Slide snap
        if (eventName === 'card-flip-reveal') {
           this.playClick(300, 0.1, 'square');
           if (params.win) this.playChime(600, 1.2, 0.4); // Soft gong simulation
        }
        if (eventName === 'win-fanfare') {
           setTimeout(() => this.playChime(500, 0.5), 0);
           setTimeout(() => this.playChime(700, 1.0), 150);
        }
        break;
        
      case 'chicken':
      case 'chickenjump':
        if (eventName === 'step-forward' || eventName === 'jump') {
           this.playClick((gameId === 'chicken' ? 500 : 700) * jitter, 0.15, 'sine'); // Springy boing
        }
        if (eventName === 'lose' || eventName === 'obstacle-hit') {
           this.playNoiseBurst(0.2, 800); // Splat/bonk
           this.playClick(200, 0.2, 'triangle');
        }
        if (eventName === 'cash-out-safe' || eventName === 'score-pickup') {
           this.playChime(900, 0.4, 0.4);
        }
        break;
        
      case 'coinflip':
        if (eventName === 'coin-toss-spin') this.playClick(1500, 0.05, 'triangle');
        if (eventName === 'coin-land') {
           this.playChime(1800, 0.2, 0.3); // Clink
           this.playClick(400, 0.1, 'square'); // Thud
        }
        if (eventName === 'win-result') this.playChime(1000, 0.5, 0.4);
        if (eventName === 'lose-result') this.playChime(600, 0.3, 0.2);
        break;
        
      case 'flappybird':
        if (eventName === 'jump') this.playClick(600 * jitter, 0.08, 'sine');
        if (eventName === 'score') this.playChime(900, 0.3, 0.3);
        if (eventName === 'crash') {
           this.playNoiseBurst(0.3, 1000);
           this.playClick(150, 0.2, 'sawtooth');
        }
        break;
        
      case 'knifethrower':
        if (eventName === 'throw') this.playClick(1200 * jitter, 0.03, 'triangle');
        if (eventName === 'hit') {
           this.playClick(400, 0.05, 'square');
           this.playNoiseBurst(0.1, 2000);
        }
        if (eventName === 'clash') {
           this.playClick(1800, 0.05, 'triangle');
           this.playNoiseBurst(0.2, 4000);
        }
        if (eventName === 'break') {
           this.playNoiseBurst(0.5, 1000);
           this.playChime(300, 0.4, 0.5);
        }
        break;
        
      case 'archery':
      case 'darts':
        if (eventName === 'shoot') this.playClick(800 * jitter, 0.1, 'triangle');
        if (eventName === 'hit') {
           this.playClick(300, 0.1, 'square');
           if (params.bullseye) this.playChime(1000, 0.6, 0.5);
        }
        break;
        
      case 'pool':
        if (eventName === 'hit') this.playClick(600 * jitter, 0.05, 'triangle');
        if (eventName === 'pocket') this.playChime(800, 0.4, 0.3);
        if (eventName === 'wall') this.playClick(400 * jitter, 0.08, 'sine');
        break;
        
      case 'clicker':
      case 'tapchallenge':
        if (eventName === 'click') this.playClick(600 * jitter, 0.03, 'sine');
        if (eventName === 'upgrade') this.playChime(1000, 0.5, 0.4);
        if (eventName === 'milestone') {
           setTimeout(() => this.playChime(600, 0.3), 0);
           setTimeout(() => this.playChime(800, 0.3), 100);
           setTimeout(() => this.playChime(1200, 0.6), 200);
        }
        break;

      case 'chess':
        if (eventName === 'move') this.playClick(200 * jitter, 0.1, 'triangle');
        if (eventName === 'capture') this.playClick(100, 0.15, 'sawtooth');
        if (eventName === 'check') this.playChime(600, 0.5, 0.4);
        if (eventName === 'checkmate') {
           setTimeout(() => this.playChime(400, 0.4), 0);
           setTimeout(() => this.playChime(300, 0.8), 200);
        }
        break;
        
      case 'ludo':
        if (eventName === 'dice-roll') {
           this.playClick(800, 0.05, 'square');
           setTimeout(() => this.playClick(1000, 0.05, 'square'), 50);
        }
        if (eventName === 'move') this.playClick(500 * jitter, 0.05, 'triangle');
        if (eventName === 'capture') this.playClick(200, 0.1, 'sawtooth');
        if (eventName === 'home') this.playChime(1200, 0.4, 0.3);
        break;
        
      case 'solitaire':
        if (eventName === 'card-deal' || eventName === 'card-move') this.playClick(1500 * jitter, 0.03, 'triangle');
        if (eventName === 'card-flip') this.playClick(1200 * jitter, 0.05, 'triangle');
        if (eventName === 'invalid') this.playClick(300, 0.1, 'sawtooth');
        if (eventName === 'win') {
           this.playChime(800, 0.4, 0.4);
           setTimeout(() => this.playChime(1000, 0.8, 0.4), 200);
        }
        break;
        
      case 'tictactoe':
      case 'dotsandboxes':
        if (eventName === 'place') this.playClick(600 * jitter, 0.05, 'sine');
        if (eventName === 'score-box') this.playChime(1000, 0.3, 0.3);
        if (eventName === 'win') this.playChime(1200, 0.6, 0.4);
        if (eventName === 'draw') this.playChime(400, 0.4, 0.2);
        break;

      default:
        // Generic fallback
        if (eventName.includes('win')) this.playChime();
        else if (eventName.includes('click') || eventName.includes('tap')) this.playClick();
        break;
    }
  }
}

export const audio = AudioEngine.getInstance();
