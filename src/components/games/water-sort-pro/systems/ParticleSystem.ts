import { Application, Container, Graphics, ColorMatrixFilter, BlurFilter, NoiseFilter, Text, TextStyle } from 'pixi.js';
import { useGameState } from '../state/useGameState';

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

  static createSeasonalParticles(app: Application, theme: string) {
    // Clear old seasonal particles
    if (this.seasonalContainer) {
      if (this.seasonalAnimate) app.ticker.remove(this.seasonalAnimate);
      this.seasonalContainer.destroy({ children: true });
      this.seasonalContainer = null;
    }

    const quality = useGameState.getState().quality;
    if (quality === 'Low') return;

    if (theme === 'Snow' || theme === 'Winter' || theme === 'Crystal') {
      this.seasonalContainer = new Container();
      app.stage.addChildAt(this.seasonalContainer, 0); // Put behind tubes

      const count = quality === 'Ultra' ? 100 : (quality === 'High' ? 50 : 20);
      const particles: { p: Graphics, vx: number, vy: number, s: number }[] = [];

      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        p.circle(0, 0, Math.random() * 2 + 1);
        p.fill({ color: 0xFFFFFF, alpha: Math.random() * 0.5 + 0.2 });
        p.x = Math.random() * app.screen.width;
        p.y = Math.random() * app.screen.height;
        this.seasonalContainer.addChild(p);

        particles.push({
          p,
          vx: (Math.random() - 0.5) * 1,
          vy: Math.random() * 1 + 0.5,
          s: Math.random() * 0.05
        });
      }

      this.seasonalAnimate = () => {
        particles.forEach(pt => {
          pt.p.x += pt.vx;
          pt.p.y += pt.vy;
          pt.p.rotation += pt.s;
          if (pt.p.y > app.screen.height) {
            pt.p.y = -10;
            pt.p.x = Math.random() * app.screen.width;
          }
        });
      };
      app.ticker.add(this.seasonalAnimate);
    } else if (theme === 'Autumn' || theme === 'Forest' || theme === 'Sunset') {
      this.seasonalContainer = new Container();
      app.stage.addChildAt(this.seasonalContainer, 0);

      const count = quality === 'Ultra' ? 60 : (quality === 'High' ? 30 : 15);
      const particles: { p: Graphics, vx: number, vy: number, s: number }[] = [];
      const colors = [0xFF9900, 0xFF6600, 0xCC3300, 0x999900];

      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        // Leaf shape
        p.moveTo(0, -5).lineTo(3, 0).lineTo(0, 5).lineTo(-3, 0).lineTo(0, -5);
        p.fill({ color: colors[Math.floor(Math.random() * colors.length)], alpha: 0.8 });
        p.x = Math.random() * app.screen.width;
        p.y = Math.random() * app.screen.height;
        this.seasonalContainer.addChild(p);

        particles.push({
          p,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 1.5 + 0.5,
          s: (Math.random() - 0.5) * 0.1
        });
      }

      this.seasonalAnimate = () => {
        particles.forEach(pt => {
          pt.p.x += pt.vx + Math.sin(Date.now() / 1000 + pt.p.y / 50) * 0.5;
          pt.p.y += pt.vy;
          pt.p.rotation += pt.s;
          if (pt.p.y > app.screen.height) {
            pt.p.y = -10;
            pt.p.x = Math.random() * app.screen.width;
          }
        });
      };
      app.ticker.add(this.seasonalAnimate);
    } else if (theme === 'Spring' || theme === 'Candy') {
      this.seasonalContainer = new Container();
      app.stage.addChildAt(this.seasonalContainer, 0);

      const count = quality === 'Ultra' ? 80 : (quality === 'High' ? 40 : 20);
      const particles: { p: Graphics, vx: number, vy: number, s: number }[] = [];
      const colors = [0xFFB7C5, 0xFFC0CB, 0xFF69B4]; // Sakura pinks

      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        p.ellipse(0, 0, 4, 2);
        p.fill({ color: colors[Math.floor(Math.random() * colors.length)], alpha: 0.7 });
        p.x = Math.random() * app.screen.width;
        p.y = Math.random() * app.screen.height;
        this.seasonalContainer.addChild(p);

        particles.push({
          p,
          vx: (Math.random() * 2) + 1, // Blow right
          vy: Math.random() * 1 + 0.5,
          s: (Math.random() - 0.5) * 0.1
        });
      }

      this.seasonalAnimate = () => {
        particles.forEach(pt => {
          pt.p.x += pt.vx + Math.sin(Date.now() / 1500 + pt.p.y / 40) * 0.5;
          pt.p.y += pt.vy;
          pt.p.rotation += pt.s;
          if (pt.p.y > app.screen.height || pt.p.x > app.screen.width) {
            pt.p.y = -10;
            pt.p.x = -10;
          }
        });
      };
      app.ticker.add(this.seasonalAnimate);
    } else if (theme === 'Summer' || theme === 'Aurora' || theme === 'Galaxy' || theme === 'Holiday' || theme === 'Festival') {
      this.seasonalContainer = new Container();
      app.stage.addChildAt(this.seasonalContainer, 0);

      const count = quality === 'Ultra' ? 40 : (quality === 'High' ? 20 : 10);
      const particles: { p: Graphics, vx: number, vy: number, s: number, t: number }[] = [];
      
      let colors = [0xFFDD00];
      if (theme === 'Aurora') colors = [0x00FF99, 0x00FFFF];
      if (theme === 'Galaxy') colors = [0xAA00FF, 0xFF00AA, 0x00AAFF];
      if (theme === 'Holiday') colors = [0xFF0000, 0x00FF00, 0xFFFF00];
      if (theme === 'Festival') colors = [0xFF5500, 0xFF0055, 0xFFFF00, 0x00FFFF];

      for (let i = 0; i < count; i++) {
        const p = new Graphics();
        p.circle(0, 0, Math.random() * 6 + 2);
        p.fill({ color: colors[Math.floor(Math.random() * colors.length)], alpha: 0.4 });
        p.x = Math.random() * app.screen.width;
        p.y = Math.random() * app.screen.height;
        this.seasonalContainer.addChild(p);

        particles.push({
          p,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          s: 0,
          t: Math.random() * 100
        });
      }

      this.seasonalAnimate = (ticker) => {
        particles.forEach(pt => {
          pt.t += ticker.deltaTime * 0.05;
          pt.p.x += pt.vx;
          pt.p.y += pt.vy;
          
          if (theme === 'Holiday' || theme === 'Festival') {
            pt.p.alpha = Math.abs(Math.sin(pt.t * 2)) * 0.8 + 0.2; // Blink fast
          } else {
            pt.p.alpha = Math.abs(Math.sin(pt.t)) * 0.5 + 0.1; // Pulse slowly
          }
          
          if (pt.p.y > app.screen.height) pt.p.y = 0;
          if (pt.p.y < 0) pt.p.y = app.screen.height;
          if (pt.p.x > app.screen.width) pt.p.x = 0;
          if (pt.p.x < 0) pt.p.x = app.screen.width;
        });
      };
      app.ticker.add(this.seasonalAnimate);
    }
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
