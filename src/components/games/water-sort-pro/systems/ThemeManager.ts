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
    'Theme0': {
      id: 'Theme0', name: 'Soft Sky', isUnlocked: true,
      backgroundColor: 0xF0F4F8, ambientLightColor: 0xFFFFFF,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.6, thickness: 2, specular: 0.5 },
      liquidPalette: [0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 0x8E8E93, 0x000000, 0x8B4513, 0x00FF7F, 0x800080, 0x333333],
      particleDensityMultiplier: 0.5, particleColors: [0xFFFFFF], transitionDurationMs: 1000
    },
    'Theme1': {
      id: 'Theme1', name: 'Fresh Mint', isUnlocked: true,
      backgroundColor: 0xE8F5E9, ambientLightColor: 0xFFFFFF,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.6, thickness: 2, specular: 0.5 },
      liquidPalette: [0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 0x8E8E93, 0x000000, 0x8B4513, 0x00FF7F, 0x800080, 0x333333],
      particleDensityMultiplier: 0.5, particleColors: [0xA5D6A7], transitionDurationMs: 1000
    },
    'Theme2': {
      id: 'Theme2', name: 'Warm Cream', isUnlocked: true,
      backgroundColor: 0xFFF8E1, ambientLightColor: 0xFFFFFF,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.6, thickness: 2, specular: 0.5 },
      liquidPalette: [0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 0x8E8E93, 0x000000, 0x8B4513, 0x00FF7F, 0x800080, 0x333333],
      particleDensityMultiplier: 0.5, particleColors: [0xFFE082], transitionDurationMs: 1000
    },
    'Theme3': {
      id: 'Theme3', name: 'Lavender Mist', isUnlocked: true,
      backgroundColor: 0xF3E5F5, ambientLightColor: 0xFFFFFF,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.6, thickness: 2, specular: 0.5 },
      liquidPalette: [0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 0x8E8E93, 0x000000, 0x8B4513, 0x00FF7F, 0x800080, 0x333333],
      particleDensityMultiplier: 0.5, particleColors: [0xCE93D8], transitionDurationMs: 1000
    },
    'Theme4': {
      id: 'Theme4', name: 'Ice Blue', isUnlocked: true,
      backgroundColor: 0xE0F7FA, ambientLightColor: 0xFFFFFF,
      glassMaterial: { color: 0xFFFFFF, opacity: 0.6, thickness: 2, specular: 0.5 },
      liquidPalette: [0xFF3B30, 0xFF9500, 0xFFCC00, 0x4CD964, 0x5AC8FA, 0x007AFF, 0x5856D6, 0xFF2D55, 0x8E8E93, 0x000000, 0x8B4513, 0x00FF7F, 0x800080, 0x333333],
      particleDensityMultiplier: 0.5, particleColors: [0x80DEEA], transitionDurationMs: 1000
    }
  };

  private static currentThemeId: string = 'Theme0';
  private static targetBackgroundColor: number = 0xF0F4F8;
  private static currentBackgroundColor: number = 0xF0F4F8;

  public static getThemeForLevel(level: number): ThemeConfig {
    const LEVELS_PER_THEME = 10;
    // level is 1-indexed, so we do level - 1
    const themeIndex = Math.floor(Math.max(0, level - 1) / LEVELS_PER_THEME);
    const themeKeys = Object.keys(this.themes);
    const selectedKey = themeKeys[themeIndex % themeKeys.length];
    return this.themes[selectedKey];
  }

  public static getTheme(id: string): ThemeConfig {
    return this.themes[id] || this.themes['Theme0'];
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
      const current = new PIXI.Color(this.currentBackgroundColor).toArray();
      const target = new PIXI.Color(this.targetBackgroundColor).toArray();
      
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
