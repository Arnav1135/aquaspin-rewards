import { Graphics, Container } from 'pixi.js';

export class LiquidGraphics extends Container {
  private colors: number[] = [];
  public tubeWidth: number;
  public tubeHeight: number;
  public capacity: number;
  
  private liquidMask: Graphics;

  constructor(tubeWidth: number, tubeHeight: number, capacity: number) {
    super();
    this.tubeWidth = tubeWidth;
    this.tubeHeight = tubeHeight;
    this.capacity = capacity;

    this.liquidMask = new Graphics();
    this.createMask();
    this.mask = this.liquidMask;
    this.addChild(this.liquidMask);
  }

  private createMask() {
    const w = this.tubeWidth;
    const h = this.tubeHeight;
    const r = w / 2;
    
    this.liquidMask.clear();
    // Slightly smaller than the tube to fit inside the glass thickness
    this.liquidMask.roundRect(2, 2, w - 4, h - 4, r - 2);
    this.liquidMask.fill({ color: 0xFFFFFF });
  }

  public updateLiquids(colors: number[]) {
    this.colors = colors;
    // Remove all previous liquid layers except the mask
    this.children.forEach(child => {
      if (child !== this.liquidMask) this.removeChild(child);
    });

    if (colors.length === 0) return;

    const segmentHeight = (this.tubeHeight - this.tubeWidth) / this.capacity;
    const w = this.tubeWidth;
    
    // Draw each color segment
    colors.forEach((color, i) => {
      const g = new Graphics();
      const yOffset = this.tubeHeight - this.tubeWidth / 2 - (i + 1) * segmentHeight;

      // Base liquid block
      g.rect(2, yOffset, w - 4, segmentHeight + 2);
      g.fill({ color });

      // Add meniscus/surface tension highlight at the top of the segment
      const meniscus = new Graphics();
      meniscus.ellipse(w / 2, yOffset, (w - 4) / 2, 4);
      meniscus.fill({ color: 0xFFFFFF, alpha: 0.3 });
      
      // Add subtle dark gradient/shadow at the bottom of the segment for depth
      const depth = new Graphics();
      depth.rect(2, yOffset + segmentHeight - 4, w - 4, 6);
      depth.fill({ color: 0x000000, alpha: 0.1 });

      g.addChild(depth, meniscus);
      this.addChild(g);
    });
  }
}
