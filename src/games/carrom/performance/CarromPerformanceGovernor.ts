import { create } from 'zustand';

type QualityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ULTRA';

interface PerformanceState {
  quality: QualityLevel;
  fps: number;
  setQuality: (q: QualityLevel) => void;
  reportFPS: (fps: number) => void;
}

export interface TrackedMetrics {
  fps: number;
  drawCalls: number;
  triangles: number;
  activeVFX: number;
  activePhysicsBodies: number;
}

export const DEGRADATION_PRIORITY = [
  'ambient_particles',
  'background_detail',
  'postprocess',
  'reflections',
  'shadows'
];

/**
 * System 55 & 56: Performance Governor
 */
export const useCarromPerformance = create<PerformanceState>((set) => ({
  quality: 'ULTRA', // Default to Ultra, degrade if necessary
  fps: 60,
  
  setQuality: (quality) => {
    console.log(`[PerformanceGovernor] Quality degraded to ${quality}`);
    set({ quality });
  },

  reportFPS: (fps) => {
    set((state) => {
      // Degrade quality if FPS is consistently low
      if (fps < 30 && state.quality === 'ULTRA') return { quality: 'HIGH', fps };
      if (fps < 20 && state.quality === 'HIGH') return { quality: 'MEDIUM', fps };
      if (fps < 15 && state.quality === 'MEDIUM') return { quality: 'LOW', fps };
      return { fps };
    });
  }
}));
