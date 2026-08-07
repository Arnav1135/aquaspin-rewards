import { Graphics, Container } from 'pixi.js';

export class TubeGraphics extends Container {
  public tubeWidth: number;
  public tubeHeight: number;
  private glass: Graphics;
  private highlight: Graphics;
  private reflection: Graphics;

  constructor(width: number, height: number) {
    super();
    this.tubeWidth = width;
    this.tubeHeight = height;

    this.glass = new Graphics();
    this.highlight = new Graphics();
    this.reflection = new Graphics();

    this.draw();
    this.addChild(this.glass, this.highlight, this.reflection);
  }

  private draw() {
    const w = this.width;
    const h = this.height;
    const radius = w / 2;

    // Base Glass (Frosted/Semi-transparent)
    this.glass.clear();
    this.glass.setStrokeStyle({ width: 4, color: 0xFFFFFF, alpha: 0.4 });
    this.glass.roundRect(0, 0, w, h, radius);
    this.glass.fill({ color: 0xFFFFFF, alpha: 0.05 });
    this.glass.stroke();

    // Fresnel Edge Highlights (Left and Right edges)
    this.highlight.clear();
    this.highlight.setStrokeStyle({ width: 2, color: 0xFFFFFF, alpha: 0.7 });
    this.highlight.moveTo(2, radius);
    this.highlight.lineTo(2, h - radius);
    this.highlight.stroke();

    this.highlight.setStrokeStyle({ width: 2, color: 0xFFFFFF, alpha: 0.3 });
    this.highlight.moveTo(w - 2, radius);
    this.highlight.lineTo(w - 2, h - radius);
    this.highlight.stroke();

    // Front Curve Reflection for depth illusion
    this.reflection.clear();
    this.reflection.roundRect(w * 0.1, h * 0.05, w * 0.2, h * 0.8, w * 0.1);
    this.reflection.fill({ color: 0xFFFFFF, alpha: 0.15 });
  }

  public setHighlight(active: boolean) {
    if (active) {
      this.glass.clear();
      this.glass.setStrokeStyle({ width: 6, color: 0xFFFFFF, alpha: 0.9 });
      this.glass.roundRect(-2, -2, this.width + 4, this.height + 4, this.width / 2 + 2);
      this.glass.fill({ color: 0xFFFFFF, alpha: 0.1 });
      this.glass.stroke();
    } else {
      this.draw(); // Reset to default
    }
  }
}
