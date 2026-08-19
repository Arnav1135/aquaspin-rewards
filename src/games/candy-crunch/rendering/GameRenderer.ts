import * as THREE from 'three';
import { QualityManager, QualityPreset } from './managers/QualityManager';
import { ResourceManager } from './managers/ResourceManager';
import { EnvironmentManager } from './managers/EnvironmentManager';
import { CameraManager } from './managers/CameraManager';
import { AnimationEngine } from './managers/AnimationEngine';
import { VFXManager } from './managers/VFXManager';
import { CascadeAnimationController } from './managers/CascadeAnimationController';
import { SpecialComboCinematics } from './managers/SpecialComboCinematics';
import { WorldVisualIdentity } from './managers/WorldVisualIdentity';
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
  public cascadeController: CascadeAnimationController;
  public specialComboCinematics: SpecialComboCinematics;
  public worldIdentity: WorldVisualIdentity;

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

    // Phase 2: Color Space & Tone Mapping
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    
    container.appendChild(this.renderer.domElement);
    this.clock = new THREE.Clock();

    // Initialize Sub-Systems
    this.quality = new QualityManager(preset);
    this.resources = new ResourceManager();
    this.environment = new EnvironmentManager(this.scene);
    this.animation = new AnimationEngine();
    this.cameraManager = new CameraManager(this.camera, this.animation);
    this.vfx = new VFXManager(this.scene);
    
    this.cascadeController = new CascadeAnimationController(
      this.animation,
      this.vfx,
      this.cameraManager,
      this.environment
    );

    this.specialComboCinematics = new SpecialComboCinematics(
      this.vfx,
      this.cameraManager,
      this.environment
    );

    this.worldIdentity = new WorldVisualIdentity(this.environment);
    
    this.boardRenderer = new BoardRenderer();
    this.scene.add(this.boardRenderer.getGroup());
    this.candyRenderer = new CandyRenderer(this.resources);

    this.applyQualitySettings();

    // Resize Event
    window.addEventListener('resize', this.onResize);

    // Phase 34: Event-Driven Logic Synchronization
    import('../engine/rules/RulesEngine').then(({ rulesEngine }) => {
      rulesEngine.eventBus.subscribe('SWAP_SUCCESS', async (e) => {
        this.renderBoard(e.payload.board);
      });
      rulesEngine.eventBus.subscribe('MATCH_RESOLVED', async (e) => {
        this.cascadeController.handleMatchResolved(e.payload.matchedTiles, this.tileMeshes, e.payload.cascadeDepth || 1);
        this.renderBoard(e.payload.board);
      });
      rulesEngine.eventBus.subscribe('REFILL', async (e) => {
        this.renderBoard(e.payload.board);
      });
      rulesEngine.eventBus.subscribe('CASCADE_ENDED', async (e) => {
        this.cascadeController.handleCascadeEnded(e.payload.cascadeCount || 0);
        this.renderBoard(e.payload.board);
      });
    });

    // Start Loop
    this.animate();
  }

  private applyQualitySettings() {
    const s = this.quality.getSettings();
    this.renderer.setPixelRatio(s.pixelRatio);
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
          meshGroup = this.candyRenderer.createCandyMeshGroup(tile);
          
          if (tile.isFalling && tile.fallOffset) {
            meshGroup.position.set(x, y + tile.fallOffset * 1.1, 0);
            this.animation.animateProfile(meshGroup, 'FALL', { x, y });
          } else {
            meshGroup.position.set(x, y, 0);
          }
          
          this.scene.add(meshGroup);
          this.tileMeshes.set(key, meshGroup);
        }

        if (meshGroup.position.x !== x || meshGroup.position.y !== y) {
          if (tile.isFalling) {
            this.animation.animateProfile(meshGroup, 'FALL', { x, y });
            tile.isFalling = false;
          } else {
            this.animation.animateProfile(meshGroup, 'SWAP', { x, y });
          }
        }
      }
    }

    // Cleanup destroyed candies
    this.tileMeshes.forEach((meshGroup, key) => {
      if (!currentKeys.has(key)) {
        this.animation.animateProfile(meshGroup, 'MATCH', undefined, () => {
          this.scene.remove(meshGroup);
          this.tileMeshes.delete(key);
        });
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
    this.cameraManager.update(delta);
    this.environment.update(delta);

    // Subtle idle floating for candies
    const time = this.clock.getElapsedTime();
    this.tileMeshes.forEach((meshGroup) => {
      const candy = meshGroup.children.find(c => c.name === "CandyMesh");
      if (candy) {
        candy.rotation.y = Math.sin(time * 1.5 + meshGroup.position.y) * 0.08;
        candy.rotation.z = Math.cos(time * 2 + meshGroup.position.x) * 0.04;
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  public dispose() {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.animationFrameId);
    this.environment.dispose();
    this.vfx.dispose();
    this.resources.disposeAll();
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
