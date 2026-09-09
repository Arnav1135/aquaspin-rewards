import * as THREE from 'three';

export class CarromMaterialProfile {
  public static getWoodBoardMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: woodTexObj.color,
      roughnessMap: woodTexObj.roughness,
      normalMap: woodTexObj.normal,
      color: '#ffffff',
      roughness: 0.6,
      metalness: 0.05,
      clearcoat: 0.4,
      clearcoatRoughness: 0.15,
      envMapIntensity: 0.8,
    });
  }

  public static getBoardSurfaceMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#f0d5a3',
      roughness: 0.3,
      metalness: 0.0,
      clearcoat: 0.2,
      clearcoatRoughness: 0.1,
      envMapIntensity: 0.6,
    });
  }

  public static getBoardEdgeMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: woodTexObj.color,
      roughnessMap: woodTexObj.roughness,
      normalMap: woodTexObj.normal,
      color: '#4a2810',
      roughness: 0.8,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1.0,
    });
  }

  public static getClothMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#2a5a3b',
      roughness: 0.9,
      metalness: 0.0,
      clearcoat: 0.0,
      envMapIntensity: 0.2,
    });
  }

  public static getCoinMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const isWhite = type === 'WHITE';
    return new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#fdf5e6' : '#111111', // Ivory and Polished Ebony
      roughness: isWhite ? 0.15 : 0.1, 
      metalness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.5,
      transmission: isWhite ? 0.1 : 0.0,
      ior: 1.5,
      thickness: 0.05,
    });
  }

  public static getCoinEdgeMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const isWhite = type === 'WHITE';
    return new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#e8dec5' : '#0a0a0a',
      roughness: isWhite ? 0.3 : 0.2, 
      metalness: 0.3,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      envMapIntensity: 2.0,
    });
  }

  public static getQueenMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#A00000',
      emissive: '#330000',
      emissiveIntensity: 0.1,
      roughness: 0.05,
      metalness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transmission: 0.3,
      thickness: 0.1,
      ior: 1.6,
      envMapIntensity: 3.0,
    });
  }

  public static getStrikerVariant(variant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT'): THREE.MeshPhysicalMaterial {
    switch (variant) {
      case 'MATTE':
        return new THREE.MeshPhysicalMaterial({
          color: '#2a2a2a', // Obsidian matte
          roughness: 0.8,
          metalness: 0.2,
          clearcoat: 0.2,
          clearcoatRoughness: 0.9,
          envMapIntensity: 1.0,
        });
      case 'TRANSLUCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0.0,
          metalness: 0.1,
          transmission: 1.0, // Glass
          thickness: 0.8,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          envMapIntensity: 3.0,
          ior: 1.52,
          attenuationColor: new THREE.Color('#e6f2ff'),
          attenuationDistance: 0.5,
        });
      case 'METALLIC_ACCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffdf00', // Gold
          roughness: 0.1,
          metalness: 1.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          envMapIntensity: 2.5,
        });
      case 'POLISHED':
      default:
        return new THREE.MeshPhysicalMaterial({
          color: '#f8f8f8',
          roughness: 0.05,
          metalness: 0.4,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          envMapIntensity: 2.0,
        });
    }
  }

  public static getStrikerMaterial(): THREE.MeshPhysicalMaterial {
    return this.getStrikerVariant('POLISHED');
  }
}
