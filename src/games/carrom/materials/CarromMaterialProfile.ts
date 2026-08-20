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
      color: isWhite ? '#e8dec5' : '#222222',
      roughness: isWhite ? 0.25 : 0.35, 
      metalness: 0.1,
      clearcoat: 0.6,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.2,
    });
  }

  public static getCoinEdgeMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const isWhite = type === 'WHITE';
    return new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#d8ceb5' : '#1a1a1a',
      roughness: isWhite ? 0.4 : 0.5, 
      metalness: 0.15,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
      envMapIntensity: 1.0,
    });
  }

  public static getQueenMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#8B0000',
      emissive: '#220000',
      emissiveIntensity: 0.05,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 0.9,
      clearcoatRoughness: 0.05,
      transmission: 0.2,
      thickness: 0.1,
      envMapIntensity: 1.5,
    });
  }

  public static getStrikerVariant(variant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT'): THREE.MeshPhysicalMaterial {
    switch (variant) {
      case 'MATTE':
        return new THREE.MeshPhysicalMaterial({
          color: '#e0e0e0',
          roughness: 0.6,
          metalness: 0.1,
          clearcoat: 0.1,
          clearcoatRoughness: 0.8,
          envMapIntensity: 0.8,
        });
      case 'TRANSLUCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0.05,
          metalness: 0.0,
          transmission: 0.9,
          thickness: 0.5,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          envMapIntensity: 2.0,
          ior: 1.5,
        });
      case 'METALLIC_ACCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffd700',
          roughness: 0.2,
          metalness: 0.8,
          clearcoat: 0.5,
          clearcoatRoughness: 0.1,
          envMapIntensity: 1.5,
        });
      case 'POLISHED':
      default:
        return new THREE.MeshPhysicalMaterial({
          color: '#f0f0f0',
          roughness: 0.1,
          metalness: 0.3,
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          envMapIntensity: 1.5,
        });
    }
  }

  public static getStrikerMaterial(): THREE.MeshPhysicalMaterial {
    return this.getStrikerVariant('POLISHED');
  }
}
