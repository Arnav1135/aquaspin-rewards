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
  destructionType: 'gummy_burst' | 'glass_shards' | 'crystal_sparkle' | 'splash' | 'sticky_burst' | 'spark_explosion';
  particleColor: number;
  particleCount: number;
}

export interface CandyVisualIdentity {
  id: string;
  name: string;
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
    this.register({
      id: 'red_ruby', name: 'Ruby Crystal', colorName: 'red', shapeFamily: 'square', materialProfile: 'CRYSTAL',
      proportions: { width: 0.9, height: 0.9, depth: 0.9, aspectRatio: 1.0, visualCenter: 0 },
      animationProfile: { idleMotion: 'sparkle', fallSpeed: 'fast', bounceIntensity: 0.8, squashStretch: 1.02, matchDeformation: 'crack' },
      vfxProfile: { destructionType: 'glass_shards', particleColor: 0xff1133, particleCount: 25 }
    });

    this.register({
      id: 'blue_blueberry', name: 'Blueberry Glass', colorName: 'blue', shapeFamily: 'circle', materialProfile: 'GLASS',
      proportions: { width: 1.0, height: 1.0, depth: 1.0, aspectRatio: 1.0, visualCenter: 0 },
      animationProfile: { idleMotion: 'light_sweep', fallSpeed: 'normal', bounceIntensity: 0.5, squashStretch: 1.05, matchDeformation: 'crack' },
      vfxProfile: { destructionType: 'glass_shards', particleColor: 0x2266ff, particleCount: 30 }
    });

    this.register({
      id: 'green_mint', name: 'Mint Jelly', colorName: 'green', shapeFamily: 'lozenge', materialProfile: 'JELLY',
      proportions: { width: 1.0, height: 0.8, depth: 0.9, aspectRatio: 1.25, visualCenter: 0 },
      animationProfile: { idleMotion: 'wobble', fallSpeed: 'slow', bounceIntensity: 0.3, squashStretch: 1.3, matchDeformation: 'wobble' },
      vfxProfile: { destructionType: 'splash', particleColor: 0x33ff66, particleCount: 20 }
    });

    this.register({
      id: 'yellow_honey', name: 'Honey Drop', colorName: 'yellow', shapeFamily: 'teardrop', materialProfile: 'CANDY',
      proportions: { width: 0.85, height: 1.1, depth: 0.85, aspectRatio: 0.77, visualCenter: -0.1 },
      animationProfile: { idleMotion: 'breathe', fallSpeed: 'slow', bounceIntensity: 0.4, squashStretch: 1.2, matchDeformation: 'stretch' },
      vfxProfile: { destructionType: 'sticky_burst', particleColor: 0xffcc00, particleCount: 15 }
    });

    this.register({
      id: 'purple_grape', name: 'Grape Gem', colorName: 'purple', shapeFamily: 'fish', materialProfile: 'GEM',
      proportions: { width: 1.05, height: 0.85, depth: 0.85, aspectRatio: 1.23, visualCenter: 0 },
      animationProfile: { idleMotion: 'light_sweep', fallSpeed: 'fast', bounceIntensity: 0.7, squashStretch: 1.01, matchDeformation: 'crack' },
      vfxProfile: { destructionType: 'spark_explosion', particleColor: 0xaa22ff, particleCount: 35 }
    });

    this.register({
      id: 'orange_citrus', name: 'Orange Citrus', colorName: 'orange', shapeFamily: 'jelly-bean', materialProfile: 'GUMMY',
      proportions: { width: 0.95, height: 0.95, depth: 0.95, aspectRatio: 1.0, visualCenter: 0 },
      animationProfile: { idleMotion: 'spin', fallSpeed: 'normal', bounceIntensity: 0.6, squashStretch: 1.15, matchDeformation: 'squash' },
      vfxProfile: { destructionType: 'gummy_burst', particleColor: 0xff7700, particleCount: 20 }
    });
  }

  public static register(identity: CandyVisualIdentity) {
    this.identities.set(identity.colorName, identity);
  }

  public static getIdentityForColor(color: CandyColor): CandyVisualIdentity {
    if (this.identities.size === 0) this.initializeSignatures();
    return this.identities.get(color) || this.identities.get('red')!;
  }
}
