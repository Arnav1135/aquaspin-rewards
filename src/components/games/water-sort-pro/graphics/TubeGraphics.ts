import { Graphics, Container } from 'pixi.js';
import { ThemeManager } from '../systems/ThemeManager';
import { useGameState } from '../state/useGameState';
import { VesselDefinition, VesselRegistry } from '../registries/VesselRegistry';

export class TubeGraphics extends Container {
  public vesselDef: VesselDefinition;
  public tubeWidth: number;
  public tubeHeight: number;
  private backgroundGlass: Graphics;
  private glassRim: Graphics;
  private highlight: Graphics;
  private reflection: Graphics;
  private ambientOcclusion: Graphics;

  constructor(vesselDef: VesselDefinition, width: number, height: number) {
    super();
    this.vesselDef = vesselDef;
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

    // AAA Gyroscope Lighting
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', this.handleGyroscope);
    }
  }

  private handleGyroscope = (e: DeviceOrientationEvent) => {
    // gamma is the left-to-right tilt in degrees, where right is positive
    const gamma = e.gamma || 0; 
    
    // clamp between -45 and 45 degrees
    const tilt = Math.max(-45, Math.min(45, gamma));
    
    // Normalize to -1 to 1
    const normalizedTilt = tilt / 45;

    // Shift reflection left/right based on tilt
    const w = this.tubeWidth;
    const centerOffset = w * 0.15;
    const maxShift = w * 0.15;
    
    import('gsap').then(gsap => {
      gsap.default.to(this.reflection, {
        x: normalizedTilt * maxShift,
        duration: 0.1,
        ease: 'power1.out'
      });
    });
  };

  public destroy(options?: any) {
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.removeEventListener('deviceorientation', this.handleGyroscope);
    }
    super.destroy(options);
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
    
    const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
    const thickness = activeTheme.glassMaterial.thickness || 6;
    const glassColor = activeTheme.glassMaterial.color;
    const glassOpacity = activeTheme.glassMaterial.opacity;

    // Clear everything
    this.backgroundGlass.clear();
    this.glassRim.clear();
    this.highlight.clear();
    this.reflection.clear();

    // Use registry to draw the vessel
    if (this.vesselDef && this.vesselDef.drawGlass) {
      this.vesselDef.drawGlass(this.backgroundGlass, w, h, thickness, glassColor, glassOpacity);
    }
    
    // Default or custom highlight
    if (this.vesselDef && this.vesselDef.drawHighlight) {
      this.vesselDef.drawHighlight(this.highlight, w, h);
    }
  }

  private glowTween: gsap.core.Tween | null = null;
  private glowActive: boolean = false;

  public setHighlight(active: boolean, color: number = 0xFFFFFF) {
    if (this.glowActive === active) return;
    this.glowActive = active;
    
    if (active) {
      // Premium Selection Glow Outline
      this.backgroundGlass.clear();
      
      // Draw base glass underneath
      const activeTheme = ThemeManager.getTheme(useGameState.getState().theme);
      const thickness = activeTheme.glassMaterial.thickness || 6;
      const glassColor = activeTheme.glassMaterial.color;
      const glassOpacity = activeTheme.glassMaterial.opacity;
      
      if (this.vesselDef && this.vesselDef.drawGlass) {
        this.vesselDef.drawGlass(this.backgroundGlass, this.tubeWidth, this.tubeHeight, thickness, glassColor, glassOpacity);
      }
      
      // Draw outer glowing halo using multiple strokes
      const drawGlow = (w: number, a: number) => {
        // Approximate glow for custom shapes by just thickening stroke on the original path
        if (this.vesselDef && this.vesselDef.drawGlass) {
          this.vesselDef.drawGlass(this.backgroundGlass, this.tubeWidth, this.tubeHeight, thickness + w, color, a);
        }
      };
      
      // Core bright line
      drawGlow(4, 0.9);
      // Outer soft glow
      drawGlow(12, 0.4);
      // Atmospheric outer halo
      drawGlow(24, 0.15);
      
      // Subtle breathing pulse
      if (this.glowTween) this.glowTween.kill();
      // We animate the alpha of the whole glass container slightly
      this.backgroundGlass.alpha = 0.7;
      this.glowTween = gsap.to(this.backgroundGlass, {
        alpha: 1.0,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      });
    } else {
      if (this.glowTween) {
        this.glowTween.kill();
        this.glowTween = null;
      }
      this.backgroundGlass.alpha = 1.0;
      this.draw(); // Reset to normal AAA materials
    }
  }
}
