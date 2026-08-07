import { Graphics, Container, FillGradient } from 'pixi.js';
import { ThemeManager } from '../systems/ThemeManager';
import { useGameState } from '../state/useGameState';

export class TubeGraphics extends Container {
  public tubeWidth: number;
  public tubeHeight: number;
  private backgroundGlass: Graphics;
  private glassRim: Graphics;
  private highlight: Graphics;
  private reflection: Graphics;
  private ambientOcclusion: Graphics;

  constructor(width: number, height: number) {
    super();
    this.tubeWidth = width;
    this.tubeHeight = height;

    this.backgroundGlass = new Graphics();
    this.glassRim = new Graphics();
    this.highlight = new Graphics();
    this.reflection = new Graphics();
    this.ambientOcclusion = new Graphics();

    // Soft drop shadow / ambient occlusion on the floor
    this.drawShadow();

    this.draw();
    
    // Order matters for blending and depth perception
    this.addChild(this.ambientOcclusion, this.backgroundGlass, this.highlight, this.reflection, this.glassRim);
  }

  private drawShadow() {
    this.ambientOcclusion.clear();
    const radius = this.tubeWidth / 2;
    this.ambientOcclusion.ellipse(this.tubeWidth / 2, this.tubeHeight, this.tubeWidth * 0.8, 8);
    this.ambientOcclusion.fill({ color: 0x000000, alpha: 0.3 });
  }

  private draw() {
    const w = this.tubeWidth;
    const h = this.tubeHeight;
    const radius = w / 2;
    
    const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
    const thickness = activeTheme.glassMaterial.thickness || 6;
    const glassColor = activeTheme.glassMaterial.color;
    const glassOpacity = activeTheme.glassMaterial.opacity;

    // 1. Back Wall & Base (Subtle frosted glass)
    this.backgroundGlass.clear();
    this.backgroundGlass.setStrokeStyle({ width: thickness, color: glassColor, alpha: glassOpacity });
    // Don't draw the top border (open tube)
    this.backgroundGlass.moveTo(0, 0);
    this.backgroundGlass.lineTo(0, h - radius);
    this.backgroundGlass.arc(radius, h - radius, radius, Math.PI, 0, true);
    this.backgroundGlass.lineTo(w, 0);
    this.backgroundGlass.fill({ color: glassColor, alpha: glassOpacity * 0.3 });
    this.backgroundGlass.stroke();

    // 2. Thick Glass Rim at the Top
    this.glassRim.clear();
    this.glassRim.setStrokeStyle({ width: 2, color: 0xFFFFFF, alpha: 0.9 });
    this.glassRim.ellipse(w / 2, 0, w / 2 + thickness/2, 4);
    this.glassRim.fill({ color: 0xFFFFFF, alpha: 0.2 });
    this.glassRim.stroke();
    
    // 3. Fresnel / Refraction Highlights (Outer edges)
    this.highlight.clear();
    this.highlight.rect(0, 5, 6, h - radius);
    this.highlight.fill({ color: 0xFFFFFF, alpha: 0.4 });

    this.highlight.rect(w - 6, 5, 6, h - radius);
    this.highlight.fill({ color: 0xFFFFFF, alpha: 0.4 });

    // 4. Inner Front Specular Reflection (Curved surface illusion)
    this.reflection.clear();
    this.reflection.roundRect(w * 0.15, h * 0.02, w * 0.15, h * 0.85, w * 0.1);
    this.reflection.fill({ color: 0xFFFFFF, alpha: 0.2 });
  }

  public setHighlight(active: boolean) {
    if (active) {
      // Premium Selection Outline
      this.backgroundGlass.clear();
      this.backgroundGlass.setStrokeStyle({ width: 8, color: 0xFFFFFF, alpha: 0.9 });
      this.backgroundGlass.moveTo(0, 0);
      this.backgroundGlass.lineTo(0, this.tubeHeight - this.tubeWidth/2);
      this.backgroundGlass.arc(this.tubeWidth/2, this.tubeHeight - this.tubeWidth/2, this.tubeWidth/2, Math.PI, 0, true);
      this.backgroundGlass.lineTo(this.tubeWidth, 0);
      
      this.backgroundGlass.fill({ color: 0xFFFFFF, alpha: 0.3 });
      this.backgroundGlass.stroke();
      
      // Intense Rim
      this.glassRim.clear();
      this.glassRim.setStrokeStyle({ width: 4, color: 0xFFFFFF, alpha: 1.0 });
      this.glassRim.ellipse(this.tubeWidth / 2, 0, this.tubeWidth / 2 + 4, 6);
      this.glassRim.fill({ color: 0xFFFFFF, alpha: 0.4 });
      this.glassRim.stroke();
    } else {
      this.draw(); // Reset to normal AAA materials
    }
  }
}
