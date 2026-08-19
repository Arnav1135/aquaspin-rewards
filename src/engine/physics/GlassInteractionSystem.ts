import * as THREE from 'three';

export class GlassInteractionSystem {
  public static createGlassMaterial(colorHex: number = 0xffffff): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: colorHex,
      metalness: 0.05,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      transmission: 0.92,
      ior: 1.52,
      thickness: 1.2,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
  }

  public static triggerVibration(meshGroup: THREE.Group, strength: number = 0.2) {
    const originalPos = meshGroup.position.clone();
    let elapsed = 0;
    const duration = 0.25;

    const interval = setInterval(() => {
      elapsed += 0.02;
      meshGroup.position.x = originalPos.x + (Math.random() - 0.5) * strength * (1 - elapsed / duration);
      meshGroup.position.y = originalPos.y + (Math.random() - 0.5) * strength * (1 - elapsed / duration);

      if (elapsed >= duration) {
        clearInterval(interval);
        meshGroup.position.copy(originalPos);
      }
    }, 20);
  }
}
