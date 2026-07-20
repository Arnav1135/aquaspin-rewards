class PoolAudioManager {
  private ctx: AudioContext | null = null;
  private isEnabled = true;

  public init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }

  public enable() {
    this.isEnabled = true;
  }

  public disable() {
    this.isEnabled = false;
  }

  private playTone(freq: number, type: OscillatorType, duration: number, vol: number, decay: number = 0.01) {
    if (!this.ctx || !this.isEnabled) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    
    // Envelope
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay);
    
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  private playNoise(duration: number, vol: number, decay: number) {
    if (!this.ctx || !this.isEnabled) return;
    const bufferSize = this.ctx.sampleRate * duration; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    // Apply bandpass for felt sound
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay);
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    
    noise.start();
  }

  public playBallHit(velocity: number) {
    // scale volume based on relative impact velocity
    const vol = Math.min(1.0, Math.max(0.05, velocity * 0.1));
    if (vol < 0.05) return;
    
    // Sharp click (two quick high-pitched sine oscillators)
    this.playTone(800 + Math.random() * 100, 'sine', 0.02, vol * 0.8, 0.01);
    this.playTone(1200 + Math.random() * 200, 'triangle', 0.03, vol * 0.4, 0.02);
  }

  public playCushionHit(velocity: number) {
    const vol = Math.min(1.0, Math.max(0.05, velocity * 0.15));
    if (vol < 0.05) return;
    // Dull thud
    this.playTone(150 + Math.random() * 50, 'sine', 0.1, vol * 1.5, 0.08);
  }

  public playCueStrike(power: number) {
    const vol = Math.min(1.0, 0.2 + power * 0.8);
    // Deep pop
    this.playTone(400, 'triangle', 0.05, vol, 0.03);
    this.playNoise(0.05, vol * 0.5, 0.04);
  }

  public playPocketDrop() {
    this.playTone(100, 'sine', 0.2, 1.0, 0.15);
    this.playNoise(0.2, 0.5, 0.15);
  }
}

export const audioManager = new PoolAudioManager();
