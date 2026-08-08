// src/engine/core/DeviceCapabilityDetector.ts

export interface DeviceProfile {
  tier: 'low' | 'medium' | 'high';
  isTouch: boolean;
  recommendedDpr: number;
  shadowMapSize: number;
  enablePostProcessing: boolean;
  maxParticles: number;
  gpuRenderer?: string;
  enableSSR: boolean;
  enableGodRays: boolean;
  enableMotionBlur: boolean;
}

export class DeviceCapabilityDetector {
  private static profile: DeviceProfile | null = null;

  public static detect(): DeviceProfile {
    if (this.profile) return this.profile;

    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
    let gpuRenderer = '';
    let tier: 'low' | 'medium' | 'high' = 'medium';

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        }
      }
    } catch {
      // Fall back to conservative defaults when WebGL capability probing is unavailable.
    }

    const lowerGpu = gpuRenderer.toLowerCase();
    const memory = typeof navigator !== 'undefined' && 'deviceMemory' in navigator
      ? Number((navigator as Navigator & { deviceMemory?: number }).deviceMemory || 0)
      : 0;

    const isKnownLowGpu =
      lowerGpu.includes('mali-4') ||
      lowerGpu.includes('mali-g3') ||
      lowerGpu.includes('adreno 3') ||
      lowerGpu.includes('powervr') ||
      lowerGpu.includes('swiftshader');

    const isKnownHighGpu =
      lowerGpu.includes('rtx') ||
      lowerGpu.includes('gtx') ||
      lowerGpu.includes('radeon rx') ||
      lowerGpu.includes('apple m') ||
      lowerGpu.includes('apple gpu');

    const narrowViewport = typeof window !== 'undefined' && window.innerWidth < 480;

    if (isKnownLowGpu || memory > 0 && memory <= 2 || (isTouch && narrowViewport && memory > 0 && memory <= 4)) {
      tier = 'low';
    } else if (isKnownHighGpu || memory >= 12) {
      tier = 'high';
    } else {
      tier = 'medium';
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const recommendedDpr = tier === 'low'
      ? Math.min(dpr, 1)
      : tier === 'medium'
        ? Math.min(dpr, 1.5)
        : Math.min(dpr, 2);

    const shadowMapSize = tier === 'low' ? 512 : tier === 'medium' ? 1024 : 2048;
    const enablePostProcessing = tier !== 'low';
    const maxParticles = tier === 'low' ? 200 : tier === 'medium' ? 800 : 2000;
    const enableSSR = tier === 'high';
    const enableGodRays = tier === 'high';
    const enableMotionBlur = tier === 'high';

    this.profile = {
      tier,
      isTouch,
      recommendedDpr,
      shadowMapSize,
      enablePostProcessing,
      maxParticles,
      gpuRenderer,
      enableSSR,
      enableGodRays,
      enableMotionBlur,
    };

    return this.profile;
  }
}
