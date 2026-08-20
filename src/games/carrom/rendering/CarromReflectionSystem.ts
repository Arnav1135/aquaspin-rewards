import * as THREE from 'three';

export const REFLECTION_PROFILES = {
  COIN: { envMapIntensity: 1.0, clearcoat: 0.5 },
  STRIKER: { envMapIntensity: 1.5, clearcoat: 1.0 },
  WOOD: { envMapIntensity: 0.3, clearcoat: 0.3 },
  QUEEN: { envMapIntensity: 1.2, clearcoat: 0.9 }
};

export const HERO_BOOST = { envMapIntensity: 0.5, clearcoat: 0.2 };

export function getReflectionProfile(type: keyof typeof REFLECTION_PROFILES) {
  return REFLECTION_PROFILES[type];
}

export function applyHeroReflection(material: THREE.MeshPhysicalMaterial, enable: boolean, type: keyof typeof REFLECTION_PROFILES) {
  const baseProfile = REFLECTION_PROFILES[type];
  if (enable) {
    material.envMapIntensity = baseProfile.envMapIntensity + HERO_BOOST.envMapIntensity;
    material.clearcoat = Math.min(1.0, baseProfile.clearcoat + HERO_BOOST.clearcoat);
  } else {
    material.envMapIntensity = baseProfile.envMapIntensity;
    material.clearcoat = baseProfile.clearcoat;
  }
  material.needsUpdate = true;
}
