import * as PIXI from 'pixi.js';

export interface ThemeConfig {
  id: string;
  name: string;
  isUnlocked: boolean;
  unlockCondition?: string; // Optional text describing how to unlock
  
  // Visuals
  backgroundColor: number;
  ambientLightColor: number;
  glassMaterial: {
    color: number;
    opacity: number;
    thickness: number;
    specular: number;
  };
  liquidPalette: number[];
  
  // Particles
  particleDensityMultiplier: number;
  particleColors: number[];
  
  // Transitions
  transitionDurationMs: number;
}

export class ThemeManager {
  private static themes: Record<string, ThemeConfig> = {
    'Ocean': {
      id: 'Ocean',
      name: 'Deep Ocean',
      isUnlocked: true,
      backgroundColor: 0x0A1A2F,
      ambientLightColor: 0x224466,
      glassMaterial: { color: 0xE0F7FA, opacity: 0.3, thickness: 2, specular: 0.8 },
      liquidPalette: [
        0xFF3B30, // Red
        0xFF9500, // Orange
        0xFFCC00, // Yellow
        0x4CD964, // Green
        0x5AC8FA, // Light Blue
        0x007AFF, // Blue
        0x5856D6, // Purple
        0xFF2D55, // Pink
        0x8E8E93, // Gray
        0x000000, // Black
        0xFFFFFF, // White
        0x8B4513, // Brown
        0x00FF7F, // Spring Green
        0x800080, // Deep Purple
      ],
      particleDensityMultiplier: 1.0,
      particleColors: [0x5AC8FA, 0xFFFFFF],
      transitionDurationMs: 1000
    },
    'Crystal': {
      id: 'Crystal',
      name: 'Crystal Cavern',
      isUnlocked: true,
      backgroundColor: 0x1a0f2e,
      ambientLightColor: 0x4a235a,
      glassMaterial: { color: 0xF3E5F5, opacity: 0.4, thickness: 3, specular: 0.9 },
      liquidPalette: [
        0xFF5252, // Bright Red
        0xFFB142, // Warm Orange
        0xFFEA00, // Bright Yellow
        0x00E676, // Neon Green
        0x00B0FF, // Neon Blue
        0x2979FF, // Deep Blue
        0x651FFF, // Deep Purple
        0xF50057, // Neon Pink
        0x37474F, // Dark Slate
        0xE0E0E0, // Silver
        0xFFA000, // Amber
        0xC6FF00, // Lime
        0x00BFA5, // Teal
        0xD500F9, // Magenta
      ],
      particleDensityMultiplier: 1.5,
      particleColors: [0xD500F9, 0x00B0FF],
      transitionDurationMs: 1200
    },
    'Laboratory': {
      id: 'Laboratory',
      name: 'Sterile Lab',
      isUnlocked: true,
      backgroundColor: 0x2C3E50,
      ambientLightColor: 0x34495E,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.2, thickness: 1, specular: 0.95 },
      liquidPalette: [
        0xE74C3C, 0xE67E22, 0xF1C40F, 0x2ECC71, 
        0x3498DB, 0x2980B9, 0x9B59B6, 0x8E44AD,
        0x1ABC9C, 0x16A085, 0x7F8C8D, 0xBDC3C7,
        0xD35400, 0xC0392B
      ],
      particleDensityMultiplier: 0.5,
      particleColors: [0x2ECC71, 0x3498DB],
      transitionDurationMs: 800
    },
    'Sunset': {
      id: 'Sunset',
      name: 'Sunset Glow',
      isUnlocked: false,
      unlockCondition: 'Clear Difficulty 50',
      backgroundColor: 0x4A148C, // Deep purple sunset
      ambientLightColor: 0xE65100, // Orange glow
      glassMaterial: { color: 0xFFE0B2, opacity: 0.35, thickness: 2, specular: 0.7 },
      liquidPalette: [
        0xFF1744, 0xFF9100, 0xFFEA00, 0x00E676,
        0x00E5FF, 0x2979FF, 0x651FFF, 0xF50057,
        0x455A64, 0xCFD8DC, 0xFF3D00, 0x76FF03,
        0x1DE9B6, 0xD500F9
      ],
      particleDensityMultiplier: 1.2,
      particleColors: [0xFF9100, 0xF50057],
      transitionDurationMs: 1500
    },
    'Cyber': {
      id: 'Cyber',
      name: 'Cyberpunk',
      isUnlocked: false,
      unlockCondition: 'Complete 100 Levels',
      backgroundColor: 0x000000,
      ambientLightColor: 0x00FF00, // Matrix green
      glassMaterial: { color: 0x00FFCC, opacity: 0.5, thickness: 1, specular: 1.0 },
      liquidPalette: [
        0xFF003C, 0xFF6600, 0xFAFA00, 0x00FF33,
        0x00FFFF, 0x0033FF, 0x9900FF, 0xFF00FF,
        0x1A1A1A, 0xCCCCCC, 0xFF9900, 0xCCFF00,
        0x00CC99, 0xCC00FF
      ],
      particleDensityMultiplier: 2.0,
      particleColors: [0x00FF33, 0xFF00FF],
      transitionDurationMs: 800
    }
  };

  private static currentThemeId: string = 'Ocean';
  private static targetBackgroundColor: number = 0x0A1A2F;
  private static currentBackgroundColor: number = 0x0A1A2F;

  public static getTheme(id: string): ThemeConfig {
    return this.themes[id] || this.themes['Ocean'];
  }

  public static getAllThemes(): ThemeConfig[] {
    return Object.values(this.themes);
  }

  public static setTheme(id: string, app?: PIXI.Application) {
    if (this.themes[id]) {
      this.currentThemeId = id;
      this.targetBackgroundColor = this.themes[id].backgroundColor;
      
      // If we have access to the app, we can immediately start the transition
      // We will handle color blending in a ticker or just snap for simplicity if no app provided
      if (!app) {
        this.currentBackgroundColor = this.targetBackgroundColor;
      }
    }
  }

  public static updateTransition(app: PIXI.Application, delta: number) {
    if (this.currentBackgroundColor !== this.targetBackgroundColor) {
      // Lerp background color
      const current = PIXI.Color.shared.setValue(this.currentBackgroundColor).toArray();
      const target = PIXI.Color.shared.setValue(this.targetBackgroundColor).toArray();
      
      const speed = 0.05 * delta;
      
      const r = current[0] + (target[0] - current[0]) * speed;
      const g = current[1] + (target[1] - current[1]) * speed;
      const b = current[2] + (target[2] - current[2]) * speed;
      
      this.currentBackgroundColor = new PIXI.Color([r, g, b]).toNumber();
      app.renderer.background.color = this.currentBackgroundColor;
      
      // Stop lerping if very close
      if (Math.abs(target[0] - r) < 0.01 && Math.abs(target[1] - g) < 0.01 && Math.abs(target[2] - b) < 0.01) {
        this.currentBackgroundColor = this.targetBackgroundColor;
        app.renderer.background.color = this.targetBackgroundColor;
      }
    }
  }

  public static checkUnlocks(stats: { totalSolved: number, highestDifficultyCleared: number }) {
    if (stats.highestDifficultyCleared >= 50) {
      this.themes['Sunset'].isUnlocked = true;
    }
    if (stats.totalSolved >= 100) {
      this.themes['Cyber'].isUnlocked = true;
    }
  }
}
