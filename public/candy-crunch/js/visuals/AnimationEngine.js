import { COLOR_PALETTE } from '../core/Constants.js';

// Safe resolution of PIXI filters (whether loaded via CDN or global PIXI)
const AdvancedBloomFilter = window.PIXI?.filters?.AdvancedBloomFilter || class { constructor() {} };
const ShockwaveFilter = window.PIXI?.filters?.ShockwaveFilter || class { constructor() {} };
const GodrayFilter = window.PIXI?.filters?.GodrayFilter || class { constructor() {} };
const BevelFilter = window.PIXI?.filters?.BevelFilter || class { constructor() {} };

export class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 0;
    this.color = '#fff';
    this.alpha = 0;
    this.decay = 0;
    this.gravity = 0;
    this.shape = 'circle'; // circle, star, rect
    this.rotation = 0;
    this.rotationSpeed = 0;
    this.w = 0;
    this.h = 0;
    this.active = false;
  }

  init(x, y, vx, vy, size, color, decay, gravity, shape, rotationSpeed, w = 0, h = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.alpha = 1;
    this.decay = decay;
    this.gravity = gravity;
    this.shape = shape;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = rotationSpeed;
    this.w = w;
    this.h = h;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.97;
    this.alpha -= this.decay;
    this.rotation += this.rotationSpeed;

    if (this.alpha <= 0.02) {
      this.active = false;
    }
  }
}

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pool = [];
    this.activeParticles = [];
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this._loop();
  }

  _resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  _getParticle() {
    let p = this.pool.find(item => !item.active);
    if (!p) {
      p = new Particle();
      this.pool.push(p);
    }
    return p;
  }

  burst(x, y, color, count = 18) {
    const palette = COLOR_PALETTE[color] || { primary: '#fff', glow: 'rgba(255,255,255,0.8)' };
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const speed = 3 + Math.random() * 5;
      
      const p = this._getParticle();
      p.init(
        x, y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 2,
        3 + Math.random() * 6,
        Math.random() < 0.5 ? palette.primary : palette.light || '#fff',
        0.025 + Math.random() * 0.025,
        0.2 + Math.random() * 0.15,
        Math.random() < 0.5 ? 'circle' : 'star',
        (Math.random() - 0.5) * 0.3
      );
      this.activeParticles.push(p);
    }
  }

  confetti(count = 90) {
    const colors = Object.values(COLOR_PALETTE).map(p => p.primary);
    for (let i = 0; i < count; i++) {
      const p = this._getParticle();
      p.init(
        Math.random() * this.canvas.width,
        -20,
        (Math.random() - 0.5) * 3,
        3 + Math.random() * 4,
        6 + Math.random() * 8,
        colors[Math.floor(Math.random() * colors.length)],
        0.008 + Math.random() * 0.008,
        0.12,
        Math.random() < 0.5 ? 'rect' : 'circle',
        (Math.random() - 0.5) * 0.25,
        8 + Math.random() * 8,
        4 + Math.random() * 4
      );
      this.activeParticles.push(p);
    }
  }

  _drawStar(ctx, x, y, r, rotation) {
    const pts = 5;
    ctx.beginPath();
    for (let i = 0; i < pts * 2; i++) {
      const radius = i % 2 === 0 ? r : r * 0.4;
      const a = (i * Math.PI) / pts - Math.PI / 2 + rotation;
      if (i === 0) {
        ctx.moveTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      } else {
        ctx.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
      }
    }
    ctx.closePath();
    ctx.fill();
  }

  _loop() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.activeParticles = this.activeParticles.filter(p => p.active);

    this.activeParticles.forEach(p => {
      p.update();
      if (!p.active) return;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.shape === 'star') {
        this._drawStar(ctx, 0, 0, p.size, 0);
      } else if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    requestAnimationFrame(() => this._loop());
  }
}

export class VisualEffects {
  static initShaders(app, mainContainer) {
    if (!this.bloom) {
      const filters = window.PIXI?.filters || {};
      
      this.mainContainer = mainContainer;
      this.shockwaves = [];
      
      if (filters.AdvancedBloomFilter) {
        this.bloom = new filters.AdvancedBloomFilter({
          threshold: 0.6,
          bloomScale: 1.5,
          brightness: 1.2,
          blur: 8,
          quality: 4
        });
        mainContainer.filters = [this.bloom];
      } else {
        mainContainer.filters = [];
      }
      
      if (filters.GodrayFilter) {
        this.godrays = new filters.GodrayFilter({
          angle: 30,
          gain: 0.5,
          lacunarity: 2.5,
          time: 0
        });
        this.godrays.enabled = false;
      }
      
      app.ticker.add((delta) => {
        if (this.godrays && this.godrays.enabled) {
          this.godrays.time += delta * 0.01;
        }
        
        // Update shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
          const sw = this.shockwaves[i];
          sw.time += delta * 0.02;
          if (sw.time > 1.5) {
            this.shockwaves.splice(i, 1);
            this.mainContainer.filters = this.mainContainer.filters.filter(f => f !== sw);
          }
        }
      });
    }
  }

  static shakeScreen(boardEl, duration = 300, intensity = 8) {
    const startTime = Date.now();
    
    function shake() {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        const dx = (Math.random() - 0.5) * intensity * (1 - elapsed / duration);
        const dy = (Math.random() - 0.5) * intensity * (1 - elapsed / duration);
        boardEl.style.transform = `translate(${dx}px, ${dy}px)`;
        requestAnimationFrame(shake);
      } else {
        boardEl.style.transform = 'translate(0, 0)';
      }
    }
    shake();
  }

  static triggerShockwave(x, y) {
    if (!this.mainContainer) return;
    const filters = window.PIXI?.filters || {};
    if (filters.ShockwaveFilter) {
      const shockwave = new filters.ShockwaveFilter([x, y], {
        amplitude: 30,
        wavelength: 160,
        speed: 500,
        brightness: 1.2,
        radius: -1
      });
      shockwave.time = 0;
      this.shockwaves.push(shockwave);
      this.mainContainer.filters.push(shockwave);
    }
  }

  static toggleGodrays(enabled) {
    if (!this.mainContainer || !this.godrays) return;
    this.godrays.enabled = enabled;
    if (enabled && !this.mainContainer.filters.includes(this.godrays)) {
      this.mainContainer.filters.push(this.godrays);
    } else if (!enabled) {
      this.mainContainer.filters = this.mainContainer.filters.filter(f => f !== this.godrays);
    }
  }

  static applyBevel(sprite) {
    const filters = window.PIXI?.filters || {};
    if (!filters.BevelFilter) return;
    
    if (!this.bevel) {
      this.bevel = new filters.BevelFilter({
        rotation: 45,
        thickness: 2,
        lightColor: 0xffffff,
        lightAlpha: 0.7,
        shadowColor: 0x000000,
        shadowAlpha: 0.5
      });
    }
    if (!sprite.filters) sprite.filters = [];
    if (!sprite.filters.includes(this.bevel)) {
       sprite.filters.push(this.bevel);
    }
  }
}
