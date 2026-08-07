import { Graphics, Container } from 'pixi.js';
import { useGameState } from '../state/useGameState';
import { ThemeManager } from '../systems/ThemeManager';

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
    
    const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
    
    // Draw each color segment
    colors.forEach((colorId, i) => {
      const hexColor = activeTheme.liquidPalette[colorId % activeTheme.liquidPalette.length];
      const g = new Graphics();
      const yOffset = this.tubeHeight - this.tubeWidth / 2 - (i + 1) * segmentHeight;

      // Base liquid block
      g.rect(2, yOffset, w - 4, segmentHeight + 2);
      g.fill({ color: hexColor });

      // Add meniscus/surface tension highlight at the top of the segment
      const meniscus = new Graphics();
      meniscus.ellipse(w / 2, yOffset, (w - 4) / 2, 4);
      meniscus.fill({ color: 0xFFFFFF, alpha: 0.3 });
      
      // Animate the meniscus to simulate subtle liquid ripples
      const timeOffset = Math.random() * 100;
      let tick = 0;
      const animateRipple = () => {
        tick += 0.05;
        if (meniscus && !meniscus.destroyed) {
          meniscus.clear();
          meniscus.ellipse(
            w / 2, 
            yOffset + Math.sin(tick + timeOffset) * 1.5, // vertical wobble
            (w - 4) / 2 + Math.cos(tick + timeOffset) * 1, // horizontal squeeze
            4 + Math.sin(tick * 2 + timeOffset) * 1 // thickness pulse
          );
          meniscus.fill({ color: 0xFFFFFF, alpha: 0.3 });
        }
      };
      
      // We need to hook this up to the PIXI ticker. The easiest way is to add an event listener or handle it centrally.
      // But PIXI v8 doesn't have an easy global ticker access inside a Container without app reference, unless we import Ticker.shared
      import('pixi.js').then(({ Ticker }) => {
        Ticker.shared.add(animateRipple);
        meniscus.on('destroyed', () => Ticker.shared.remove(animateRipple));
      });
      
      // Add subtle dark gradient/shadow at the bottom of the segment for depth
      const depth = new Graphics();
      depth.rect(2, yOffset + segmentHeight - 4, w - 4, 6);
      depth.fill({ color: 0x000000, alpha: 0.1 });

      g.addChild(depth, meniscus);
      
      const { colorBlindMode } = useGameState.getState();
      if (colorBlindMode) {
        // Simple hash of color to pick a pattern (1 to 5 dots)
        const hash = colorId % 5 + 1;
        const pattern = new Graphics();
        pattern.fill({ color: 0xFFFFFF, alpha: 0.5 });
        for(let d=0; d<hash; d++) {
          pattern.circle(w / 2 - (hash*6)/2 + d*6 + 3, yOffset + segmentHeight / 2, 2);
        }
        g.addChild(pattern);
      }

      this.addChild(g);
    });
  }
}
