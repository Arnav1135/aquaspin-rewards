import * as THREE from 'three';

export class GlassInteractionSystem {
  // Phase 10: Glass Realism Upgrade
  public static createGlassMaterial(colorHex: number = 0xffffff, isHero: boolean = false): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.1,
      roughness: 0.05,
      clearcoat: isHero ? 1.0 : 0.5,
      clearcoatRoughness: 0.02,
      transmission: 0.95,
      ior: 1.52,
      thickness: 1.5,
      attenuationDistance: 2.0,
      attenuationColor: new THREE.Color(colorHex),
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide,
    });
  }

  public static triggerVibration(meshGroup: THREE.Group, strength: number = 0.2, frequency: number = 20) {
    const originalPos = meshGroup.position.clone();
    let elapsed = 0;
    const duration = 0.35;

    const interval = setInterval(() => {
      elapsed += 0.02;
      // High-frequency vibration for glass
      meshGroup.position.x = originalPos.x + Math.sin(elapsed * frequency) * strength * (1 - elapsed / duration);
      meshGroup.position.y = originalPos.y + Math.cos(elapsed * frequency * 1.3) * strength * (1 - elapsed / duration);

      if (elapsed >= duration) {
        clearInterval(interval);
        meshGroup.position.copy(originalPos);
      }
    }, 20);
  }
}
