export type LODLevel = 0 | 1 | 2; // 0=high, 1=medium, 2=low

export const LOD_CONFIG = {
  BOARD_DECORATIONS: { distances: [0.5, 1.0, 2.0], segments: [64, 32, 16] },
  COIN: { distances: [0.3, 0.8, 1.5], segments: [32, 16, 8] },
  POCKET_NET: { distances: [0.5, 1.0], segments: [16, 8] },
  BACKGROUND: { distances: [1.0, 2.0], show: [true, false] }
};

export function getLODSegments(type: keyof typeof LOD_CONFIG, distance: number): number {
  const config = LOD_CONFIG[type];
  if ('segments' in config) {
    for (let i = 0; i < config.distances.length; i++) {
      if (distance < config.distances[i]) return config.segments[i];
    }
    return config.segments[config.segments.length - 1];
  }
  return 32;
}
