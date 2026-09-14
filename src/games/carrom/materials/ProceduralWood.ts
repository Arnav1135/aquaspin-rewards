import * as THREE from 'three';

export function createProceduralWoodTexture(): { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture } {
  const SIZE = 2048;
  // Color Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = SIZE; colorCanvas.height = SIZE;
  const ctx = colorCanvas.getContext('2d')!;
  
  // Roughness Map
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = SIZE; roughCanvas.height = SIZE;
  const rCtx = roughCanvas.getContext('2d')!;
  
  // Normal Map (Approximation)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = SIZE; normCanvas.height = SIZE;
  const nCtx = normCanvas.getContext('2d')!;

  // High-end Rosewood base colors
  ctx.fillStyle = '#3e1a0b';
  ctx.fillRect(0, 0, SIZE, SIZE);
  
  rCtx.fillStyle = '#666666'; // Base roughness
  rCtx.fillRect(0, 0, SIZE, SIZE);
  
  nCtx.fillStyle = '#8080ff';
  nCtx.fillRect(0, 0, SIZE, SIZE);

  // Directional Wood grain (elliptical arcs)
  for (let i = 0; i < 400; i++) {
    const isKnot = Math.random() < 0.03;
    
    ctx.beginPath();
    ctx.strokeStyle = `rgba(20, 10, 5, ${Math.random() * 0.15 + 0.05})`;
    ctx.lineWidth = Math.random() * 8 + 2;
    
    rCtx.beginPath();
    rCtx.strokeStyle = `rgba(180, 180, 180, ${Math.random() * 0.15})`;
    rCtx.lineWidth = ctx.lineWidth;

    nCtx.beginPath();
    nCtx.strokeStyle = `rgba(140, 140, 255, ${Math.random() * 0.1})`;
    nCtx.lineWidth = ctx.lineWidth;

    if (isKnot) {
      // Knots
      const kX = Math.random() * SIZE;
      const kY = Math.random() * SIZE;
      const r = Math.random() * 50 + 10;
      ctx.arc(kX, kY, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(10, 5, 2, 0.6)`;
      ctx.fill();
    } else {
      // Elongated arcs for grain, directional down the length
      const centerX = SIZE/2 + (Math.random() - 0.5) * (SIZE * 0.8);
      const centerY = -SIZE/2 + (Math.random() - 0.5) * (SIZE * 0.5);
      const radiusX = (SIZE * 0.6) + i * 20 + Math.random() * 20;
      const radiusY = radiusX * (4 + Math.random() * 3);
      
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      rCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      nCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    rCtx.stroke();
    nCtx.stroke();
  }

  // Micro-scratches and pores for high-end PBR
  for (let i = 0; i < 50000; i++) {
    const x = Math.random() * SIZE;
    const y = Math.random() * SIZE;
    const w = Math.random() * 4 + 1;
    const h = Math.random() * 12 + 2;
    
    // Pores
    ctx.fillStyle = `rgba(15, 5, 0, ${Math.random() * 0.4})`;
    ctx.fillRect(x, y, w, h);
    
    // Roughness variance for pores
    rCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.3})`;
    rCtx.fillRect(x, y, w, h);
  }

  const createTex = (c: HTMLCanvasElement) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 16;
    return tex;
  };

  return {
    color: createTex(colorCanvas),
    roughness: createTex(roughCanvas),
    normal: createTex(normCanvas)
  };
}

// Singleton cache
let woodTextures: { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture } | null = null;
export function getWoodTexture() {
  if (!woodTextures) {
    woodTextures = createProceduralWoodTexture();
  }
  return woodTextures;
}
