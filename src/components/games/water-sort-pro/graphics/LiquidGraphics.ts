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

  public animatedVolume: number = 0;
  private currentColors: number[] = [];

  public updateLiquids(colors: number[]) {
    this.currentColors = [...colors];
    this.animatedVolume = colors.length;
    this.renderLiquids();
  }
  
  // Call this during GSAP update to render fractional liquid levels
  public setAnimatedVolume(volume: number, colors: number[]) {
    this.currentColors = [...colors];
    this.animatedVolume = volume;
    this.renderLiquids();
  }

  private renderLiquids() {
    const colors = this.currentColors;
    
    // Destroy all previous liquid layers to prevent memory leaks
    const childrenToRemove: any[] = [];
    this.children.forEach(child => {
      if (child !== this.liquidMask) {
        childrenToRemove.push(child);
      }
    });
    
    childrenToRemove.forEach(child => {
      child.destroy({ children: true });
      this.removeChild(child);
    });

    if (colors.length === 0 || this.animatedVolume <= 0) return;

    const segmentHeight = (this.tubeHeight - this.tubeWidth) / this.capacity;
    const w = this.tubeWidth;
    
    const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
    
    // We draw the liquid from the bottom up based on animatedVolume
    let remainingVolume = this.animatedVolume;
    
    colors.forEach((colorId, i) => {
      if (remainingVolume <= 0) return;
      
      // Determine how much of this segment is filled (up to 1)
      const fillAmount = Math.min(1, remainingVolume);
      remainingVolume -= fillAmount;
      
      const hexColor = activeTheme.liquidPalette[colorId % activeTheme.liquidPalette.length];
      const g = new Graphics();
      
      // yOffset is calculated based on how much is filled up to this point
      // Bottom of the tube is tubeHeight - tubeWidth / 2
      // Each full segment goes up by segmentHeight
      const bottomY = this.tubeHeight - this.tubeWidth / 2 - (i * segmentHeight);
      const currentSegmentHeight = segmentHeight * fillAmount;
      const topY = bottomY - currentSegmentHeight;

      // Base liquid block
      g.rect(2, topY, w - 4, currentSegmentHeight + 2);
      g.fill({ color: hexColor });
      
      // Meniscus / surface tension highlight (only at the very top of the highest visible liquid)
      if (remainingVolume <= 0 && fillAmount > 0) {
        const meniscus = new Graphics();
        meniscus.ellipse(w / 2, topY, (w - 4) / 2, 4);
        meniscus.fill({ color: 0xFFFFFF, alpha: 0.3 });
        g.addChild(meniscus);
      }
      
      // Add subtle dark gradient/shadow at the bottom of the segment for depth
      // Only if this segment has some height
      if (currentSegmentHeight > 2) {
        const depth = new Graphics();
        depth.rect(2, bottomY - Math.min(6, currentSegmentHeight), w - 4, Math.min(6, currentSegmentHeight));
        depth.fill({ color: 0x000000, alpha: 0.1 });
        g.addChild(depth);
      }
      
      const { colorBlindMode } = useGameState.getState();
      if (colorBlindMode && currentSegmentHeight > segmentHeight * 0.5) {
        const hash = colorId % 5 + 1;
        const pattern = new Graphics();
        pattern.fill({ color: 0xFFFFFF, alpha: 0.5 });
        for(let d=0; d<hash; d++) {
          pattern.circle(w / 2 - (hash*6)/2 + d*6 + 3, topY + currentSegmentHeight / 2, 2);
        }
        g.addChild(pattern);
      }

      this.addChild(g);
    });
  }
}
