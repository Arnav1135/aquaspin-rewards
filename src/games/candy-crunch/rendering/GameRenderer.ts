import * as THREE from 'three';
import { QualityManager, QualityPreset } from './managers/QualityManager';
import { ResourceManager } from './managers/ResourceManager';
import { EnvironmentManager } from './managers/EnvironmentManager';
import { CameraManager } from './managers/CameraManager';
import { AnimationEngine } from './managers/AnimationEngine';
import { VFXManager } from './managers/VFXManager';
import { BoardRenderer } from './entities/BoardRenderer';
import { CandyRenderer } from './entities/CandyRenderer';
import { TileData } from '../types';

export class GameRenderer {
  private container: HTMLDivElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private clock: THREE.Clock;
  private animationFrameId: number = 0;

  // Managers
  public quality: QualityManager;
  public resources: ResourceManager;
  public environment: EnvironmentManager;
  public cameraManager: CameraManager;
  public animation: AnimationEngine;
  public vfx: VFXManager;

  // Entities
  private boardRenderer: BoardRenderer;
  private candyRenderer: CandyRenderer;

  private tileMeshes: Map<string, THREE.Group> = new Map();

  constructor(container: HTMLDivElement, preset: QualityPreset = 'AUTO') {
    this.container = container;
    
    // Core Three.js Setup
    this.scene = new THREE.Scene();
    
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, -1.2, 10.5);
    
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Phase 3: Better tone mapping
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    // Initialize Sub-Systems (Phase 2 Architecture)
    this.quality = new QualityManager(preset);
    this.resources = new ResourceManager();
    this.environment = new EnvironmentManager(this.scene);
    this.animation = new AnimationEngine();
    this.cameraManager = new CameraManager(this.camera, this.animation);
    this.vfx = new VFXManager(this.scene);
    
    this.boardRenderer = new BoardRenderer();
    this.scene.add(this.boardRenderer.getGroup());
    this.candyRenderer = new CandyRenderer(this.resources);

    this.applyQualitySettings();

    // Resize Event
    window.addEventListener('resize', this.onResize);

    // Start Loop
    this.animate();
  }

  private applyQualitySettings() {
    const s = this.quality.getSettings();
    this.renderer.setPixelRatio(s.pixelRatio);
    // Future: implement composer and post-processing based on s.enablePostProcessing
  }

  private onResize = () => {
    if (!this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.cameraManager.handleResize(w, h);
    this.renderer.setSize(w, h);
  }

  public renderBoard(board: TileData[][]) {
    const rows = board.length;
    const cols = board[0]?.length || 8;
    
    // Rebuild background if dimensions change
    if (this.boardRenderer.getGroup().children.length === 0) {
      this.boardRenderer.rebuildBoardBackground(rows, cols);
      this.cameraManager.frameBoard(rows, cols);
    }

    const currentKeys = new Set<string>();

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = board[r][c];
        const x = (c - (cols - 1) / 2) * 1.1;
        const y = ((rows - 1) / 2 - r) * 1.1;
        const key = tile.id;

        currentKeys.add(key);

        let meshGroup = this.tileMeshes.get(key);

        if (!meshGroup) {
          // New Candy Created
          meshGroup = this.candyRenderer.createCandyMeshGroup(tile);
          
          if (tile.isFalling && tile.fallOffset) {
            meshGroup.position.set(x, y + tile.fallOffset * 1.1, 0);
          } else {
            meshGroup.position.set(x, y, 0);
          }
          
          this.scene.add(meshGroup);
          this.tileMeshes.set(key, meshGroup);
        }

        // We do NOT use frame-by-frame physics lerp anymore. 
        // We use the AnimationEngine to tween to the target cleanly!
        if (meshGroup.position.x !== x || meshGroup.position.y !== y) {
           this.animation.to(meshGroup.position, 'x', x, 0.3);
           
           if (tile.isFalling) {
             // Fall animation (bounce at the end)
             this.animation.to(meshGroup.position, 'y', y, 0.4, (t) => {
               // Custom bounce out easing
               if (t < 1 / 2.75) return 7.5625 * t * t;
               else if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
               else if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
               else return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
             });
             tile.isFalling = false; // consume state
           } else {
             // Swap animation
             this.animation.to(meshGroup.position, 'y', y, 0.3);
           }
        }
      }
    }

    // Cleanup destroyed candies
    this.tileMeshes.forEach((meshGroup, key) => {
      if (!currentKeys.has(key)) {
        // Spawn explosion VFX before removing
        const c3 = meshGroup.position;
        // Basic hack to get color (since we don't have it directly mapped here, ideally we pass it)
        this.vfx.spawnExplosion(c3.x, c3.y, 'red', 10);
        
        this.scene.remove(meshGroup);
        this.tileMeshes.delete(key);
      }
    });
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const delta = this.clock.getDelta();
    
    const fps = 1 / delta;
    if (this.quality.updateAdaptiveQuality(fps, Date.now())) {
      this.applyQualitySettings();
    }

    this.animation.update(delta);
    this.vfx.update(delta);

    // Subtle idle floating for candies
    const time = this.clock.getElapsedTime();
    this.tileMeshes.forEach((meshGroup) => {
      // Find CandyMesh inside Group
      const candy = meshGroup.children.find(c => c.name === "CandyMesh");
      if (candy) {
        candy.rotation.y = Math.sin(time * 1.5 + meshGroup.position.y) * 0.1;
        candy.rotation.z = Math.cos(time * 2 + meshGroup.position.x) * 0.05;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationFrameId);
    this.environment.dispose();
    this.resources.disposeAll();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
