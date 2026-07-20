// src/engine/core/DeviceCapabilityDetector.ts

export interface DeviceProfile {
  tier: 'low' | 'medium' | 'high';
  isTouch: boolean;
  recommendedDpr: number;
  shadowMapSize: number;
  enablePostProcessing: boolean;
  maxParticles: number;
  gpuRenderer?: string;
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
      // Fallback if WebGL context creation fails
    }

    const lowerGpu = gpuRenderer.toLowerCase();
    const isLowGpu = lowerGpu.includes('intel') || lowerGpu.includes('mali-g3') || lowerGpu.includes('mali-400') || lowerGpu.includes('adreno 3');
    const isHighGpu = lowerGpu.includes('rtx') || lowerGpu.includes('gtx') || lowerGpu.includes('apple m') || lowerGpu.includes('radeon rx');

    if (isLowGpu || (isTouch && window.innerWidth < 768)) {
      tier = 'low';
    } else if (isHighGpu) {
      tier = 'high';
    } else {
      tier = 'medium';
    }

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const recommendedDpr = tier === 'low' ? Math.min(dpr, 1.0) : tier === 'medium' ? Math.min(dpr, 1.5) : Math.min(dpr, 2.0);
    const shadowMapSize = tier === 'low' ? 512 : tier === 'medium' ? 1024 : 2048;
    const enablePostProcessing = tier !== 'low';
    const maxParticles = tier === 'low' ? 100 : tier === 'medium' ? 500 : 2000;

    this.profile = {
      tier,
      isTouch,
      recommendedDpr,
      shadowMapSize,
      enablePostProcessing,
      maxParticles,
      gpuRenderer,
    };

    return this.profile;
  }
}
