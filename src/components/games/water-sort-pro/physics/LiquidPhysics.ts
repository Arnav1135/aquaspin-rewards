import { Container, Graphics, Ticker } from 'pixi.js';

export class LiquidPhysics {
  static applyWaveEffect(container: Container, ticker: Ticker) {
    let time = 0;
    const waveGraphics = container.children.filter(c => c instanceof Graphics) as Graphics[];

    ticker.add((ticker) => {
      time += ticker.deltaTime * 0.1;
      waveGraphics.forEach((g, i) => {
        // Slight organic bobbing to simulate liquid physics
        g.y += Math.sin(time + i) * 0.1;
      });
    });
  }
}
