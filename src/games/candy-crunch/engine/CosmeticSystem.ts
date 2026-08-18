export interface CosmeticTheme {
  id: string;
  name: string;
  candyMaterials: 'standard' | 'glass' | 'neon' | 'matte';
  particleTheme: 'sparkles' | 'stars' | 'confetti';
  boardStyle: 'classic' | 'floating' | 'grid';
}

export class CosmeticSystem {
  private static currentTheme: CosmeticTheme = {
    id: 'default',
    name: 'Classic Candy',
    candyMaterials: 'standard',
    particleTheme: 'sparkles',
    boardStyle: 'classic'
  };

  public static getTheme(): CosmeticTheme {
    return this.currentTheme;
  }

  public static setTheme(theme: Partial<CosmeticTheme>) {
    this.currentTheme = { ...this.currentTheme, ...theme };
    // This could trigger an event that GameScene and CandyMesh listen to 
    // to dynamically hot-swap materials and environments without unmounting.
    console.log(`[CosmeticSystem] Applied theme changes:`, theme);
  }
}
