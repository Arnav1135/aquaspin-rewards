import * as THREE from 'three';

export function createProceduralWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.CanvasTexture(canvas);

  // Base wood color
  ctx.fillStyle = '#8B5A2B';
  ctx.fillRect(0, 0, 512, 512);

  // Wood grain rings
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(60, 30, 10, ${Math.random() * 0.15})`;
    ctx.lineWidth = Math.random() * 4 + 1;
    
    const centerX = 256 + (Math.random() - 0.5) * 100;
    const centerY = -100; // Center far away to make curves shallow
    const radius = 200 + i * 8 + Math.random() * 5;
    
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Small imperfections/pores
  for (let i = 0; i < 5000; i++) {
    ctx.fillStyle = `rgba(40, 20, 5, ${Math.random() * 0.2})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, Math.random() * 2 + 1, Math.random() * 5 + 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// Singleton cache
let woodTexture: THREE.CanvasTexture | null = null;
export function getWoodTexture() {
  if (!woodTexture) {
    woodTexture = createProceduralWoodTexture();
  }
  return woodTexture;
}
