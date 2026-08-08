export type AquaSpinQuality = 'auto' | 'ultra' | 'high' | 'medium' | 'low';

export interface RenderQualityProfile {
  quality: Exclude<AquaSpinQuality, 'auto'>;
  pixelRatioCap: number;
  shadowMapSize: number;
  enablePostProcessing: boolean;
  enableSSR: boolean;
  enableGodRays: boolean;
  enableDepthOfField: boolean;
  enableChromaticAberration: boolean;
  enableBloom: boolean;
  maxParticles: number;
  shadowType: 'basic' | 'soft';
}

export const RENDER_QUALITY_PROFILES: Record<Exclude<AquaSpinQuality, 'auto'>, RenderQualityProfile> = {
  ultra: {
    quality: 'ultra',
    pixelRatioCap: 2,
    shadowMapSize: 4096,
    enablePostProcessing: true,
    enableSSR: true,
    enableGodRays: true,
    enableDepthOfField: true,
    enableChromaticAberration: false,
    enableBloom: true,
    maxParticles: 4000,
    shadowType: 'soft',
  },
  high: {
    quality: 'high',
    pixelRatioCap: 1.75,
    shadowMapSize: 2048,
    enablePostProcessing: true,
    enableSSR: true,
    enableGodRays: false,
    enableDepthOfField: true,
    enableChromaticAberration: false,
    enableBloom: true,
    maxParticles: 2000,
    shadowType: 'soft',
  },
  medium: {
    quality: 'medium',
    pixelRatioCap: 1.35,
    shadowMapSize: 1024,
    enablePostProcessing: true,
    enableSSR: false,
    enableGodRays: false,
    enableDepthOfField: false,
    enableChromaticAberration: false,
    enableBloom: true,
    maxParticles: 800,
    shadowType: 'soft',
  },
  low: {
    quality: 'low',
    pixelRatioCap: 1,
    shadowMapSize: 512,
    enablePostProcessing: false,
    enableSSR: false,
    enableGodRays: false,
    enableDepthOfField: false,
    enableChromaticAberration: false,
    enableBloom: false,
    maxParticles: 200,
    shadowType: 'basic',
  },
};

export function resolveQuality(requested: AquaSpinQuality, detected: 'low' | 'medium' | 'high'): Exclude<AquaSpinQuality, 'auto'> {
  if (requested !== 'auto') return requested;
  return detected;
}
