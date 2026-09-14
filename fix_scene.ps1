$code = Get-Content -Path "d:\Web App - Aqua Blue\src\components\games\Chess3D\chess\scene.ts" -Raw
$constructorRegex = [regex]::new("this\.renderer\.toneMappingExposure = 1\.1;[\s\S]*?private setupLighting\(\) \{")

$replacement = @"
    this.renderer.toneMappingExposure = 1.1;

    container.appendChild(this.renderer.domElement);

    // Ensure 3D Canvas element handles touch/pointer interactions without default browser interference
    container.style.pointerEvents = 'auto';
    this.renderer.domElement.style.pointerEvents = 'auto';
    this.renderer.domElement.style.touchAction = 'none';

    // 4. Controls & Camera Controller
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.cameraController = new CameraController(this.camera, this.controls, container);
    this.cameraController.updateResponsiveFraming();

    this.touchController = new TouchController(this.renderer.domElement, this.controls);

    // 5. Studio Lighting
    this.setupLighting();
    this.initPostProcessing();

    // 6. Build 3D Board
    this.boardContainer = create3DBoard(this.theme);
    this.scene.add(this.boardContainer.group);

    // 7. Event Listeners
    window.addEventListener('resize', this.onWindowResize);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.addEventListener('pointermove', this.onPointerMove);

    // 8. Debug Overlay Panel & Initial Pieces Load
    this.initDebugOverlay();
    this.syncPiecesFromEngine();
    this.playCinematicSweepIntro();

    // 9. Start Render Loop
    this.animate();
  }

  private initPostProcessing() {
    if (this.qualityConfig.tier === 'low') return;

    this.composer = new EffectComposer(this.renderer);
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const normalPass = new NormalPass(this.scene, this.camera);
    this.composer.addPass(normalPass);

    const effects = [];

    if (this.qualityConfig.useSSAO) {
      const ssaoEffect = new SSAOEffect(this.camera, normalPass.texture, {
        intensity: 2.0,
        radius: 0.1,
        samples: 16,
        rings: 4,
        distanceThreshold: 1.0,
        distanceFalloff: 0.1,
        luminanceInfluence: 0.7,
      });
      effects.push(ssaoEffect);
    }

    const bloomEffect = new BloomEffect({
      intensity: 0.8,
      mipmapBlur: true,
      luminanceThreshold: 0.85,
      luminanceSmoothing: 0.1,
    });
    effects.push(bloomEffect);

    const vignetteEffect = new VignetteEffect({
      eskil: false,
      offset: 0.3,
      darkness: 0.5,
    });
    effects.push(vignetteEffect);

    const smaaEffect = new SMAAEffect();
    effects.push(smaaEffect);

    const effectPass = new EffectPass(this.camera, ...effects);
    this.composer.addPass(effectPass);
  }

  private setupLighting() {
"@

$newCode = $constructorRegex.Replace($code, $replacement)
Set-Content -Path "d:\Web App - Aqua Blue\src\components\games\Chess3D\chess\scene.ts" -Value $newCode -NoNewline
