// src/engine/renderers/ParticleSystem.ts
export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;
  private particles: Array<{x: number, y: number, vx: number, vy: number, size: number, alpha: number}> = [];
  private width = 0;
  private height = 0;
  private animationId: number | null = null;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: true });
    if (!this.ctx) return;
    this.resize();
    window.addEventListener('resize', this.resize, { passive: true });
    this.initParticles(200);
    this.loop();
  }

  private resize = () => {
    if (this.destroyed) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = Math.max(1, this.width);
    this.canvas.height = Math.max(1, this.height);
  };

  private initParticles(count: number) {
    this.particles.length = 0;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }
  }

  private loop = () => {
    if (this.destroyed || !this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const grad = ctx.createLinearGradient(0, 0, this.width, this.height);
    grad.addColorStop(0, 'rgba(147, 197, 253, 0.03)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = '#ffffff';

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = this.width;
      else if (p.x > this.width) p.x = 0;
      if (p.y < 0) p.y = this.height;
      else if (p.y > this.height) p.y = 0;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.animationId = requestAnimationFrame(this.loop);
  };

  public destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    if (this.animationId !== null) cancelAnimationFrame(this.animationId);
    this.animationId = null;
    window.removeEventListener('resize', this.resize);
    this.particles.length = 0;
    this.ctx?.clearRect(0, 0, this.width, this.height);
    this.ctx = null;
  }
}
