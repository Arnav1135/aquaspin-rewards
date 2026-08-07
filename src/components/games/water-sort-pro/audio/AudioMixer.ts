export class AudioMixer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(volume, this.ctx.currentTime);
    }
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  public playSelect() {
    this.playTone(600, 'sine', 0.1, 0.1);
  }

  public playPour() {
    this.playTone(300, 'triangle', 0.4, 0.05);
  }

  public playWin() {
    setTimeout(() => this.playTone(400, 'sine', 0.2, 0.1), 0);
    setTimeout(() => this.playTone(600, 'sine', 0.2, 0.1), 150);
    setTimeout(() => this.playTone(800, 'sine', 0.4, 0.1), 300);
  }
}

export const audioMixer = new AudioMixer();
