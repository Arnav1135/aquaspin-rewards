export type CandySizeClass = 'SMALL' | 'STANDARD' | 'LARGE';

export interface CandyScaleProfile {
  sizeClass: CandySizeClass;
  width: number;
  height: number;
  depth: number;
  visualCenter: { x: number; y: number; z: number };
  baseScale: number;
}

// Unit reference size for 1 grid cell
export const CANDY_UNIT = 1.0;

export const CANDY_SCALE_PROFILES: Record<CandySizeClass, CandyScaleProfile> = {
  SMALL: {
    sizeClass: 'SMALL',
    width: 0.65,
    height: 0.65,
    depth: 0.45,
    visualCenter: { x: 0, y: 0, z: 0 },
    baseScale: 0.85,
  },
  STANDARD: {
    sizeClass: 'STANDARD',
    width: 0.82,
    height: 0.82,
    depth: 0.55,
    visualCenter: { x: 0, y: 0, z: 0 },
    baseScale: 1.0,
  },
  LARGE: {
    sizeClass: 'LARGE',
    width: 0.95,
    height: 0.95,
    depth: 0.70,
    visualCenter: { x: 0, y: 0, z: 0 },
    baseScale: 1.15,
  },
};
