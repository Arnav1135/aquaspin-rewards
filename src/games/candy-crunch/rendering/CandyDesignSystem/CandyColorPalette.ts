import * as THREE from 'three';

export interface CandyColorProfile {
  name: string;
  baseColor: number;
  highlightColor: number;
  shadowColor: number;
  rimColor: number;
  emissiveAccent: number;
  vfxColor: number;
  glowColor: number;
}

export const CANDY_COLOR_PALETTE: Record<string, CandyColorProfile> = {
  red: {
    name: 'red',
    baseColor: 0xe62e2e,      // Saturated deep red
    highlightColor: 0xff8888, // Pinkish-white bright highlight
    shadowColor: 0x660000,    // Very dark red shadow
    rimColor: 0xff6666,       // Warm rim light
    emissiveAccent: 0x990000, // Very dark emissive base
    vfxColor: 0xff3333,       // Bright red for particles
    glowColor: 0xff0000,      // Pure red for selection glow
  },
  orange: {
    name: 'orange',
    baseColor: 0xf97316,      // Vibrant orange
    highlightColor: 0xffcc99, // Soft warm highlight
    shadowColor: 0x883300,    // Deep brown-orange shadow
    rimColor: 0xffaa44,       // Bright orange rim
    emissiveAccent: 0xcc5500, // Rich warm emissive
    vfxColor: 0xff8800,       // Particle orange
    glowColor: 0xff6600,      // Intense orange glow
  },
  yellow: {
    name: 'yellow',
    baseColor: 0xffcc00,      // Bright yellow
    highlightColor: 0xffffff, // Pure white highlight
    shadowColor: 0x996600,    // Golden brown shadow
    rimColor: 0xffea77,       // Light yellow rim
    emissiveAccent: 0xcc9900, // Amber emissive
    vfxColor: 0xffdd00,       // Bright yellow particles
    glowColor: 0xffcc00,      // Golden selection glow
  },
  green: {
    name: 'green',
    baseColor: 0x22c55e,      // Crisp emerald green
    highlightColor: 0x88ffaa, // Minty highlight
    shadowColor: 0x005522,    // Deep forest shadow
    rimColor: 0x55ee88,       // Bright green rim
    emissiveAccent: 0x007722, // Dark green emissive
    vfxColor: 0x11ee44,       // Neon green particles
    glowColor: 0x00ff00,      // Pure green selection glow
  },
  blue: {
    name: 'blue',
    baseColor: 0x2563eb,      // Vibrant royal blue
    highlightColor: 0x99ccff, // Icy blue highlight
    shadowColor: 0x002277,    // Deep navy shadow
    rimColor: 0x66aaff,       // Bright blue rim
    emissiveAccent: 0x1133bb, // Rich blue emissive
    vfxColor: 0x3388ff,       // Cyan-blue particles
    glowColor: 0x0066ff,      // Electric blue glow
  },
  purple: {
    name: 'purple',
    baseColor: 0x9333ea,      // Deep violet
    highlightColor: 0xeebbff, // Pinkish-purple highlight
    shadowColor: 0x440066,    // Very dark purple shadow
    rimColor: 0xcc66ff,       // Bright magenta rim
    emissiveAccent: 0x6600aa, // Dark violet emissive
    vfxColor: 0xaa44ff,       // Magenta-purple particles
    glowColor: 0xaa00ff,      // Intense purple glow
  },
};
