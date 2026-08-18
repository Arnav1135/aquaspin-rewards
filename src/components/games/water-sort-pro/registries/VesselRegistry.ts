export type VesselShapeType = 'normal' | 'bottle' | 'vase' | 'flask' | 'special';

export interface VesselDefinition {
  id: string;
  name: string;
  shapeType: VesselShapeType;
  // Normalized dimensions to fit in layout
  logicalWidth: number;
  logicalHeight: number;
  // The path data for clipping the liquid (for Graphics drawing)
  // We can represent this with a drawing function or path data
  drawGlass: (g: any, w: number, h: number, thickness: number, color: number, opacity: number) => void;
  drawMask: (g: any, w: number, h: number) => void;
  drawHighlight?: (g: any, w: number, h: number) => void;
  capacityMultiplier: number; // 1.0 for normal, 2.0 for special large, etc.
}

export class VesselRegistry {
  private static vessels: Record<string, VesselDefinition> = {};

  static register(vessel: VesselDefinition) {
    this.vessels[vessel.id] = vessel;
  }

  static get(id: string): VesselDefinition {
    return this.vessels[id] || this.vessels['classic_tube'];
  }

  static getAll(): VesselDefinition[] {
    return Object.values(this.vessels);
  }

  static getByType(type: VesselShapeType): VesselDefinition[] {
    return Object.values(this.vessels).filter(v => v.shapeType === type);
  }
}

// Register classic test tube
VesselRegistry.register({
  id: 'classic_tube',
  name: 'Classic Test Tube',
  shapeType: 'normal',
  logicalWidth: 60,
  logicalHeight: 240,
  capacityMultiplier: 1.0,
  drawGlass: (g, w, h, thickness, color, opacity) => {
    const r = w / 2;
    g.moveTo(0, 0);
    g.lineTo(0, h - r);
    g.arc(r, h - r, r, Math.PI, 0, true);
    g.lineTo(w, 0);
    g.fill({ color, alpha: opacity * 0.3 });
    g.stroke({ width: thickness, color, alpha: opacity, join: 'round', cap: 'round' });
  },
  drawMask: (g, w, h) => {
    const r = w / 2;
    g.roundRect(2, 2, w - 4, h - 4, Math.max(0, r - 2));
  },
  drawHighlight: (g, w, h) => {
    const r = w / 2;
    // Rim
    g.ellipse(w / 2, 0, w / 2 + 3, 4);
    g.fill({ color: 0xFFFFFF, alpha: 0.2 });
    g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9, join: 'round', cap: 'round' });
    
    // Side reflections
    g.rect(0, 5, 4, h - r);
    g.fill({ color: 0xFFFFFF, alpha: 0.4 });
    g.rect(w - 4, 5, 4, h - r);
    g.fill({ color: 0xFFFFFF, alpha: 0.4 });

    // Inner curve
    g.roundRect(w * 0.15, h * 0.02, w * 0.15, h * 0.85, w * 0.1);
    g.fill({ color: 0xFFFFFF, alpha: 0.2 });
  }
});

// Register Glass Bottle
VesselRegistry.register({
  id: 'glass_bottle',
  name: 'Glass Bottle',
  shapeType: 'bottle',
  logicalWidth: 70,
  logicalHeight: 220,
  capacityMultiplier: 1.0,
  drawGlass: (g, w, h, thickness, color, opacity) => {
    const neckW = w * 0.4;
    const neckX = (w - neckW) / 2;
    const neckH = h * 0.3;
    const shoulderR = 15;
    const bottomR = 10;
    
    g.moveTo(neckX, 0);
    g.lineTo(neckX, neckH);
    // Shoulder left
    g.arc(neckX - shoulderR, neckH + shoulderR, shoulderR, 0, Math.PI/2, false);
    g.lineTo(0, h - bottomR);
    // Bottom left
    g.arc(bottomR, h - bottomR, bottomR, Math.PI, Math.PI/2, true);
    g.lineTo(w - bottomR, h);
    // Bottom right
    g.arc(w - bottomR, h - bottomR, bottomR, Math.PI/2, 0, true);
    g.lineTo(w, neckH + shoulderR);
    // Shoulder right
    g.arc(neckX + neckW + shoulderR, neckH + shoulderR, shoulderR, Math.PI/2, Math.PI, false);
    g.lineTo(neckX + neckW, 0);

    g.fill({ color, alpha: opacity * 0.3 });
    g.stroke({ width: thickness, color, alpha: opacity, join: 'round' });
  },
  drawMask: (g, w, h) => {
    const neckW = w * 0.4 - 4;
    const neckX = (w - neckW) / 2;
    const neckH = h * 0.3;
    const shoulderR = 13;
    const bottomR = 8;
    
    g.moveTo(neckX, 2);
    g.lineTo(neckX, neckH);
    g.arc(neckX - shoulderR, neckH + shoulderR, shoulderR, 0, Math.PI/2, false);
    g.lineTo(2, h - bottomR - 2);
    g.arc(bottomR + 2, h - bottomR - 2, bottomR, Math.PI, Math.PI/2, true);
    g.lineTo(w - bottomR - 2, h - 2);
    g.arc(w - bottomR - 2, h - bottomR - 2, bottomR, Math.PI/2, 0, true);
    g.lineTo(w - 2, neckH + shoulderR);
    g.arc(neckX + neckW + shoulderR, neckH + shoulderR, shoulderR, Math.PI/2, Math.PI, false);
    g.lineTo(neckX + neckW, 2);
    g.closePath();
  },
  drawHighlight: (g, w, h) => {
    const neckW = w * 0.4;
    // Rim
    g.ellipse(w / 2, 0, neckW / 2 + 3, 3);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });
    
    // Side reflection
    g.roundRect(w * 0.1, h * 0.35, w * 0.1, h * 0.5, w * 0.05);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
  }
});

// Register Glass Vase
VesselRegistry.register({
  id: 'glass_vase',
  name: 'Glass Vase',
  shapeType: 'vase',
  logicalWidth: 80,
  logicalHeight: 200,
  capacityMultiplier: 1.0,
  drawGlass: (g, w, h, thickness, color, opacity) => {
    const neckW = w * 0.4;
    const neckX = (w - neckW) / 2;
    const neckH = h * 0.2;
    const vaseW = w;
    const vaseX = 0;
    
    g.moveTo(neckX, 0);
    g.lineTo(neckX, neckH);
    g.quadraticCurveTo(vaseX, h * 0.5, vaseX + w * 0.1, h - 10);
    g.quadraticCurveTo(vaseX + w * 0.5, h, vaseX + w - w * 0.1, h - 10);
    g.quadraticCurveTo(vaseX + w, h * 0.5, neckX + neckW, neckH);
    g.lineTo(neckX + neckW, 0);

    g.fill({ color, alpha: opacity * 0.3 });
    g.stroke({ width: thickness, color, alpha: opacity, join: 'round' });
  },
  drawMask: (g, w, h) => {
    const neckW = w * 0.4 - 4;
    const neckX = (w - neckW) / 2;
    const neckH = h * 0.2;
    const vaseW = w - 4;
    const vaseX = 2;
    
    g.moveTo(neckX, 2);
    g.lineTo(neckX, neckH);
    g.quadraticCurveTo(vaseX, h * 0.5, vaseX + w * 0.1, h - 12);
    g.quadraticCurveTo(vaseX + w * 0.5, h - 2, vaseX + w - w * 0.1, h - 12);
    g.quadraticCurveTo(vaseX + w - 2, h * 0.5, neckX + neckW, neckH);
    g.lineTo(neckX + neckW, 2);
    g.closePath();
  },
  drawHighlight: (g, w, h) => {
    const neckW = w * 0.4;
    // Rim
    g.ellipse(w / 2, 0, neckW / 2 + 3, 3);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    g.stroke({ width: 2, color: 0xFFFFFF, alpha: 0.9 });
    
    // Side reflection
    g.roundRect(w * 0.15, h * 0.3, w * 0.1, h * 0.5, w * 0.05);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
  }
});

// Register Special Heart Container
VesselRegistry.register({
  id: 'heart_container',
  name: 'Heart Container',
  shapeType: 'special',
  logicalWidth: 160,
  logicalHeight: 160,
  capacityMultiplier: 2.0, // Double capacity
  drawGlass: (g, w, h, thickness, color, opacity) => {
    // Heart shape math
    g.moveTo(w / 2, h * 0.3);
    g.bezierCurveTo(w / 2, h * 0.1, 0, 0, 0, h * 0.4);
    g.bezierCurveTo(0, h * 0.6, w / 2, h * 0.85, w / 2, h);
    g.bezierCurveTo(w / 2, h * 0.85, w, h * 0.6, w, h * 0.4);
    g.bezierCurveTo(w, 0, w / 2, h * 0.1, w / 2, h * 0.3);

    g.fill({ color, alpha: opacity * 0.3 });
    g.stroke({ width: thickness, color, alpha: opacity, join: 'round' });
  },
  drawMask: (g, w, h) => {
    // Inner heart shape
    g.moveTo(w / 2, h * 0.3 + 2);
    g.bezierCurveTo(w / 2, h * 0.1 + 2, 2, 2, 2, h * 0.4);
    g.bezierCurveTo(2, h * 0.6, w / 2, h * 0.85 - 2, w / 2, h - 2);
    g.bezierCurveTo(w / 2, h * 0.85 - 2, w - 2, h * 0.6, w - 2, h * 0.4);
    g.bezierCurveTo(w - 2, 2, w / 2, h * 0.1 + 2, w / 2, h * 0.3 + 2);
    g.closePath();
  },
  drawHighlight: (g, w, h) => {
    // Rim
    g.ellipse(w * 0.25, h * 0.15, w * 0.15, h * 0.05);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    g.ellipse(w * 0.75, h * 0.15, w * 0.15, h * 0.05);
    g.fill({ color: 0xFFFFFF, alpha: 0.3 });
    
    // Gloss
    g.moveTo(w * 0.1, h * 0.4);
    g.quadraticCurveTo(w * 0.1, h * 0.6, w * 0.4, h * 0.8);
    g.stroke({ width: 4, color: 0xFFFFFF, alpha: 0.4, join: 'round' });
  }
});
