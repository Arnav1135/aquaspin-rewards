import { ThemeConfig } from '../systems/ThemeManager';

export class BackgroundRegistry {
  private static backgrounds: Record<string, Partial<ThemeConfig>> = {
    'purple_fantasy': {
      backgroundColor: 0x2A1B3D,
      ambientLightColor: 0x9B4DCA,
      particleColors: [0x9B4DCA, 0xFF69B4, 0xFFFFFF]
    },
    'deep_ocean': {
      backgroundColor: 0x001B2E,
      ambientLightColor: 0x00B4D8,
      particleColors: [0x00B4D8, 0x90E0EF, 0xFFFFFF]
    },
    'magical_forest': {
      backgroundColor: 0x132A13,
      ambientLightColor: 0x4F772D,
      particleColors: [0x4F772D, 0x90A955, 0xFFFFFF]
    },
    'sunset': {
      backgroundColor: 0x3D1E2A,
      ambientLightColor: 0x9D4EDD,
      particleColors: [0x9D4EDD, 0xFF7900, 0xFFFFFF]
    },
    'aurora': {
      backgroundColor: 0x011627,
      ambientLightColor: 0x2EC4B6,
      particleColors: [0x2EC4B6, 0x20A4F3, 0xFFFFFF]
    }
  };

  static get(id: string): Partial<ThemeConfig> {
    return this.backgrounds[id] || this.backgrounds['purple_fantasy'];
  }

  static getAllIds(): string[] {
    return Object.keys(this.backgrounds);
  }
}
