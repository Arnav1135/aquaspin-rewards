export type MaterialKind = 
  | 'CANDY'
  | 'GUMMY'
  | 'JELLY'
  | 'CHOCOLATE'
  | 'GLASS'
  | 'WATER'
  | 'ICE'
  | 'CRYSTAL'
  | 'METAL'
  | 'WOOD'
  | 'STONE'
  | 'SAND'
  | 'RUBBER';

export interface ResponseCurve {
  subtle: number;
  visible: number;
  strong: number;
  cinematic: number;
}

export interface PhysicalResponseProfile {
  elasticity: number;
  stiffness: number;
  friction: number;
  damping: number;
  breakThreshold: number;
  deformationStrength: number;
  particleResponse: string;
  audioResponse: string;
  cameraResponse?: string;
  cameraProfile?: string;
  lightingResponse: string;
  deformationCurve: ResponseCurve;
  particleCurve: ResponseCurve;
  soundCurve: ResponseCurve;
  cameraCurve: ResponseCurve;
  lightCurve: ResponseCurve;
}

const DEFAULT_CURVES = {
  deformationCurve: { subtle: 0.1, visible: 0.4, strong: 0.8, cinematic: 1.0 },
  particleCurve: { subtle: 0.0, visible: 0.3, strong: 0.7, cinematic: 1.2 },
  soundCurve: { subtle: 0.2, visible: 0.5, strong: 0.8, cinematic: 1.0 },
  cameraCurve: { subtle: 0.0, visible: 0.2, strong: 0.6, cinematic: 1.5 },
  lightCurve: { subtle: 0.0, visible: 0.2, strong: 0.8, cinematic: 1.5 },
};

export class MaterialReactionEngine {
  private static profiles: Record<MaterialKind, PhysicalResponseProfile> = {
    CANDY: {
      elasticity: 0.5, stiffness: 150, friction: 0.3, damping: 12, breakThreshold: 0.8, deformationStrength: 0.3,
      particleResponse: 'sugar_dust', audioResponse: 'candy_crunch', cameraProfile: 'soft_micro_punch', lightingResponse: 'color_tint_flash',
      ...DEFAULT_CURVES,
    },
    GUMMY: {
      elasticity: 0.85, stiffness: 70, friction: 0.5, damping: 6, breakThreshold: 1.0, deformationStrength: 0.9,
      particleResponse: 'gummy_droplets', audioResponse: 'squish_bounce', cameraProfile: 'bouncy_camera_punch', lightingResponse: 'subtle_glow',
      ...DEFAULT_CURVES,
      deformationCurve: { subtle: 0.3, visible: 0.6, strong: 1.0, cinematic: 1.5 },
    },
    JELLY: {
      elasticity: 0.9, stiffness: 40, friction: 0.1, damping: 4, breakThreshold: 0.95, deformationStrength: 1.0,
      particleResponse: 'jelly_splatters', audioResponse: 'wobble_squish', cameraProfile: 'fluid_shake', lightingResponse: 'internal_transmission_glow',
      ...DEFAULT_CURVES,
      deformationCurve: { subtle: 0.4, visible: 0.8, strong: 1.2, cinematic: 2.0 },
    },
    CHOCOLATE: {
      elasticity: 0.2, stiffness: 220, friction: 0.4, damping: 20, breakThreshold: 0.6, deformationStrength: 0.4,
      particleResponse: 'cocoa_crumbs', audioResponse: 'dull_thud', cameraProfile: 'soft_micro_punch', lightingResponse: 'warm_ambient_boost',
      ...DEFAULT_CURVES,
    },
    GLASS: {
      elasticity: 0.1, stiffness: 450, friction: 0.1, damping: 30, breakThreshold: 0.4, deformationStrength: 0.05,
      particleResponse: 'glass_shards', audioResponse: 'glass_shatter', cameraProfile: 'sharp_punch', lightingResponse: 'specular_glare',
      ...DEFAULT_CURVES,
      particleCurve: { subtle: 0.0, visible: 0.5, strong: 1.2, cinematic: 2.5 },
      cameraCurve: { subtle: 0.1, visible: 0.4, strong: 1.0, cinematic: 2.0 },
    },
    WATER: {
      elasticity: 0.95, stiffness: 30, friction: 0.02, damping: 3, breakThreshold: 1.0, deformationStrength: 1.2,
      particleResponse: 'water_splash_droplets', audioResponse: 'liquid_splash', cameraProfile: 'ripple_shake', lightingResponse: 'caustic_refraction',
      ...DEFAULT_CURVES,
      particleCurve: { subtle: 0.2, visible: 0.6, strong: 1.5, cinematic: 3.0 },
    },
    ICE: {
      elasticity: 0.25, stiffness: 380, friction: 0.03, damping: 22, breakThreshold: 0.35, deformationStrength: 0.1,
      particleResponse: 'ice_frost_shards', audioResponse: 'ice_crack', cameraProfile: 'medium_punch', lightingResponse: 'cyan_glow_flash',
      ...DEFAULT_CURVES,
    },
    CRYSTAL: {
      elasticity: 0.3, stiffness: 480, friction: 0.15, damping: 28, breakThreshold: 0.5, deformationStrength: 0.02,
      particleResponse: 'prismatic_sparkles', audioResponse: 'crystal_chime', cameraProfile: 'sharp_punch', lightingResponse: 'refractive_burst',
      ...DEFAULT_CURVES,
      lightCurve: { subtle: 0.2, visible: 0.5, strong: 1.2, cinematic: 2.0 },
    },
    METAL: {
      elasticity: 0.8, stiffness: 500, friction: 0.2, damping: 18, breakThreshold: 1.0, deformationStrength: 0.1,
      particleResponse: 'sparks', audioResponse: 'metal_ping', cameraProfile: 'heavy_punch', lightingResponse: 'bright_flash',
      ...DEFAULT_CURVES,
      particleCurve: { subtle: 0.0, visible: 0.2, strong: 1.0, cinematic: 2.0 },
      soundCurve: { subtle: 0.3, visible: 0.7, strong: 1.0, cinematic: 1.5 },
    },
    WOOD: {
      elasticity: 0.4, stiffness: 180, friction: 0.4, damping: 15, breakThreshold: 0.65, deformationStrength: 0.2,
      particleResponse: 'splinters', audioResponse: 'wood_clack', cameraProfile: 'micro_punch', lightingResponse: 'amber_glow',
      ...DEFAULT_CURVES,
    },
    STONE: {
      elasticity: 0.15, stiffness: 460, friction: 0.6, damping: 32, breakThreshold: 0.55, deformationStrength: 0.05,
      particleResponse: 'stone_dust', audioResponse: 'heavy_thud', cameraProfile: 'heavy_shake', lightingResponse: 'ambient_dim',
      ...DEFAULT_CURVES,
      cameraCurve: { subtle: 0.1, visible: 0.3, strong: 1.0, cinematic: 2.0 },
    },
    SAND: {
      elasticity: 0.05, stiffness: 20, friction: 0.85, damping: 45, breakThreshold: 1.0, deformationStrength: 1.5,
      particleResponse: 'sand_cloud', audioResponse: 'sand_crunch', cameraProfile: 'subtle_drift', lightingResponse: 'diffuse_glow',
      ...DEFAULT_CURVES,
    },
    RUBBER: {
      elasticity: 0.98, stiffness: 100, friction: 0.7, damping: 5, breakThreshold: 1.0, deformationStrength: 0.8,
      particleResponse: 'tiny_rubber_sparks', audioResponse: 'rubber_boing', cameraProfile: 'spring_punch', lightingResponse: 'soft_flash',
      ...DEFAULT_CURVES,
      deformationCurve: { subtle: 0.2, visible: 0.6, strong: 1.2, cinematic: 2.0 },
    },
  };

  public static getProfile(kind: MaterialKind): PhysicalResponseProfile {
    return this.profiles[kind] || this.profiles.CANDY;
  }
}
