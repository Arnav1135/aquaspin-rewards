import { Graphics, Container } from 'pixi.js';
import { useGameState } from '../state/useGameState';
import { ThemeManager } from '../systems/ThemeManager';
import { VesselDefinition } from '../registries/VesselRegistry';

/**
 * Deterministic liquid renderer.
 *
 * Rendering is driven only by logical volume + a small, explicitly supplied
 * surface ripple. There is no per-frame random movement or accumulated y drift.
 */
export class LiquidGraphics extends Container {
  public vesselDef: VesselDefinition;
  public tubeWidth: number;
  public tubeHeight: number;
  public capacity: number;

  private liquidMask: Graphics;
  public animatedVolume = 0;
  private currentColors: number[] = [];
  private surfaceRipple = 0;

  constructor(vesselDef: VesselDefinition, tubeWidth: number, tubeHeight: number, capacity: number) {
    super();
    this.vesselDef = vesselDef;
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
    this.liquidMask.clear();
    
    if (this.vesselDef && this.vesselDef.drawMask) {
      this.vesselDef.drawMask(this.liquidMask, w, h);
    } else {
      // Fallback
      const r = w / 2;
      this.liquidMask.roundRect(2, 2, w - 4, h - 4, r - 2);
    }
    
    this.liquidMask.fill({ color: 0xFFFFFF });
  }

  public updateLiquids(colors: number[]) {
    this.currentColors = [...colors];
    this.animatedVolume = colors.length;
    this.surfaceRipple = 0;
    this.renderLiquids();
  }

  /** Update fractional volume during a pour. */
  public setAnimatedVolume(volume: number, colors: number[], surfaceRipple = 0) {
    this.currentColors = [...colors];
    this.animatedVolume = Math.max(0, Math.min(this.capacity, volume));
    this.surfaceRipple = Number.isFinite(surfaceRipple) ? surfaceRipple : 0;
    this.renderLiquids();
  }

  private renderLiquids() {
    const colors = this.currentColors;

    // This renderer is called only at animation updates. Explicitly dispose
    // old transient graphics so fractional-volume frames cannot accumulate.
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child !== this.liquidMask) {
        this.removeChild(child);
        child.destroy({ children: true });
      }
    }

    if (colors.length === 0 || this.animatedVolume <= 0) return;

    const segmentHeight = (this.tubeHeight - this.tubeWidth) / this.capacity;
    const w = this.tubeWidth;
    const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
    const { colorBlindMode } = useGameState.getState();

    let remainingVolume = this.animatedVolume;

    colors.forEach((colorId, i) => {
      if (remainingVolume <= 0) return;

      const fillAmount = Math.min(1, remainingVolume);
      remainingVolume -= fillAmount;

      const hexColor = activeTheme.liquidPalette[colorId % activeTheme.liquidPalette.length];
      const g = new Graphics();
      const bottomY = this.tubeHeight - this.tubeWidth / 2 - i * segmentHeight;
      const currentSegmentHeight = Math.max(0, segmentHeight * fillAmount);
      const isSurface = remainingVolume <= 0 && currentSegmentHeight > 0;
      const topY = bottomY - currentSegmentHeight + (isSurface ? this.surfaceRipple : 0);

      g.roundRect(2, topY, w - 4, currentSegmentHeight + 2, Math.min(6, (w - 4) / 2));
      g.fill({ color: hexColor });

      if (isSurface) {
        // A subtle meniscus responds to the actual pour, rather than a random
        // wave. The ripple is bounded by AnimationSystem.
        const meniscus = new Graphics();
        meniscus.ellipse(w / 2, topY, (w - 4) / 2, 3.5);
        meniscus.fill({ color: 0xFFFFFF, alpha: 0.28 });
        g.addChild(meniscus);
      }

      if (currentSegmentHeight > 2) {
        const depth = new Graphics();
        depth.rect(2, bottomY - Math.min(6, currentSegmentHeight), w - 4, Math.min(6, currentSegmentHeight));
        depth.fill({ color: 0x000000, alpha: 0.1 });
        g.addChild(depth);
      }

      if (colorBlindMode && currentSegmentHeight > segmentHeight * 0.5) {
        const hash = colorId % 5 + 1;
        const pattern = new Graphics();
        pattern.fill({ color: 0xFFFFFF, alpha: 0.5 });
        for (let d = 0; d < hash; d++) {
          pattern.circle(w / 2 - (hash * 6) / 2 + d * 6 + 3, topY + currentSegmentHeight / 2, 2);
        }
        g.addChild(pattern);
      }

      this.addChild(g);
    });
  }
}
