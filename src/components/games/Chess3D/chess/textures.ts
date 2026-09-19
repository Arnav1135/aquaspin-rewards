import * as THREE from 'three';

// Procedural 4K Textures for AAA PBR Rendering
export function createWoodNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 4096, 4096);

  const imgData = ctx.getImageData(0, 0, 4096, 4096);
  const data = imgData.data;

  for (let y = 0; y < 4096; y++) {
    for (let x = 0; x < 4096; x++) {
      const idx = (y * 4096 + x) * 4;
      const noise1 = Math.sin(x * 0.02 + Math.sin(y * 0.005) * 12.0) * 8;
      const noise2 = (Math.random() - 0.5) * 4;

      const nx = 128 + Math.floor(noise1 + noise2);
      const ny = 128 + Math.floor((Math.random() - 0.5) * 4);
      
      data[idx] = Math.min(255, Math.max(0, nx));
      data[idx + 1] = Math.min(255, Math.max(0, ny));
      data[idx + 2] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

export function createRoughnessMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = 'rgb(100, 100, 100)';
  ctx.fillRect(0, 0, 4096, 4096);
  
  const imgData = ctx.getImageData(0, 0, 4096, 4096);
  const data = imgData.data;

  // Add dust, scratches and edge wear approximation via high frequency noise + streaks
  for (let y = 0; y < 4096; y++) {
    for (let x = 0; x < 4096; x++) {
      const idx = (y * 4096 + x) * 4;
      
      // Micro scratches
      const isScratch = Math.random() > 0.9995;
      
      let val = 100 + (Math.random() - 0.5) * 20; // base roughness variance
      if (isScratch) val = 180; // scratch makes it rougher
      
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
    }
  }
  
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

export function createMicroSurfaceTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d')!;
  
  const imgData = ctx.createImageData(2048, 2048);
  for (let i = 0; i < imgData.data.length; i += 4) {
    const v = 200 + Math.random() * 55;
    imgData.data[i] = v;
    imgData.data[i+1] = v;
    imgData.data[i+2] = v;
    imgData.data[i+3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(10, 10);
  tex.anisotropy = 16;
  return tex;
}

export function createMarbleTexture(isBlack: boolean): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4096;
  canvas.height = 4096;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = isBlack ? '#111111' : '#f0f0f0';
  ctx.fillRect(0, 0, 4096, 4096);
  
  // Fake perlin veins
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = isBlack ? '#333333' : '#cccccc';
  for(let i=0; i<100; i++) {
    ctx.lineWidth = Math.random() * 20 + 2;
    ctx.beginPath();
    let x = Math.random() * 4096;
    let y = Math.random() * 4096;
    ctx.moveTo(x, y);
    for(let j=0; j<20; j++) {
      x += (Math.random() - 0.5) * 500;
      y += (Math.random() - 0.5) * 500;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  
  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

export function createStudioHDRIEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#0a1020');
  grad.addColorStop(0.5, '#152540');
  grad.addColorStop(1, '#050a10');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Soft box lights
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 100;
  ctx.beginPath(); ctx.arc(512, 300, 150, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(1536, 400, 100, 0, Math.PI * 2); ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  const envMap = pmremGenerator.fromEquirectangular(texture).texture;
  texture.dispose();
  pmremGenerator.dispose();

  return envMap;
}
