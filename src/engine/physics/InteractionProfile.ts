import { UniversalMaterialType } from './InteractionEvents';

export interface InteractionProfile {
  materialType: UniversalMaterialType;
  mass: number;             // kg
  stiffness: number;        // spring stiffness N/m
  elasticity: number;       // restitution 0.0 - 1.0
  friction: number;         // friction coefficient
  damping: number;          // damping coefficient
  vfxProfile: string;       // identifier for particle behavior
  audioProfile: string;     // identifier for audio synthesis
  cameraProfile: string;    // identifier for shake/punch response
  lightingProfile: string;  // identifier for reactive illumination
}

export const MATERIAL_INTERACTION_PROFILES: Record<UniversalMaterialType, InteractionProfile> = {
  CANDY: {
    materialType: 'CANDY',
    mass: 0.15,
    stiffness: 120,
    elasticity: 0.5,
    friction: 0.3,
    damping: 12,
    vfxProfile: 'sugar_dust_burst',
    audioProfile: 'candy_confectionery_pop',
    cameraProfile: 'soft_micro_punch',
    lightingProfile: 'subtle_color_glow',
  },
  GLASS: {
    materialType: 'GLASS',
    mass: 0.8,
    stiffness: 400,
    elasticity: 0.1,
    friction: 0.1,
    damping: 25,
    vfxProfile: 'glass_shards_fracture',
    audioProfile: 'glass_resonate_crack',
    cameraProfile: 'sharp_camera_punch',
    lightingProfile: 'specular_flash',
  },
  WATER: {
    materialType: 'WATER',
    mass: 1.0,
    stiffness: 60,
    elasticity: 0.8,
    friction: 0.05,
    damping: 8,
    vfxProfile: 'water_splash_droplets',
    audioProfile: 'liquid_splash_resonance',
    cameraProfile: 'fluid_ripple_shake',
    lightingProfile: 'refractive_caustics',
  },
  ICE: {
    materialType: 'ICE',
    mass: 0.9,
    stiffness: 350,
    elasticity: 0.2,
    friction: 0.02,
    damping: 20,
    vfxProfile: 'ice_frost_shards',
    audioProfile: 'ice_crack_shatter',
    cameraProfile: 'medium_camera_punch',
    lightingProfile: 'cyan_glow_flash',
  },
  METAL: {
    materialType: 'METAL',
    mass: 2.5,
    stiffness: 500,
    elasticity: 0.85,
    friction: 0.2,
    damping: 18,
    vfxProfile: 'sparks_metal_clash',
    audioProfile: 'metallic_ping_resonance',
    cameraProfile: 'heavy_camera_punch',
    lightingProfile: 'bright_white_flash',
  },
  STONE: {
    materialType: 'STONE',
    mass: 3.0,
    stiffness: 450,
    elasticity: 0.15,
    friction: 0.6,
    damping: 30,
    vfxProfile: 'stone_dust_debris',
    audioProfile: 'heavy_thud_impact',
    cameraProfile: 'heavy_screen_shake',
    lightingProfile: 'ambient_shadow_dim',
  },
  WOOD: {
    materialType: 'WOOD',
    mass: 0.6,
    stiffness: 200,
    elasticity: 0.4,
    friction: 0.4,
    damping: 15,
    vfxProfile: 'wood_chips_splinters',
    audioProfile: 'hollow_wood_clack',
    cameraProfile: 'soft_micro_punch',
    lightingProfile: 'warm_amber_glow',
  },
  SAND: {
    materialType: 'SAND',
    mass: 1.2,
    stiffness: 50,
    elasticity: 0.05,
    friction: 0.8,
    damping: 40,
    vfxProfile: 'sand_displacement_cloud',
    audioProfile: 'soft_sand_crunch',
    cameraProfile: 'subtle_drift',
    lightingProfile: 'diffuse_dust_glow',
  },
};
