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

const microSurfaceMap = generateMicroSurfaceTexture();


export class CarromMaterialProfile {
  public static getWoodBoardMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: woodTexObj.color,
      roughnessMap: woodTexObj.roughness,
      normalMap: woodTexObj.normal,
      color: '#ffffff',
      roughness: 0.7,
      metalness: 0.05,
      clearcoat: 0.6,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.2,
    });
  }

  public static getBoardSurfaceMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#e6cda3', // Very light, high quality Baltic Birch
      roughness: 0.15, // Extremely smooth for sliding
      roughnessMap: microSurfaceMap,
      metalness: 0.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.0,
      anisotropy: 0.2, // Subtle directional grain reflection
    });
  }

  public static getBoardEdgeMaterial(woodTexObj: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture }): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      map: woodTexObj.color,
      roughnessMap: woodTexObj.roughness,
      normalMap: woodTexObj.normal,
      color: '#2b1004', // Very dark polished rosewood
      roughness: 0.2,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      envMapIntensity: 1.5,
    });
  }

  public static getClothMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#1e3f28',
      roughness: 1.0,
      metalness: 0.0,
      clearcoat: 0.0,
      envMapIntensity: 0.1,
    });
  }

  public static getCoinMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const isWhite = type === 'WHITE';
    return new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#fffaef' : '#080808', // True Ivory and True Ebony
      roughness: isWhite ? 0.08 : 0.05, 
      roughnessMap: microSurfaceMap,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      envMapIntensity: 3.0,
      transmission: isWhite ? 0.15 : 0.0,
      ior: 1.55, // Ivory IOR
      thickness: 0.01, // Real thickness
    });
  }

  public static getCoinEdgeMaterial(type: 'WHITE' | 'BLACK'): THREE.MeshPhysicalMaterial {
    const isWhite = type === 'WHITE';
    return new THREE.MeshPhysicalMaterial({
      color: isWhite ? '#eaddcc' : '#050505',
      roughness: 0.15, 
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      envMapIntensity: 2.5,
    });
  }

  public static getQueenMaterial(): THREE.MeshPhysicalMaterial {
    return new THREE.MeshPhysicalMaterial({
      color: '#c20018', // Carmine red
      emissive: '#220000',
      emissiveIntensity: 0.05,
      roughness: 0.04,
      roughnessMap: microSurfaceMap,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.01,
      transmission: 0.2,
      thickness: 0.01,
      ior: 1.6,
      envMapIntensity: 4.0, // High reflection
    });
  }

  public static getStrikerVariant(variant: 'POLISHED' | 'MATTE' | 'TRANSLUCENT' | 'METALLIC_ACCENT'): THREE.MeshPhysicalMaterial {
    switch (variant) {
      case 'MATTE':
        return new THREE.MeshPhysicalMaterial({
          color: '#1a1a1a', 
          roughness: 0.8,
          roughnessMap: microSurfaceMap,
          metalness: 0.2,
          clearcoat: 0.2,
          clearcoatRoughness: 0.9,
          envMapIntensity: 1.0,
        });
      case 'TRANSLUCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffffff',
          roughness: 0.0,
          roughnessMap: microSurfaceMap,
          metalness: 0.1,
          transmission: 1.0, 
          thickness: 0.02, // Realistic physical thickness
          clearcoat: 1.0,
          clearcoatRoughness: 0.0,
          envMapIntensity: 3.5,
          ior: 1.52,
          attenuationColor: new THREE.Color('#d9eafc'),
          attenuationDistance: 0.1,
        });
      case 'METALLIC_ACCENT':
        return new THREE.MeshPhysicalMaterial({
          color: '#ffcc00', 
          roughness: 0.05,
          roughnessMap: microSurfaceMap,
          metalness: 1.0,
          clearcoat: 1.0,
          clearcoatRoughness: 0.02,
          envMapIntensity: 3.0,
        });
      case 'POLISHED':
      default:
        return new THREE.MeshPhysicalMaterial({
          color: '#f4f6f8', // Premium ceramic/acrylic
          roughness: 0.02,
          roughnessMap: microSurfaceMap,
          metalness: 0.1,
          clearcoat: 1.0,
          clearcoatRoughness: 0.01,
          envMapIntensity: 3.0,
          ior: 1.5,
        });
    }
  }

  public static getStrikerMaterial(): THREE.MeshPhysicalMaterial {
    return this.getStrikerVariant('POLISHED');
  }
}
