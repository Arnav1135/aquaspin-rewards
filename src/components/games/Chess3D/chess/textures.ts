import * as THREE from 'three';

/**
 * Procedural Texture Generator for PBR Maps
 * Generates high-resolution 2K normal maps, roughness maps, micro wood/marble grains,
 * felt bottom textures, and a custom Studio HDRI environment map for reflections.
 */

// Generate a subtle wood grain / marble normal map
export function createWoodNormalMap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Default normal map blue-purple background (RGB: 128, 128, 255)
  ctx.fillStyle = 'rgb(128, 128, 255)';
  ctx.fillRect(0, 0, 1024, 1024);

  const imgData = ctx.getImageData(0, 0, 1024, 1024);
  const data = imgData.data;

  // Add subtle ring/grain normal perturbation
  for (let y = 0; y < 1024; y++) {
    for (let x = 0; x < 1024; x++) {
      const idx = (y * 1024 + x) * 4;
      const noise1 = Math.sin(x * 0.05 + Math.sin(y * 0.01) * 8.0) * 12;
      const noise2 = (Math.random() - 0.5) * 6;

      const nx = 128 + Math.floor(noise1 + noise2);
      const ny = 128 + Math.floor((Math.random() - 0.5) * 4);
      const nz = 255;

      data[idx] = Math.min(255, Math.max(0, nx));
      data[idx + 1] = Math.min(255, Math.max(0, ny));
      data[idx + 2] = Math.min(255, Math.max(0, nz));
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  return texture;
}

// Generate Roughness Map with subtle fingerprints and fine grain
export function createRoughnessMap(baseRoughness: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const baseVal = Math.floor(baseRoughness * 255);
  ctx.fillStyle = `rgb(${baseVal},${baseVal},${baseVal})`;
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = baseVal + Math.floor((Math.random() - 0.5) * 20);
    const clamped = Math.min(255, Math.max(0, val));
    data[i] = clamped;
    data[i + 1] = clamped;
    data[i + 2] = clamped;
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1, 1);
  return texture;
}

// Generate Felt Pad Texture for piece bottoms
export function createFeltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#1e3a1e'; // Dark green felt pad
  ctx.fillRect(0, 0, 256, 256);

  // Add fiber noise
  for (let i = 0; i < 20000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#2d5a2d' : '#142814';
    ctx.fillRect(x, y, 1, 3);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/**
 * Creates a studio HDRI environment map texture dynamically using equirectangular rendering
 * Provides rich soft studio lights, warm key lights, cold fill lights, and overhead softboxes.
 */
export function createStudioHDRIEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();

  // Gradient sky background sphere
  const skyGeo = new THREE.SphereGeometry(100, 32, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: {
      topColor: { value: new THREE.Color(0x384252) },
      bottomColor: { value: new THREE.Color(0x101216) },
    },
    vertexShader: `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // Softbox panels for specular reflections
  const panelGeo = new THREE.PlaneGeometry(30, 30);

  // Key light panel (warm high brightness)
  const keyMat = new THREE.MeshBasicMaterial({ color: 0xfffaed, side: THREE.DoubleSide });
  const keyPanel = new THREE.Mesh(panelGeo, keyMat);
  keyPanel.position.set(40, 50, 40);
  keyPanel.lookAt(0, 0, 0);
  scene.add(keyPanel);

  // Fill light panel (cool blue soft)
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x88bbff, side: THREE.DoubleSide });
  const fillPanel = new THREE.Mesh(panelGeo, fillMat);
  fillPanel.position.set(-50, 30, -30);
  fillPanel.lookAt(0, 0, 0);
  scene.add(fillPanel);

  // Overhead softbox (bright white studio roof light)
  const roofMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const roofPanel = new THREE.Mesh(new THREE.PlaneGeometry(50, 50), roofMat);
  roofPanel.position.set(0, 80, 0);
  roofPanel.rotation.x = Math.PI / 2;
  scene.add(roofPanel);

  // Generate cube env map using PMREM
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();

  const cubeRenderTarget = pmremGenerator.fromScene(scene);

  // Cleanup
  skyGeo.dispose();
  skyMat.dispose();
  panelGeo.dispose();
  keyMat.dispose();
  fillMat.dispose();
  roofMat.dispose();

  return cubeRenderTarget.texture;
}
