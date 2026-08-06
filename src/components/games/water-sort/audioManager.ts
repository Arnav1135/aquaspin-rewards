// Basic Web Audio API synthesizer for the game

class AudioManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playClick() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(600, 'sine', 0.05, 0.1);
  }

  playPour(targetFillRatio: number) {
    if (!this.enabled || !this.ctx) return;
    // Pitch goes up as the tube gets fuller (like real water filling a glass)
    const baseFreq = 300;
    const freq = baseFreq + targetFillRatio * 400;
    this.playTone(freq, 'triangle', 0.2, 0.1);
  }

  playWin() {
    if (!this.enabled || !this.ctx) return;
    this.playTone(523.25, 'sine', 0.1, 0.2); // C5
    setTimeout(() => this.playTone(659.25, 'sine', 0.1, 0.2), 150); // E5
    setTimeout(() => this.playTone(783.99, 'sine', 0.3, 0.2), 300); // G5
  }

  private playTone(freq: number, type: OscillatorType, duration: number, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, this.ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
}

export const audio = new AudioManager();
