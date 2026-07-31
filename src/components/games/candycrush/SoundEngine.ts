import { Orchestrator, AnimationEvent, GameEvent } from './Orchestrator';

export class SoundEngineImpl {
  private ctx: AudioContext | null = null;
  private enabled: boolean = false;

  constructor() {
    // AudioContext must be initialized after a user gesture.
    // We will initialize it on the first click.
    const initAudio = () => {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.enabled = true;
      }
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      window.removeEventListener('click', initAudio);
      window.removeEventListener('touchstart', initAudio);
    };
    
    window.addEventListener('click', initAudio);
    window.addEventListener('touchstart', initAudio);

    Orchestrator.subscribe("animation_event", this.handleAnimationEvent.bind(this));
    Orchestrator.subscribe("game_event", this.handleGameEvent.bind(this));
  }

  private handleGameEvent(event: GameEvent) {
    if (!this.enabled || !this.ctx) return;
    
    // Play sounds directly on certain game events that might not have animations yet
    if (event.type === 'score_changed' && event.payload.change > 100) {
      // Big explosion sound for special combos
      this.playExplosion();
    }
  }

  private handleAnimationEvent(event: AnimationEvent) {
    if (!this.enabled || !this.ctx) return;

    if (event.animationKey === "match_pop") {
      this.playPop();
    } else if (event.animationKey === "swap") {
      this.playSwoosh();
    } else if (event.animationKey === "swap_revert") {
      this.playBoing();
    } else if (event.animationKey === "cascade_fall") {
      this.playDrop();
    }
  }

  private playPop() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    // Randomize pitch slightly for pops
    const baseFreq = 600 + Math.random() * 200;
    osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  private playSwoosh() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  private playBoing() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.25);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.25);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.25);
  }

  private playDrop() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.05);
    
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  private playExplosion() {
    if (!this.ctx) return;
    
    // Create noise buffer
    const bufferSize = this.ctx.sampleRate * 0.5; // 0.5 seconds
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Filter noise for low frequency rumble
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, this.ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.5);
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, this.ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
}
}

export const SoundEngine = new SoundEngineImpl();
