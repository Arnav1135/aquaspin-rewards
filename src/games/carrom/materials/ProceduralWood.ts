import * as THREE from 'three';

export function createProceduralWoodTexture(): { color: THREE.CanvasTexture, roughness: THREE.CanvasTexture, normal: THREE.CanvasTexture } {
  // Color Map
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1024;
  colorCanvas.height = 1024;
  const ctx = colorCanvas.getContext('2d')!;
  
  // Roughness Map
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 1024;
  roughCanvas.height = 1024;
  const rCtx = roughCanvas.getContext('2d')!;
  
  // Normal Map (Approximation)
  const normCanvas = document.createElement('canvas');
  normCanvas.width = 1024;
  normCanvas.height = 1024;
  const nCtx = normCanvas.getContext('2d')!;

  // Base colors
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(0, 0, 1024, 1024);
  
  rCtx.fillStyle = '#888888';
  rCtx.fillRect(0, 0, 1024, 1024);
  
  nCtx.fillStyle = '#8080ff';
  nCtx.fillRect(0, 0, 1024, 1024);

  // Wood grain (elliptical arcs)
  for (let i = 0; i < 200; i++) {
    const isKnot = Math.random() < 0.05;
    
    ctx.beginPath();
    ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.2 + 0.05})`;
    ctx.lineWidth = Math.random() * 6 + 1;
    
    rCtx.beginPath();
    rCtx.strokeStyle = `rgba(200, 200, 200, ${Math.random() * 0.1})`;
    rCtx.lineWidth = ctx.lineWidth;

    nCtx.beginPath();
    nCtx.strokeStyle = `rgba(150, 150, 255, ${Math.random() * 0.1})`;
    rCtx.lineWidth = 0.15;
    nCtx.lineWidth = ctx.lineWidth;

    if (isKnot) {
      // Knots
      const kX = Math.random() * 1024;
      const kY = Math.random() * 1024;
      const r = Math.random() * 30 + 10;
      ctx.arc(kX, kY, r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40, 20, 5, 0.4)`;
      ctx.fill();
    } else {
      // Elongated arcs for grain
      const centerX = 512 + (Math.random() - 0.5) * 400;
      const centerY = -400 + (Math.random() - 0.5) * 200;
      const radiusX = 600 + i * 15 + Math.random() * 10;
      const radiusY = radiusX * (3 + Math.random() * 2);
      
      ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      rCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
      nCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
    }
    ctx.stroke();
    rCtx.stroke();
    nCtx.stroke();
  }

  // Micro-imperfections
  for (let i = 0; i < 15000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const w = Math.random() * 3 + 1;
    const h = Math.random() * 8 + 2;
    
    ctx.fillStyle = `rgba(40, 20, 5, ${Math.random() * 0.3})`;
    ctx.fillRect(x, y, w, h);
    
    rCtx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.2})`;
    rCtx.fillRect(x, y, w, h);
  }

  const createTex = (c: HTMLCanvasElement) => {
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
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
