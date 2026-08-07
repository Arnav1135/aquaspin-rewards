import { Application, Container, Graphics } from 'pixi.js';

export class ParticleSystem {
  static createVictoryConfetti(app: Application) {
    const container = new Container();
    app.stage.addChild(container);

    const colors = [0xFF0000, 0x00FF00, 0x0000FF, 0xFFFF00, 0xFF00FF, 0x00FFFF];
    
    for (let i = 0; i < 100; i++) {
      const p = new Graphics();
      p.rect(-5, -5, 10, 10);
      p.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
      
      p.x = app.screen.width / 2;
      p.y = app.screen.height / 2;
      
      const velocity = {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20 - 10
      };
      
      container.addChild(p);

      const animate = () => {
        p.x += velocity.x;
        p.y += velocity.y;
        velocity.y += 0.5; // gravity
        p.rotation += 0.1;
        
        if (p.y > app.screen.height) {
          app.ticker.remove(animate);
          p.destroy();
        }
      };
      
      app.ticker.add(animate);
    }
  }
}
