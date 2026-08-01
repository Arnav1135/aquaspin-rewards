import * as THREE from 'three';

export type QualityTier = 'high' | 'mid' | 'low';

export interface QualityConfig {
  tier: QualityTier;
  maxPixelRatio: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
  shadowMapSize: number;
  useHDRI: boolean;
  useSSAO: boolean;
  targetFPS: number;
  enableSoftShadows: boolean;
  pieceDetailScale: number;
}

export function detectDeviceTier(): QualityConfig {
  let tier: QualityTier = 'high';

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  ) || (window.innerWidth < 768);

  const concurrency = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;

  // WebGL capabilities check
  let maxTextureSize = 4096;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 4096;
    }
  } catch {
    // fallback
  }

  if (isMobile || concurrency <= 4 || maxTextureSize < 4096) {
    if (concurrency <= 2 || dpr < 1.5 || maxTextureSize < 2048) {
      tier = 'low';
    } else {
      tier = 'mid';
    }
  } else {
    tier = 'high';
  }

  switch (tier) {
    case 'low':
      return {
        tier: 'low',
        maxPixelRatio: 1.0,
        shadowMapEnabled: true,
        shadowMapType: THREE.BasicShadowMap,
        shadowMapSize: 512,
        useHDRI: false,
        useSSAO: false,
        targetFPS: 30,
        enableSoftShadows: false,
        pieceDetailScale: 0.8,
      };
    case 'mid':
      return {
        tier: 'mid',
        maxPixelRatio: 1.5,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFShadowMap,
        shadowMapSize: 1024,
        useHDRI: true,
        useSSAO: false,
        targetFPS: 60,
        enableSoftShadows: true,
        pieceDetailScale: 1.0,
      };
    case 'high':
    default:
      return {
        tier: 'high',
        maxPixelRatio: 2.0,
        shadowMapEnabled: true,
        shadowMapType: THREE.PCFSoftShadowMap,
        shadowMapSize: 2048,
        useHDRI: true,
        useSSAO: true,
        targetFPS: 60,
        enableSoftShadows: true,
        pieceDetailScale: 1.0,
      };
  }
}
