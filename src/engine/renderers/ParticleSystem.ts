// src/engine/renderers/ParticleSystem.ts
export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Array<{x: number, y: number, vx: number, vy: number, size: number, alpha: number}> = [];
  private width: number;
  private height: number;
  private animationId: number = 0;
  private destroyed: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true })!;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.resize();
    window.addEventListener('resize', this.resize);
    
    // Adaptive budget: max 200, less on smaller screens
    const particleCount = Math.min(200, Math.floor((this.width * this.height) / 10000));
    this.initParticles(particleCount);
    this.loop();
  }

  private resize = () => {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  };

  private initParticles(count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2.0 + 0.5,
        alpha: Math.random() * 0.3 + 0.05
      });
    }
  }

  private loop = () => {
    if (this.destroyed) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Draw Aurora gradient base
    const grad = this.ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, 'rgba(147, 197, 253, 0.03)'); // Soft blue
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.fillStyle = '#ffffff';
    
    this.particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = this.width;
      if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      if (p.y > this.height) p.y = 0;

      this.ctx.globalAlpha = p.alpha;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    });

    this.ctx.globalAlpha = 1.0;
    this.animationId = requestAnimationFrame(this.loop);
  };

  public destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.animationId);
    window.removeEventListener('resize', this.resize);
    this.particles = [];
  }
}
