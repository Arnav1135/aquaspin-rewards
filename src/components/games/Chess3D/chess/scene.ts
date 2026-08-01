import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TouchController, triggerHaptic } from './touch';
import { Chess, Square } from 'chess.js';
import gsap from 'gsap';
import { CameraPreset, ChessPieceData, GameMode, MaterialTheme, MoveRecord, PieceColor, PieceType } from '../types';
import { PIECE_GEOMETRIES } from './pieces';
import { createPieceMaterial } from './materials';
import { algebraToWorld, create3DBoard, createHighlightMesh, createBeaconMesh, createDestinationMarkerMesh, BoardMeshContainer } from './board';
import { createStudioHDRIEnvironment } from './textures';
import { soundFx } from '../audio/sound';
import { detectDeviceTier, QualityConfig } from './deviceTier';
import { CameraController } from './cameraController';

/**
 * Main 3D Chess Scene Manager
 * Controls WebGLRenderer, CameraController, TouchController, device quality tiers,
 * anti-occlusion fading, haptics, GSAP animations, raycasting, and rules sync.
 */

export class Chess3DScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private touchController: TouchController;
  private cameraController: CameraController;
  private qualityConfig: QualityConfig;

  private boardContainer: BoardMeshContainer;
  private pieceMeshes: Map<string, THREE.Mesh> = new Map(); // piece ID -> 3D Mesh
  private pieceDataMap: Map<string, ChessPieceData> = new Map(); // square -> PieceData

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  private selectedSquare: string | null = null;
  private legalMovesForSelected: string[] = [];
  private theme: MaterialTheme = 'wood-bronze';
  public allowedPlayerColor: PieceColor | null = null;

  private chess: Chess;
  private onMoveCallback?: (move: MoveRecord) => void;
  private onPromotionRequired?: (from: string, to: string, callback: (promo: string) => void) => void;
  private onStateChangeCallback?: () => void;

  private isAnimating = false;
  private animFrameId: number | null = null;
  private isTabVisible = true;

  // FPS calculation
  private lastFrameTime = performance.now();
  private frameCount = 0;
  private currentFPS = 60;

  // Off-board captured piece trays
  private capturedTrayWhiteIndex = 0;
  private capturedTrayBlackIndex = 0;
  private capturedMeshes: THREE.Mesh[] = [];

  // Visual Debug Overlay for 3D Engine vs Scene Mesh status
  private debugOverlayEl: HTMLDivElement | null = null;
  private isDebugExpanded = false;

  constructor(
    container: HTMLElement,
    chess: Chess,
    callbacks?: {
      onMove?: (move: MoveRecord) => void;
      onPromotion?: (from: string, to: string, callback: (promo: string) => void) => void;
      onStateChange?: () => void;
    }
  ) {
    this.container = container;
    this.chess = chess;
    this.onMoveCallback = callbacks?.onMove;
    this.onPromotionRequired = callbacks?.onPromotion;
    this.onStateChangeCallback = callbacks?.onStateChange;

    // Detect hardware capabilities
    this.qualityConfig = detectDeviceTier();

    // 1. Scene Setup - Off-white concrete background (#D2D1CD)
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd2d1cd);

    // 2. Camera Setup
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);

    // Default angle: high 60-deg pitch
    this.camera.position.set(0, 9.5, 10.5);

    // 3. WebGLRenderer Setup
    this.renderer = new THREE.WebGLRenderer({
      antialias: this.qualityConfig.tier !== 'low',
      powerPreference: 'high-performance',
      precision: this.qualityConfig.tier === 'low' ? 'mediump' : 'highp',
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityConfig.maxPixelRatio));
    this.renderer.setClearColor(0xd2d1cd, 1.0);

    if (this.qualityConfig.shadowMapEnabled) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = this.qualityConfig.shadowMapType;
    } else {
      this.renderer.shadowMap.enabled = false;
    }

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

  private setupLighting() {
    const shadowRes = this.qualityConfig.shadowMapSize;

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfffaed, 2.2);
    keyLight.position.set(8, 14, 10);
    if (this.qualityConfig.shadowMapEnabled) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = shadowRes;
      keyLight.shadow.mapSize.height = shadowRes;
      keyLight.shadow.bias = -0.0001;
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 30;
      keyLight.shadow.camera.left = -6;
      keyLight.shadow.camera.right = 6;
      keyLight.shadow.camera.top = 6;
      keyLight.shadow.camera.bottom = -6;
    }
    this.scene.add(keyLight);

    // Fill Light
    const fillLight = new THREE.DirectionalLight(0x88bbff, 1.0);
    fillLight.position.set(-10, 10, -8);
    this.scene.add(fillLight);

    // Rim Light
    const rimLight = new THREE.DirectionalLight(0xffd59e, 1.2);
    rimLight.position.set(0, 6, -12);
    this.scene.add(rimLight);

    // Ambient Soft Fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    // HDRI Environment reflection map (if tier supports it)
    if (this.qualityConfig.useHDRI) {
      try {
        const envTex = createStudioHDRIEnvironment(this.renderer);
        this.scene.environment = envTex;
      } catch {
        // Fallback
      }
    }
  }

  // Play short 1.2s cinematic sweep on scene initialization
  private playCinematicSweepIntro() {
    this.cameraController.playIntroSweep();
  }

  // Create visual debug overlay displaying engine vs 3D scene mesh sync state
  private initDebugOverlay() {
    if (this.debugOverlayEl || !this.container) return;

    const overlay = document.createElement('div');
    overlay.id = 'chess-3d-debug-overlay';
    overlay.className =
      'absolute top-[108px] right-2.5 sm:top-auto sm:bottom-3 sm:right-3 z-30 font-mono text-[10px] sm:text-[11px] bg-slate-900/90 text-slate-200 border border-slate-700/80 rounded-lg shadow-2xl backdrop-blur-md p-2 max-w-[220px] sm:max-w-[280px] pointer-events-auto transition-all duration-200 select-none';
    overlay.innerHTML = `
      <div class="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1.5 mb-1.5">
        <div class="flex items-center gap-1.5 font-semibold text-slate-100">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          3D Scene Debug
        </div>
        <button id="debug-toggle-btn" class="text-xs text-slate-400 hover:text-white px-1 font-bold">[+]</button>
      </div>
      <div id="debug-content" class="space-y-1" style="display: none;">
        <div class="flex justify-between">
          <span class="text-slate-400">Sync State:</span>
          <span id="debug-sync-status" class="font-bold text-emerald-400">SYNCED ✅</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Active Turn:</span>
          <span id="debug-turn" class="font-semibold text-sky-400">White (w)</span>
        </div>
        <div class="flex justify-between">
          <span class="text-slate-400">Pieces (Engine/3D):</span>
          <span id="debug-counts" class="font-semibold text-slate-200">32 / 32</span>
        </div>
        <div class="pt-1.5 flex gap-1.5 mt-1 border-t border-slate-800">
          <button id="debug-force-sync-btn" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] py-1 px-1.5 rounded border border-slate-700/80 text-center transition">Re-Sync</button>
          <button id="debug-log-state-btn" class="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] py-1 px-1.5 rounded border border-slate-700/80 text-center transition">Log Board</button>
        </div>
      </div>
    `;

    this.container.appendChild(overlay);
    this.debugOverlayEl = overlay;

    const toggleBtn = overlay.querySelector('#debug-toggle-btn');
    const contentEl = overlay.querySelector('#debug-content') as HTMLElement;
    if (toggleBtn && contentEl) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.isDebugExpanded = !this.isDebugExpanded;
        contentEl.style.display = this.isDebugExpanded ? 'block' : 'none';
        toggleBtn.textContent = this.isDebugExpanded ? '[-]' : '[+]';
      });
    }

    const syncBtn = overlay.querySelector('#debug-force-sync-btn');
    if (syncBtn) {
      syncBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('[Chess3DScene Debug Overlay] Manual Re-Sync triggered.');
        this.syncPiecesFromEngine();
      });
    }

    const logBtn = overlay.querySelector('#debug-log-state-btn');
    if (logBtn) {
      logBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.logEngineVsMeshBoardState();
      });
    }

    this.updateDebugOverlay();
  }

  public updateDebugOverlay() {
    if (!this.debugOverlayEl) return;

    const board = this.chess.board();
    let enginePieceCount = 0;
    let desyncCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const item = board[r][c];
        const square = `${String.fromCharCode(97 + c)}${8 - r}`;
        const pieceData = this.pieceDataMap.get(square);

        if (item) {
          enginePieceCount++;
          if (!pieceData || pieceData.type !== item.type || pieceData.color !== item.color) {
            desyncCount++;
          }
        } else if (pieceData) {
          desyncCount++;
        }
      }
    }

    const isSynced = desyncCount === 0 && enginePieceCount === this.pieceDataMap.size;

    const statusEl = this.debugOverlayEl.querySelector('#debug-sync-status');
    if (statusEl) {
      if (isSynced) {
        statusEl.className = 'font-bold text-emerald-400';
        statusEl.textContent = 'SYNCED ✅';
      } else {
        statusEl.className = 'font-bold text-amber-400 animate-pulse';
        statusEl.textContent = `DESYNC (${desyncCount}) ⚠️`;
      }
    }

    const turnEl = this.debugOverlayEl.querySelector('#debug-turn');
    if (turnEl) {
      const activeTurn = this.chess.turn();
      turnEl.textContent = activeTurn === 'w' ? 'White (w)' : 'Black (b)';
    }

    const countsEl = this.debugOverlayEl.querySelector('#debug-counts');
    if (countsEl) {
      countsEl.textContent = `${enginePieceCount} / ${this.pieceDataMap.size}`;
    }
  }

  // Synchronize 3D Pieces with current chess.js state
  public syncPiecesFromEngine() {
    this.isAnimating = false;
    this.clearSelection();

    this.capturedMeshes.forEach(mesh => this.scene.remove(mesh));
    this.capturedMeshes = [];
    this.capturedTrayWhiteIndex = 0;
    this.capturedTrayBlackIndex = 0;

    this.pieceMeshes.forEach(mesh => this.scene.remove(mesh));
    this.pieceMeshes.clear();
    this.pieceDataMap.clear();

    const board = this.chess.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const item = board[r][c];
        if (item) {
          const square = `${String.fromCharCode(97 + c)}${8 - r}`;
          const id = `${item.color}_${item.type}_${square}`;
          
          this.spawnPieceMesh(id, item.type, item.color as PieceColor, square);
        }
      }
    }

    this.updateCheckState();
    this.updateDebugOverlay();
  }

  // Console log debug function in the loop iterating board squares to compare engine vs mesh positions
  public logEngineVsMeshBoardState() {
    const board = this.chess.board();
    console.group(`[Chess3DScene Debug] Board Square Verification (Turn: ${this.chess.turn()})`);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const item = board[r][c];
        const square = `${String.fromCharCode(97 + c)}${8 - r}`;
        const pieceData = this.pieceDataMap.get(square);
        const mesh = pieceData ? this.pieceMeshes.get(pieceData.id) : null;

        const engineVal = item ? `${item.color.toUpperCase()}_${item.type.toUpperCase()}` : 'EMPTY';
        const meshVal = pieceData
          ? `${pieceData.color.toUpperCase()}_${pieceData.type.toUpperCase()} @ (x=${mesh?.position.x.toFixed(2)}, z=${mesh?.position.z.toFixed(2)})`
          : 'EMPTY';

        const isMatched =
          (!item && !pieceData) ||
          (item && pieceData && item.type === pieceData.type && item.color === pieceData.color);

        console.log(
          `Square [${square}]: Engine = ${engineVal} | Mesh = ${meshVal} | Status = ${isMatched ? '✅ SYNCED' : '❌ DESYNC'}`
        );
      }
    }
    console.groupEnd();
  }

  // Explicit 'sync-check' diagnostic comparing engine board state with 3D scene piece list
  public performSyncCheckDiagnostic(): boolean {
    if (this.isAnimating) return true;

    const board = this.chess.board();
    let isSynced = true;
    let enginePieceCount = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const item = board[r][c];
        const square = `${String.fromCharCode(97 + c)}${8 - r}`;
        const pieceData = this.pieceDataMap.get(square);

        if (item) {
          enginePieceCount++;
          if (!pieceData || pieceData.type !== item.type || pieceData.color !== item.color) {
            console.warn(
              `[Chess3DScene Sync Diagnostic] Mismatch at ${square}: Engine=${item.color}_${item.type}, 3D Scene=${pieceData ? pieceData.color + '_' + pieceData.type : 'NONE'}`
            );
            isSynced = false;
          }
        } else {
          if (pieceData) {
            console.warn(
              `[Chess3DScene Sync Diagnostic] Mismatch at ${square}: Engine=EMPTY, 3D Scene=${pieceData.color}_${pieceData.type}`
            );
            isSynced = false;
          }
        }
      }
    }

    if (isSynced && this.pieceDataMap.size !== enginePieceCount) {
      console.warn(
        `[Chess3DScene Sync Diagnostic] Total count mismatch: Engine=${enginePieceCount}, 3D Scene=${this.pieceDataMap.size}`
      );
      isSynced = false;
    }

    if (!isSynced) {
      console.warn('[Chess3DScene Sync Diagnostic] Mismatch found! Clearing current 3D piece layer and re-rendering all pieces from engine state.');
      this.syncPiecesFromEngine();
    } else {
      console.log('[Chess3DScene Sync Diagnostic] ✅ Sync check passed. Engine and 3D scene piece list are in 100% sync.');
    }

    this.updateDebugOverlay();
    return isSynced;
  }

  // Rigorous verification loop comparing internal chess.js board array with scene piece data map
  public verifyEngineSync(): boolean {
    return this.performSyncCheckDiagnostic();
  }

  private spawnPieceMesh(id: string, type: PieceType, color: PieceColor, square: string): THREE.Mesh {
    const geoFn = PIECE_GEOMETRIES[type];
    const geo = geoFn ? geoFn() : PIECE_GEOMETRIES.p();
    const mat = createPieceMaterial(color, this.theme);

    const mesh = new THREE.Mesh(geo, mat);
    if (this.qualityConfig.shadowMapEnabled) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }

    const worldPos = algebraToWorld(square);
    mesh.position.set(worldPos.x, 0, worldPos.z);

    if (color === 'b') {
      mesh.rotation.y = Math.PI;
    }

    mesh.userData = { id, type, color, square };
    this.scene.add(mesh);

    this.pieceMeshes.set(id, mesh);
    this.pieceDataMap.set(square, { id, type, color, square });

    return mesh;
  }

  // Visual helper sphere rendered at exact raycast intersection point when clicking 3D pieces/board
  private hitMarkerMesh: THREE.Mesh | null = null;

  private createHitMarker() {
    const geo = new THREE.SphereGeometry(0.12, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.95 });
    this.hitMarkerMesh = new THREE.Mesh(geo, mat);
    this.hitMarkerMesh.visible = false;
    this.scene.add(this.hitMarkerMesh);
  }

  private showHitMarkerAt(point: THREE.Vector3) {
    if (!this.hitMarkerMesh) this.createHitMarker();
    if (this.hitMarkerMesh) {
      this.hitMarkerMesh.position.copy(point);
      this.hitMarkerMesh.visible = true;
      gsap.killTweensOf(this.hitMarkerMesh.scale);
      this.hitMarkerMesh.scale.set(1.4, 1.4, 1.4);
      gsap.to(this.hitMarkerMesh.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          if (this.hitMarkerMesh) this.hitMarkerMesh.visible = false;
        },
      });
    }
  }

  // Pointer & Touch Interaction Handler with Debug Logging Layer
  private pointerDownX = 0;
  private pointerDownY = 0;

  private onPointerDown = (event: PointerEvent) => {
    event.stopPropagation();
    this.pointerDownX = event.clientX;
    this.pointerDownY = event.clientY;
    const targetEl = event.target as HTMLElement;
    const targetTag = targetEl?.tagName || 'UNKNOWN';
    const targetId = targetEl?.id ? `#${targetEl.id}` : '';

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      // Filter out non-interactive meshes (lights, environment, frame) upfront on pointerdown
      const interactiveMeshes = this.getInteractiveMeshes();
      const intersects = this.raycaster.intersectObjects(interactiveMeshes, true);
      if (intersects.length > 0) {
        console.log(
          `[Chess3DScene Debug] PointerDown hit interactive object: ${intersects[0].object.type} at NDC: (${this.mouse.x.toFixed(3)}, ${this.mouse.y.toFixed(3)})`
        );
      }
    }

    console.log(
      `[Chess3DScene Debug] PointerDown on target: ${targetTag}${targetId} at raw screen coords: (${event.clientX}, ${event.clientY})`
    );
  };

  private getInteractiveMeshes(): THREE.Object3D[] {
    const interactiveMeshes: THREE.Object3D[] = [];
    this.pieceMeshes.forEach(mesh => {
      if (mesh.visible && mesh.userData && mesh.userData.square) {
        interactiveMeshes.push(mesh);
      }
    });
    this.boardContainer.tiles.forEach(tile => {
      if (tile.visible) {
        interactiveMeshes.push(tile);
      }
    });
    return interactiveMeshes;
  }

  private onPointerUp = (event: PointerEvent) => {
    event.stopPropagation();
    if (this.isAnimating) return;

    const targetEl = event.target as HTMLElement;
    const targetTag = targetEl?.tagName || 'UNKNOWN';
    const targetId = targetEl?.id ? `#${targetEl.id}` : '';

    // Ignore if drag distance > 22 pixels (user was rotating or panning camera on mobile)
    const dist = Math.hypot(event.clientX - this.pointerDownX, event.clientY - this.pointerDownY);
    if (dist > 22) return;

    // Lock input if current turn does not match allowed player color (in AI / online mode)
    if (this.allowedPlayerColor && this.chess.turn() !== this.allowedPlayerColor) {
      return;
    }

    const rect = this.renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Calculate raw screen coordinates and normalized device coordinates (NDC)
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    console.log(
      `[Chess3DScene Debug] Canvas Pointer Click | Target: ${targetTag}${targetId} | Raw Screen: (${event.clientX}, ${event.clientY}) | NDC: (${this.mouse.x.toFixed(4)}, ${this.mouse.y.toFixed(4)})`
    );

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // High performance raycasting: filter non-interactive meshes upfront (only test active board pieces and tiles)
    const interactiveMeshes = this.getInteractiveMeshes();
    const intersects = this.raycaster.intersectObjects(interactiveMeshes, true);

    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;
      console.log(
        `[Chess3DScene Raycast Debug] Ray Hit 3D Intersection Point: (${hitPoint.x.toFixed(2)}, ${hitPoint.y.toFixed(2)}, ${hitPoint.z.toFixed(2)}) on object: ${intersects[0].object.type}`
      );

      // Render temporary visual sphere at raycast intersection point
      this.showHitMarkerAt(hitPoint);

      // Find objects with piece or tile userData up the hierarchy
      const resolvedObjects = intersects
        .map(hit => {
          let obj: THREE.Object3D | null = hit.object;
          while (obj && (!obj.userData || (!obj.userData.square && !obj.userData.isTile))) {
            obj = obj.parent;
          }
          return obj;
        })
        .filter((obj): obj is THREE.Object3D => obj !== null);

      // Prioritize piece objects over tile objects
      const pieceHit = resolvedObjects.find(obj => obj.userData && obj.userData.type);
      const chosenHit = pieceHit || resolvedObjects[0];

      if (chosenHit && chosenHit.userData && chosenHit.userData.square) {
        const square = chosenHit.userData.square;
        const pieceData = this.pieceDataMap.get(square);

        // If piece belongs to active player turn -> Select piece
        if (pieceData && pieceData.color === this.chess.turn()) {
          soundFx.playClick();
          triggerHaptic('pickup');
          this.selectSquare(square);
          return;
        }

        // If piece was already selected and clicked an enemy piece -> Attempt capture move
        if (this.selectedSquare && this.legalMovesForSelected.includes(square)) {
          this.executeMove(this.selectedSquare, square);
          return;
        }
      }

      // Clicked an empty tile square
      if (chosenHit && chosenHit.userData && chosenHit.userData.isTile) {
        const targetSquare = chosenHit.userData.square;
        if (this.selectedSquare && this.legalMovesForSelected.includes(targetSquare)) {
          this.executeMove(this.selectedSquare, targetSquare);
          return;
        }
      }
    }

    // Clicked outside -> deselect
    this.clearSelection();
  };

  private onPointerMove = (event: PointerEvent) => {
    event.stopPropagation();
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private selectSquare(square: string) {
    this.selectedSquare = square;

    const legalMoves = this.chess.moves({ square: square as Square, verbose: true });
    this.legalMovesForSelected = legalMoves.map(m => m.to);

    this.updateHighlights();

    // Subtle upward lift for selected piece
    const pieceData = this.pieceDataMap.get(square);
    if (pieceData) {
      const mesh = this.pieceMeshes.get(pieceData.id);
      if (mesh) {
        gsap.to(mesh.position, {
          y: 0.25,
          duration: 0.2,
          ease: 'power1.out',
        });
      }
    }
  }

  private clearSelection(skipMeshReset: boolean = false) {
    if (this.selectedSquare && !skipMeshReset) {
      const pieceData = this.pieceDataMap.get(this.selectedSquare);
      if (pieceData) {
        const mesh = this.pieceMeshes.get(pieceData.id);
        if (mesh) {
          gsap.to(mesh.position, {
            y: 0,
            duration: 0.15,
            ease: 'power1.in',
          });
        }
      }
    }

    this.selectedSquare = null;
    this.legalMovesForSelected = [];
    this.updateHighlights();
  }

  private updateHighlights() {
    while (this.boardContainer.highlightGroup.children.length > 0) {
      const child = this.boardContainer.highlightGroup.children[0];
      this.boardContainer.highlightGroup.remove(child);
    }

    const legalPositions: THREE.Vector3[] = [];

    // Selected square highlight
    if (this.selectedSquare) {
      const selectMesh = createHighlightMesh('select');
      const pos = algebraToWorld(this.selectedSquare);
      selectMesh.position.set(pos.x, 0.005, pos.z);
      this.boardContainer.highlightGroup.add(selectMesh);
    }

    // Legal moves highlights + Beacons + Translucent Destination Markers
    this.legalMovesForSelected.forEach(targetSq => {
      const legalMesh = createHighlightMesh('legal');
      const beaconMesh = createBeaconMesh();
      const pos = algebraToWorld(targetSq);

      const isCaptureTarget = this.pieceDataMap.has(targetSq);
      const destMarker = createDestinationMarkerMesh(isCaptureTarget);

      legalMesh.position.set(pos.x, 0.005, pos.z);
      beaconMesh.position.set(pos.x, 0.2, pos.z);
      destMarker.position.set(pos.x, 0.012, pos.z);

      this.boardContainer.highlightGroup.add(legalMesh);
      this.boardContainer.highlightGroup.add(destMarker);
      this.boardContainer.highlightGroup.add(beaconMesh);

      legalPositions.push(pos);
    });

    // Anti-occlusion fading for blocking tall pieces
    this.cameraController.updateAntiOcclusion(this.pieceMeshes, legalPositions);

    this.updateCheckState();
  }

  // Particle burst animation for piece captures
  private triggerCaptureParticles(position: THREE.Vector3, pieceColor: PieceColor) {
    const particleCount = 20;
    const group = new THREE.Group();
    group.position.copy(position);
    group.position.y = 0.3;

    const geo = new THREE.SphereGeometry(0.06, 8, 8);
    const colorHex = pieceColor === 'w' ? 0xfff3c4 : 0x475569;
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
    });

    const particles: THREE.Mesh[] = [];
    for (let i = 0; i < particleCount; i++) {
      const p = new THREE.Mesh(geo, mat.clone());
      group.add(p);
      particles.push(p);

      const angle = Math.random() * Math.PI * 2;
      const radius = 0.35 + Math.random() * 0.85;
      const targetX = Math.cos(angle) * radius;
      const targetZ = Math.sin(angle) * radius;
      const targetY = 0.4 + Math.random() * 1.1;

      gsap.to(p.position, {
        x: targetX,
        y: targetY,
        z: targetZ,
        duration: 0.55,
        ease: 'power2.out',
      });

      gsap.to(p.scale, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.55,
        ease: 'power2.in',
      });

      gsap.to(p.material, {
        opacity: 0,
        duration: 0.55,
        ease: 'power2.in',
      });
    }

    this.scene.add(group);

    gsap.delayedCall(0.6, () => {
      particles.forEach(p => {
        p.geometry.dispose();
        (p.material as THREE.Material).dispose();
      });
      this.scene.remove(group);
    });
  }

  private updateCheckState() {
    if (this.chess.inCheck()) {
      const turn = this.chess.turn();
      const board = this.chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const item = board[r][c];
          if (item && item.type === 'k' && item.color === turn) {
            const square = `${String.fromCharCode(97 + c)}${8 - r}`;
            const checkMesh = createHighlightMesh('check');
            const pos = algebraToWorld(square);
            checkMesh.position.set(pos.x, 0.006, pos.z);
            this.boardContainer.highlightGroup.add(checkMesh);
          }
        }
      }
    }
  }

  public currentGameMode: GameMode = 'pvp';

  public setGameMode(mode: GameMode, userColor: PieceColor = 'w') {
    this.currentGameMode = mode;

    if (mode === 'ai' || mode === 'online') {
      this.allowedPlayerColor = userColor;
    } else {
      this.allowedPlayerColor = null;
    }

    const activeTurn = this.chess.turn();
    console.log(`[Chess3DScene] setGameMode('${mode}') -> GSAP timeline camera sequence (userColor: ${userColor}, activeTurn: ${activeTurn})`);
    this.cameraController.animateGameModeSequence(mode, userColor, activeTurn);

    this.updateDebugOverlay();
  }

  // Execute chess move with GSAP 3D piece animation
  public executeMove(from: string, to: string, overridePromotion?: string) {
    const pieceData = this.pieceDataMap.get(from);
    if (!pieceData) return;

    if (
      pieceData.type === 'p' &&
      ((pieceData.color === 'w' && to[1] === '8') || (pieceData.color === 'b' && to[1] === '1')) &&
      !overridePromotion
    ) {
      if (this.onPromotionRequired) {
        this.onPromotionRequired(from, to, promo => {
          this.executeMove(from, to, promo);
        });
        return;
      }
    }

    const promo = overridePromotion || 'q';

    let moveResult = null;
    try {
      moveResult = this.chess.move({ from, to, promotion: promo });
    } catch {
      this.clearSelection();
      return;
    }

    if (!moveResult) {
      this.clearSelection();
      return;
    }

    this.isAnimating = true;
    this.clearSelection(true);

    const pieceMesh = this.pieceMeshes.get(pieceData.id);
    const targetWorldPos = algebraToWorld(to);

    if (!pieceMesh) {
      this.isAnimating = false;
      return;
    }

    const isCapture = !!moveResult.captured;
    let capturedSquare = to;
    if (moveResult.flags.includes('e')) {
      capturedSquare = `${to[0]}${from[1]}`;
    }
    const capturedPieceData = isCapture ? this.pieceDataMap.get(capturedSquare) : undefined;

    // Immediately sync 3D scene pieceDataMap with chess.js engine state
    this.pieceDataMap.delete(from);
    pieceData.square = to;
    pieceMesh.userData.square = to;
    this.pieceDataMap.set(to, pieceData);

    // Handle Castling Rook 3D Movement
    if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
      let rookFrom = '';
      let rookTo = '';
      if (moveResult.color === 'w') {
        if (moveResult.flags.includes('k')) { rookFrom = 'h1'; rookTo = 'f1'; }
        else { rookFrom = 'a1'; rookTo = 'd1'; }
      } else {
        if (moveResult.flags.includes('k')) { rookFrom = 'h8'; rookTo = 'f8'; }
        else { rookFrom = 'a8'; rookTo = 'd8'; }
      }

      const rookData = this.pieceDataMap.get(rookFrom);
      if (rookData) {
        const rookMesh = this.pieceMeshes.get(rookData.id);
        if (rookMesh) {
          const rookTargetPos = algebraToWorld(rookTo);
          gsap.to(rookMesh.position, {
            x: rookTargetPos.x,
            z: rookTargetPos.z,
            duration: 0.45,
            delay: 0.05,
            ease: 'power2.inOut',
          });
          rookData.square = rookTo;
          rookMesh.userData.square = rookTo;
          this.pieceDataMap.delete(rookFrom);
          this.pieceDataMap.set(rookTo, rookData);
        }
      }
    }

    // Handle Captured Piece Animation
    if (isCapture && capturedPieceData) {
      triggerHaptic('capture');
      const capturedMesh = this.pieceMeshes.get(capturedPieceData.id);
      if (capturedMesh) {
        soundFx.playClack();
        this.capturedMeshes.push(capturedMesh);

        // Spawn particle burst effect at capture square
        const capPos = algebraToWorld(capturedSquare);
        this.triggerCaptureParticles(capPos, capturedPieceData.color);

        capturedMesh.userData = {}; // clear square and tile tracking so tray pieces don't block raycasting

        const trayX = capturedPieceData.color === 'w' ? -5.2 : 5.2;
        const trayIndex =
          capturedPieceData.color === 'w' ? this.capturedTrayWhiteIndex++ : this.capturedTrayBlackIndex++;
        const trayZ = -3.5 + (trayIndex % 8) * 0.9;

        gsap.timeline()
          .to(capturedMesh.scale, {
            x: 0.3,
            y: 0.3,
            z: 0.3,
            duration: 0.2,
            ease: 'power2.in',
          })
          .to(capturedMesh.position, {
            y: 1.4,
            duration: 0.2,
            ease: 'power2.out',
          }, 0)
          .to(capturedMesh.position, {
            x: trayX,
            z: trayZ,
            y: 0.1,
            duration: 0.45,
            ease: 'power2.inOut',
          })
          .to(capturedMesh.scale, {
            x: 1,
            y: 1,
            z: 1,
            duration: 0.3,
            ease: 'back.out(1.4)',
          }, '-=0.25')
          .to(capturedMesh.rotation, {
            z: Math.PI / 2,
            duration: 0.3,
          }, '<');

        this.pieceMeshes.delete(capturedPieceData.id);
        this.pieceDataMap.delete(capturedSquare);
      }
    } else {
      triggerHaptic('move');
    }

    // Smooth Parabolic GSAP Piece Glide Animation Sequence
    const startX = pieceMesh.position.x;
    const startZ = pieceMesh.position.z;
    const moveDist = Math.hypot(targetWorldPos.x - startX, targetWorldPos.z - startZ);
    const arcHeight = Math.min(1.1, Math.max(0.55, moveDist * 0.16));

    const moveTimeline = gsap.timeline({
      onComplete: () => {
        try {
          if (pieceMesh) {
            // Lock position explicitly to target world grid coordinates after glide completes
            pieceMesh.position.set(targetWorldPos.x, 0, targetWorldPos.z);
          }

          if (moveResult.promotion) {
            this.scene.remove(pieceMesh);
            this.pieceMeshes.delete(pieceData.id);
            this.spawnPieceMesh(pieceData.id, moveResult.promotion as PieceType, pieceData.color, to);
          }

          // Explicit 'sync-check' diagnostic comparing chess.js board with 3D scene piece list
          this.performSyncCheckDiagnostic();

          // Notify UI & engine state subscriber
          if (this.onStateChangeCallback) {
            this.onStateChangeCallback();
          }

          // Trigger move event record
          if (this.onMoveCallback) {
            this.onMoveCallback({
              san: moveResult.san,
              from,
              to,
              piece: moveResult.piece as PieceType,
              color: moveResult.color as PieceColor,
              captured: moveResult.captured as PieceType | undefined,
              promotion: moveResult.promotion,
              inCheck: this.chess.inCheck(),
            });
          }

          this.updateDebugOverlay();

          if (this.chess.inCheck()) {
            soundFx.playChime();
            triggerHaptic('check');
            this.cameraController.animateCheckPulse();
          }

          if (this.chess.isGameOver()) {
            soundFx.playVictory();
            this.cameraController.animateVictoryView();
          } else {
            // Camera behavior according to mode
            if (this.currentGameMode === 'pvp') {
              // Pass & Play (Hotseat): Smooth 180° rotation after move so Black/White sees board from their side!
              this.cameraController.flipBoardToColor(this.chess.turn());
            } else {
              // AI or Online: Camera stays fixed on player side
              this.cameraController.recenterAfterMove();
            }
          }
        } catch (err) {
          console.error('Error in move completion:', err);
        } finally {
          this.isAnimating = false;
        }
      },
    });

    moveTimeline
      .to(pieceMesh.position, {
        x: targetWorldPos.x,
        z: targetWorldPos.z,
        duration: 0.48,
        ease: 'power2.inOut',
      }, 0)
      .to(pieceMesh.position, {
        y: arcHeight,
        duration: 0.24,
        ease: 'power2.out',
      }, 0)
      .to(pieceMesh.position, {
        y: 0,
        duration: 0.24,
        ease: 'power2.in',
        onStart: () => {
          if (isCapture) {
            soundFx.playClack();
          } else {
            soundFx.playThud();
          }
        },
      }, 0.24);
  }

  // Camera Presets & Manual Rotation Controls
  public setCameraPreset(preset: CameraPreset) {
    this.cameraController.setPreset(preset, this.container.clientWidth / this.container.clientHeight < 1.0);
  }

  public rotateCameraLeft() {
    this.cameraController.rotateLeft();
  }

  public rotateCameraRight() {
    this.cameraController.rotateRight();
  }

  public resetCamera() {
    this.cameraController.resetCamera();
  }

  // Flip board manually or for active player turn
  public flipBoard(color?: PieceColor) {
    const activeColor = color || this.chess.turn();
    this.cameraController.flipBoardToColor(activeColor);
  }

  // Theme Toggler
  public setTheme(newTheme: MaterialTheme) {
    this.theme = newTheme;
    this.boardContainer.updateTheme(newTheme);

    this.pieceMeshes.forEach(mesh => {
      if (mesh.userData && mesh.userData.color) {
        mesh.material = createPieceMaterial(mesh.userData.color, newTheme);
      }
    });
  }

  public getQualityTier(): string {
    return this.qualityConfig.tier;
  }

  public getFPS(): number {
    return Math.round(this.currentFPS);
  }

  private onVisibilityChange = () => {
    this.isTabVisible = !document.hidden;
  };

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.cameraController.updateResponsiveFraming();
    this.renderer.setSize(width, height);
  };

  private animate = () => {
    this.animFrameId = requestAnimationFrame(this.animate);

    // Throttle render loop if tab is in background to save device battery
    if (!this.isTabVisible) return;

    // Measure FPS
    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.currentFPS = (this.frameCount * 1000) / (now - this.lastFrameTime);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    this.cameraController.update();

    // Dynamically adjust board coordinate label scale & visibility based on camera distance
    if (this.boardContainer.updateLabels) {
      const cameraDistance = this.camera.position.length();
      this.boardContainer.updateLabels(cameraDistance);
    }

    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    window.removeEventListener('resize', this.onWindowResize);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.onPointerUp);
    this.renderer.domElement.removeEventListener('pointermove', this.onPointerMove);
    if (this.touchController) this.touchController.dispose();
    if (this.debugOverlayEl && this.debugOverlayEl.parentNode) {
      this.debugOverlayEl.parentNode.removeChild(this.debugOverlayEl);
      this.debugOverlayEl = null;
    }
    this.renderer.dispose();
  }
}
