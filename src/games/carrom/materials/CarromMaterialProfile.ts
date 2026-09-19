import * as THREE from 'three';

const generateMicroSurfaceTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048; canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 2048, 2048);
    // Procedural Noise for Dust/Micro-Scratches
    for(let i=0; i<200000; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * 2048, Math.random() * 2048, Math.random() * 2 + 1, Math.random() * 2 + 1);
      // Directional wiping scratches
      if (i % 10 === 0) {
        ctx.strokeStyle = `rgba(200,200,200,${Math.random() * 0.05})`;
        ctx.lineWidth = Math.random() * 0.5;
        ctx.beginPath();
        const sx = Math.random() * 2048;
        const sy = Math.random() * 2048;
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx + (Math.random() - 0.5) * 50, sy + (Math.random() - 0.5) * 50);
        ctx.stroke();
      }
    }
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  return texture;
};

let microSurfaceMapCache: THREE.CanvasTexture | null = null;
const getMicroSurfaceTexture = () => {
  if (!microSurfaceMapCache) {
    microSurfaceMapCache = generateMicroSurfaceTexture();
  }
  return microSurfaceMapCache;
};


export class CarromMaterialProfile {
  private static cache = new Map<string, THREE.MeshPhysicalMaterial>();

  public static getWoodBoardMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    const key = 'WoodBoardMaterial';
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        map: woodTexObj.color,
        roughnessMap: woodTexObj.roughness,
        normalMap: woodTexObj.normal,
        color: '#ffffff',
        roughness: 0.7,
        metalness: 0.05,
        clearcoat: 0.6,
        clearcoatRoughness: 0.1,
        envMapIntensity: 1.2,
      }));
    }
    return this.cache.get(key)!;
  }

  public static getBoardSurfaceMaterial(): THREE.MeshPhysicalMaterial {
    const key = 'BoardSurfaceMaterial';
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        color: '#4a2511', // Premium Indian Rosewood Base
        roughness: 0.1, // Highly polished wooden surface
        roughnessMap: getMicroSurfaceTexture(),
        metalness: 0.05,
        clearcoat: 1.0, // High gloss polish
        clearcoatRoughness: 0.02,
        envMapIntensity: 2.5, // Strong environmental reflection
        anisotropy: 0.8, // Strong directional grain reflection
      }));
    }
    return this.cache.get(key)!;
  }

  public static getBoardEdgeMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    const key = 'BoardEdgeMaterial';
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        map: woodTexObj.color,
        roughnessMap: woodTexObj.roughness,
        normalMap: woodTexObj.normal,
        color: '#2a1105', // Deep dark Indian Rosewood border
        roughness: 0.15,
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        envMapIntensity: 2.0,
      }));
    }
    return this.cache.get(key)!;
  }

  public static getClothMaterial(): THREE.MeshPhysicalMaterial {
    const key = 'ClothMaterial';
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        color: '#1a3a2a', // Deep casino/tournament green cloth for pockets
        roughness: 0.9,
        metalness: 0.0,
        clearcoat: 0.0,
        envMapIntensity: 0.2,
      }));
    }
    return this.cache.get(key)!;
  }

  public static getCoinMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const key = `CoinMaterial_${type}`;
    if (!this.cache.has(key)) {
      const isWhite = type === 'WHITE';
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        color: isWhite ? '#fdfbf7' : '#111111', // Premium Resin Ivory and Ebony
        roughness: isWhite ? 0.05 : 0.03, // Extremely polished
        roughnessMap: getMicroSurfaceTexture(),
        metalness: 0.15, // Metallic Reflection Layer
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        envMapIntensity: 4.0, // Dynamic Reflection
        transmission: isWhite ? 0.05 : 0.0,
        ior: 1.5,
      }));
    }
    return this.cache.get(key)!;
  }

  public static getCoinEdgeMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const key = `CoinEdgeMaterial_${type}`;
    if (!this.cache.has(key)) {
      const isWhite = type === 'WHITE';
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        color: isWhite ? '#e8dbcc' : '#0a0a0a',
        roughness: 0.1, 
        metalness: 0.2, // Bevel edge reflection
        clearcoat: 1.0,
        clearcoatRoughness: 0.02,
        envMapIntensity: 3.5,
      }));
    }
    return this.cache.get(key)!;
  }

  public static getQueenMaterial(): THREE.MeshPhysicalMaterial {
    const key = 'QueenMaterial';
    if (!this.cache.has(key)) {
      this.cache.set(key, new THREE.MeshPhysicalMaterial({
        color: '#c20018', // Carmine red
        emissive: '#220000',
        emissiveIntensity: 0.05,
        roughness: 0.04,
        roughnessMap: getMicroSurfaceTexture(),
        metalness: 0.1,
        clearcoat: 1.0,
        clearcoatRoughness: 0.01,
        transmission: 0.2,
        thickness: 0.01,
        ior: 1.6,
        envMapIntensity: 4.0, // High reflection
      }));
    }
    return this.cache.get(key)!;
  }

  public static getStrikerVariant(variant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT'): THREE.MeshPhysicalMaterial {
    const key = `StrikerVariant_${variant}`;
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    let mat: THREE.MeshPhysicalMaterial;
    switch (variant) {
      case 'MATTE':
        mat = new THREE.MeshPhysicalMaterial({
          color: '#1a1a1a', 
          roughness: 0.8,
          roughnessMap: getMicroSurfaceTexture(),
          metalness: 0.2,
          clearcoat: 0.2,
          clearcoatRoughness: 0.9,
          envMapIntensity: 1.0,
        });
        break;
      case 'TRANSLUCENT':
        mat = new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0.0,
          roughnessMap: getMicroSurfaceTexture(),
          metalness: 0.1,
          transmission: 1.0, 
          thickness: 0.1, // High crystal thickness
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          envMapIntensity: 4.0, // High Fresnel reflection
          ior: 1.6, // Crystal glass IOR
          attenuationColor: new THREE.Color('#d9eafc'),
          attenuationDistance: 0.2,
        });
        break;
      case 'METALLIC_ACCENT':
        mat = new THREE.MeshPhysicalMaterial({
          color: '#ffcc00', 
          roughness: 0.1,
          roughnessMap: getMicroSurfaceTexture(),
          metalness: 1.0, // Full metallic ring
          clearcoat: 1.0,
          clearcoatRoughness: 0.05,
          envMapIntensity: 3.5,
        });
        break;
      case 'POLISHED':
      default:
        mat = new THREE.MeshPhysicalMaterial({
          color: '#f4f6f8', // Premium ceramic/acrylic
          roughness: 0.01,
          roughnessMap: getMicroSurfaceTexture(),
          metalness: 0.2, // Subtle reflection
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          envMapIntensity: 4.0,
          ior: 1.55,
        });
        break;
    }
    
    this.cache.set(key, mat);
    return mat;
  }

  public static getStrikerMaterial(): THREE.MeshPhysicalMaterial {
    return this.getStrikerVariant('POLISHED');
  }
}
