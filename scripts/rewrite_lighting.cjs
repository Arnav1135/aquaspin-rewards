const fs = require('fs');
const path = require('path');

const scenePath = path.join(__dirname, '../src/components/games/Chess3D/chess/scene.ts');
let content = fs.readFileSync(scenePath, 'utf-8');

// Overwrite setupLighting completely
content = content.replace(
  /private setupLighting\(\) \{[\s\S]*?\n  \}/,
  `private setupLighting() {
    const shadowRes = this.qualityConfig.shadowMapSize;

    // Premium Area Light Setup
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    keyLight.position.set(10, 20, 10);
    if (this.qualityConfig.shadowMapEnabled) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = shadowRes * 2; // Ultra sharp shadows
      keyLight.shadow.mapSize.height = shadowRes * 2;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 50;
      keyLight.shadow.camera.left = -10;
      keyLight.shadow.camera.right = 10;
      keyLight.shadow.camera.top = 10;
      keyLight.shadow.camera.bottom = -10;
      // Soft shadows via Poisson disk blur
      keyLight.shadow.radius = 2.5; 
    }
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x88bbff, 1.2);
    fillLight.position.set(-15, 10, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffd59e, 1.5);
    rimLight.position.set(0, 8, -15);
    this.scene.add(rimLight);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);

    // Volumetric Fog for cinematic depth
    this.scene.fog = new THREE.FogExp2(0x0a1020, 0.015);

    if (this.qualityConfig.useHDRI) {
      try {
        const envTex = createStudioHDRIEnvironment(this.renderer);
        this.scene.environment = envTex;
      } catch (e) {
        console.error(e);
      }
    }
  }`
);

fs.writeFileSync(scenePath, content);
console.log('Lighting updated');
