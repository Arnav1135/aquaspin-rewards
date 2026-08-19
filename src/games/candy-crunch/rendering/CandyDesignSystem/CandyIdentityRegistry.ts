import { CandyColor, CandyShape, SpecialType } from '../../types';
import { CandyMaterialType } from './CandyMaterialFactory';

export interface ProportionProfile {
  width: number;
  height: number;
  depth: number;
  aspectRatio: number;
  visualCenter: number;
}

export interface AnimationProfile {
  idleMotion: 'wobble' | 'spin' | 'sparkle' | 'breathe' | 'light_sweep' | 'micro_rotate';
  fallSpeed: 'slow' | 'normal' | 'fast';
  bounceIntensity: number;
  squashStretch: number;
  matchDeformation: 'squash' | 'stretch' | 'crack' | 'shine' | 'wobble' | 'separate';
}

export interface VFXProfile {
  destructionType: 'gummy_burst' | 'glaze_crack' | 'crystal_sparkle' | 'leaf_fragments' | 'water_droplets' | 'jewel_shards';
  particleColor: number;
  particleCount: number;
}

export interface CandyVisualIdentity {
  id: string;
  colorName: CandyColor;
  shapeFamily: CandyShape;
  materialProfile: CandyMaterialType;
  proportions: ProportionProfile;
  animationProfile: AnimationProfile;
  vfxProfile: VFXProfile;
}

export class CandyIdentityRegistry {
  private static identities = new Map<string, CandyVisualIdentity>();

  public static initializeSignatures() {
    // 1. RED - Strawberry Gummy
    this.register({
      id: 'red_strawberry',
      colorName: 'red',
      shapeFamily: 'teardrop', // A soft teardrop represents strawberry
      materialProfile: 'GUMMY',
      proportions: { width: 0.95, height: 1.1, depth: 0.95, aspectRatio: 0.86, visualCenter: -0.1 },
      animationProfile: {
        idleMotion: 'wobble',
        fallSpeed: 'normal',
        bounceIntensity: 0.6,
        squashStretch: 1.2,
        matchDeformation: 'squash'
      },
      vfxProfile: { destructionType: 'gummy_burst', particleColor: 0xff0033, particleCount: 15 }
    });

    // 2. ORANGE - Citrus Drop
    this.register({
      id: 'orange_citrus',
      colorName: 'orange',
      shapeFamily: 'lozenge', 
      materialProfile: 'GLAZED', // Orange peel glazed
      proportions: { width: 0.85, height: 1.0, depth: 0.85, aspectRatio: 0.85, visualCenter: 0 },
      animationProfile: {
        idleMotion: 'spin',
        fallSpeed: 'fast',
        bounceIntensity: 0.4,
        squashStretch: 1.05,
        matchDeformation: 'crack'
      },
      vfxProfile: { destructionType: 'glaze_crack', particleColor: 0xff8800, particleCount: 20 }
    });

    // 3. YELLOW - Sun Crystal
    this.register({
      id: 'yellow_sun',
      colorName: 'yellow',
      shapeFamily: 'square', // Beveled facets
      materialProfile: 'CRYSTAL',
      proportions: { width: 0.9, height: 0.9, depth: 0.9, aspectRatio: 1.0, visualCenter: 0 },
      animationProfile: {
        idleMotion: 'sparkle',
        fallSpeed: 'fast',
        bounceIntensity: 0.8,
        squashStretch: 1.02,
        matchDeformation: 'crack'
      },
      vfxProfile: { destructionType: 'crystal_sparkle', particleColor: 0xffcc00, particleCount: 25 }
    });

    // 4. GREEN - Leaf Gummy
    this.register({
      id: 'green_leaf',
      colorName: 'green',
      shapeFamily: 'fish', // Utilizing the fish tail structure as a leaf tip
      materialProfile: 'GUMMY',
      proportions: { width: 1.1, height: 0.8, depth: 0.7, aspectRatio: 1.37, visualCenter: 0 },
      animationProfile: {
        idleMotion: 'breathe',
        fallSpeed: 'slow',
        bounceIntensity: 0.3,
        squashStretch: 1.1,
        matchDeformation: 'stretch'
      },
      vfxProfile: { destructionType: 'leaf_fragments', particleColor: 0x00cc44, particleCount: 18 }
    });

    // 5. BLUE - Water Drop
    this.register({
      id: 'blue_drop',
      colorName: 'blue',
      shapeFamily: 'circle', // Flattened droplet
      materialProfile: 'JELLY',
      proportions: { width: 1.05, height: 0.95, depth: 1.05, aspectRatio: 1.1, visualCenter: 0 },
      animationProfile: {
        idleMotion: 'wobble',
        fallSpeed: 'normal',
        bounceIntensity: 0.5,
        squashStretch: 1.3,
        matchDeformation: 'wobble'
      },
      vfxProfile: { destructionType: 'water_droplets', particleColor: 0x00aaff, particleCount: 30 }
    });

    // 6. PURPLE - Crystal Jewel
    this.register({
      id: 'purple_jewel',
      colorName: 'purple',
      shapeFamily: 'jelly-bean', // Will morph slightly
      materialProfile: 'CRYSTAL',
      proportions: { width: 0.95, height: 0.95, depth: 0.8, aspectRatio: 1.0, visualCenter: 0 },
      animationProfile: {
        idleMotion: 'light_sweep',
        fallSpeed: 'fast',
        bounceIntensity: 0.7,
        squashStretch: 1.05,
        matchDeformation: 'crack'
      },
      vfxProfile: { destructionType: 'jewel_shards', particleColor: 0xaa00ff, particleCount: 25 }
    });
  }

  public static register(identity: CandyVisualIdentity) {
    this.identities.set(identity.colorName, identity); // Register base color signatures
  }

  public static getIdentityForColor(color: CandyColor): CandyVisualIdentity {
    if (this.identities.size === 0) this.initializeSignatures();
    return this.identities.get(color) || this.identities.get('red')!;
  }
}
