import { Application, Container, Graphics, ColorMatrixFilter, BlurFilter, NoiseFilter, Text, TextStyle } from 'pixi.js';
import { useGameState } from '../state/useGameState';
import { ThemeManager } from '../systems/ThemeManager';

export class ParticleSystem {
  static seasonalContainer: Container | null = null;
  static seasonalAnimate: ((ticker: any) => void) | null = null;

  static applyPostProcessing(app: Application) {
    const quality = useGameState.getState().quality;
    if (quality === 'Low') {
      app.stage.filters = [];
      return;
    }

    const filters: any[] = [];
    
    // Add ColorMatrix for slight premium contrast
    const colorMatrix = new ColorMatrixFilter();
    colorMatrix.contrast(0.1, false);
    filters.push(colorMatrix);

    if (quality === 'Ultra' || quality === 'High') {
      // Film grain effect
      const noise = new NoiseFilter();
      noise.noise = quality === 'Ultra' ? 0.08 : 0.04;
      filters.push(noise);
      
      app.ticker.add(() => {
        noise.seed = Math.random();
      });

      // Ambient Vignette using a screen-space overlay graphics instead of filter to save performance, or we can just draw it
    }

    if (quality === 'Ultra') {
      // Add a subtle bloom/blur effect for ultra quality
      const blur = new BlurFilter();
      blur.blur = 0.5;
      filters.push(blur);
    }
    
    app.stage.filters = filters;

    // Draw Ambient Vignette manually as a top-level overlay on stage (behind UI but above game)
    // We handle it inside GameApp for z-ordering, so we'll skip it here or just add it to stage
  }

  static createSeasonalParticles(app: Application, themeId: string) {
    // Clear old seasonal particles
    if (this.seasonalContainer) {
      if (this.seasonalAnimate) app.ticker.remove(this.seasonalAnimate);
      this.seasonalContainer.destroy({ children: true });
      this.seasonalContainer = null;
    }

    const quality = useGameState.getState().quality;
    if (quality === 'Low') return;

    const theme = ThemeManager.getTheme(themeId);
    if (!theme || theme.particleDensityMultiplier <= 0) return;

    this.seasonalContainer = new Container();
    app.stage.addChildAt(this.seasonalContainer, 0); // Put behind tubes

    let baseCount = 0;
    if (quality === 'Ultra') baseCount = 80;
    else if (quality === 'High') baseCount = 40;
    else baseCount = 15;
    
    const count = Math.floor(baseCount * theme.particleDensityMultiplier);
    const particles: { p: Graphics, vx: number, vy: number, s: number, t: number }[] = [];
    const colors = theme.particleColors;

    for (let i = 0; i < count; i++) {
      const p = new Graphics();
      p.circle(0, 0, Math.random() * 3 + 1);
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.fill({ color, alpha: Math.random() * 0.5 + 0.2 });
      p.x = Math.random() * app.screen.width;
      p.y = Math.random() * app.screen.height;
      this.seasonalContainer.addChild(p);

      particles.push({
        p,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5 - 0.2, // slight upward drift default
        s: (Math.random() - 0.5) * 0.05,
        t: Math.random() * 100
      });
    }

    this.seasonalAnimate = (ticker: any) => {
      particles.forEach(pt => {
        pt.t += ticker.deltaTime * 0.05;
        pt.p.x += pt.vx;
        pt.p.y += pt.vy;
        pt.p.rotation += pt.s;
        
        pt.p.alpha = Math.abs(Math.sin(pt.t)) * 0.5 + 0.1;
        
        if (pt.p.y > app.screen.height + 10) pt.p.y = -10;
        if (pt.p.y < -10) pt.p.y = app.screen.height + 10;
        if (pt.p.x > app.screen.width + 10) pt.p.x = -10;
        if (pt.p.x < -10) pt.p.x = app.screen.width + 10;
      });
    };
    app.ticker.add(this.seasonalAnimate);
  }

  // Phase D: Advanced Particles & VFX
  static emitSplash(x: number, y: number) {
    // Only emit particles if we have a valid container setup
    // For simplicity, we can get the active PIXI app from a global ref, 
    // but in a production React architecture, we use a central event bus or pass it.
    // Assuming the app is accessible or we just dispatch a CustomEvent that the GameApp listens to.
    window.dispatchEvent(new CustomEvent('VFX_SPLASH', { detail: { x, y } }));
  }

  static createVictoryConfetti(app: Application) {
    const quality = useGameState.getState().quality;
    if (quality === 'Low') return; // Disable particles for low quality

    const count = quality === 'Ultra' ? 300 : (quality === 'High' ? 150 : 70);

    const container = new Container();
    app.stage.addChild(container);

    const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF, 0xFFFFFF];
    const particles: { p: Graphics, vx: number, vy: number, s: number }[] = [];

    // Slow-mo effect
    const originalSpeed = app.ticker.speed;
    app.ticker.speed = 0.3;
    setTimeout(() => {
      // Tween back to 1.0 would be better, but quick restore for now
      app.ticker.speed = originalSpeed;
    }, 2000);

    for (let i = 0; i < count; i++) {
      const p = new Graphics();
      if (Math.random() > 0.5) {
        p.rect(-5, -5, 10, 10);
      } else {
        p.circle(0, 0, 5);
      }
      
      p.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
      
      p.x = app.screen.width / 2;
      p.y = app.screen.height / 2;
      
      const angle = (Math.random() * Math.PI * 2);
      const speed = Math.random() * 25 + 10;
      
      container.addChild(p);
      particles.push({
        p,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15,
        s: (Math.random() - 0.5) * 0.5
      });
    }

    const animate = () => {
      let active = false;
      particles.forEach(pt => {
        if (pt.p.y > app.screen.height + 50) return;
        active = true;
        pt.p.x += pt.vx;
        pt.p.y += pt.vy;
        pt.vy += 0.8; // gravity
        pt.vx *= 0.98; // friction
        pt.p.rotation += pt.s;
      });
      
      if (!active) {
        app.ticker.remove(animate);
        container.destroy({ children: true });
      }
    };
    
    app.ticker.add(animate);

    // Fireworks effect (Burst of glowing particles)
    const fireworkColors = [0xff0044, 0x00ff99, 0x00ccff, 0xffcc00, 0xcc00ff];
    for (let f = 0; f < 3; f++) {
      const fx = (Math.random() * 0.6 + 0.2) * app.screen.width;
      const fy = (Math.random() * 0.4 + 0.1) * app.screen.height;
      const fColor = fireworkColors[Math.floor(Math.random() * fireworkColors.length)];
      
      for (let i = 0; i < 40; i++) {
        const p = new Graphics();
        p.circle(0, 0, Math.random() * 4 + 2);
        p.fill({ color: fColor, alpha: 1 });
        p.x = fx;
        p.y = fy;
        container.addChild(p);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 8 + 2;
        
        particles.push({
          p,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          s: 0
        });
      }
    }

    // Screen Glow effect (Flash white then fade out)
    const glow = new Graphics();
    glow.rect(0, 0, app.screen.width, app.screen.height);
    glow.fill({ color: 0xffffff, alpha: 0.3 });
    app.stage.addChild(glow);
    
    // XP Counter floating text
    const textStyle = new TextStyle({
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 64,
      fill: [0xffffff, 0x00ff99],
      dropShadow: {
        alpha: 0.8,
        angle: Math.PI / 6,
        blur: 10,
        color: 0x000000,
        distance: 6,
      },
    });
    
    const xpText = new Text({ text: '+100 XP', style: textStyle });
    xpText.anchor.set(0.5);
    xpText.x = app.screen.width / 2;
    xpText.y = app.screen.height / 2 + 50;
    app.stage.addChild(xpText);
    
    let time = 0;
    const textAnimate = (ticker: any) => {
      time += ticker.deltaTime * 0.05;
      
      // Animate Screen Glow
      if (glow.alpha > 0) {
        glow.alpha -= ticker.deltaTime * 0.02;
      } else if (glow.parent) {
        glow.destroy();
      }

      xpText.y -= 1;
      xpText.alpha = 1 - time / 3;
      xpText.scale.set(1 + Math.sin(time * 10) * 0.1);
      
      if (xpText.alpha <= 0) {
        app.ticker.remove(textAnimate);
        xpText.destroy();
      }
    };
    app.ticker.add(textAnimate);
  }
}
