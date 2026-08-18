import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { TileData, CandyColor, CandyShape, SpecialType, BlockerType } from '../types';
import { CandyAssetRegistry } from './CandyDesignSystem/CandyAssetRegistry';
import { CandyVFXProfile } from './CandyDesignSystem/CandyVFXProfile';

interface ThreeCandyRendererProps {
  board: TileData[][];
  selectedCell: { row: number; col: number } | null;
  aiSuggestedSwap: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  onTileClick: (row: number, col: number) => void;
  onTileDragSwap: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  isProcessing: boolean;
}

export const ThreeCandyRenderer: React.FC<ThreeCandyRendererProps> = ({
  board,
  selectedCell,
  aiSuggestedSwap,
  onTileClick,
  onTileDragSwap,
  isProcessing,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const tileMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const particleGroupRef = useRef<THREE.Group | null>(null);
  const dragStartCell = useRef<{ row: number; col: number } | null>(null);
  // Create 3D Mesh Geometry for each Candy Shape
  const createCandyMeshGroup = (tile: TileData): THREE.Group => {
    const group = CandyAssetRegistry.createCandyGroup(tile.color, tile.shape, tile.special, tile.isWrappedCellophane);

    // Blocker overlay
    if (tile.blocker === 'frosting-1' || tile.blocker === 'frosting-2' || tile.blocker === 'frosting-3') {
      const fGeo = new THREE.BoxGeometry(0.9, 0.9, 0.4);
      const fMat = new THREE.MeshStandardMaterial({
        color: 0xfaf5ff,
        roughness: 0.8,
        bumpScale: 0.05,
      });
      group.add(new THREE.Mesh(fGeo, fMat));
    } else if (tile.blocker === 'chocolate') {
      const cGeo = new THREE.BoxGeometry(0.9, 0.9, 0.4);
      const cMat = new THREE.MeshStandardMaterial({ color: 0x2e180c, roughness: 0.3 });
      group.add(new THREE.Mesh(cGeo, cMat));
    }

    // Blue Jelly Tile Underlay
    if (tile.jellyLayers > 0) {
      const jellyGeo = new THREE.PlaneGeometry(0.95, 0.95);
      const jellyMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: tile.jellyLayers === 2 ? 0.7 : 0.4,
        side: THREE.DoubleSide,
      });
      const jellyMesh = new THREE.Mesh(jellyGeo, jellyMat);
      jellyMesh.position.z = -0.25;
      group.add(jellyMesh);
    }

    return group;
  };

  // Initialize Three.js Scene, Camera, Lights, and Animation Loop
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const maxDim = Math.max(board.length, board[0]?.length || 8);
    const cameraZ = 10.5 + Math.max(0, maxDim - 8) * 1.35;
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, -1.2, cameraZ);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xffd700, 1.0, 15);
    pointLight.position.set(-4, -4, 5);
    scene.add(pointLight);

    // Particle Group
    const particleGroup = new THREE.Group();
    scene.add(particleGroup);
    particleGroupRef.current = particleGroup;

    // Board background grid tiles
    const boardBgGroup = new THREE.Group();
    const rows = board.length;
    const cols = board[0]?.length || 8;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * 1.1;
        const y = ((rows - 1) / 2 - r) * 1.1;

        const bgGeo = new THREE.PlaneGeometry(1.02, 1.02);
        const bgMat = new THREE.MeshStandardMaterial({
          color: (r + c) % 2 === 0 ? 0xffffff : 0xf1f5f9,
          roughness: 0.5,
          side: THREE.DoubleSide,
        });
        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(x, y, -0.3);
        boardBgGroup.add(bgMesh);
      }
    }
    scene.add(boardBgGroup);

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();
      const delta = clock.getDelta();

      // Subtle float / breathing rotation and Physics-based falling for candy meshes
      tileMeshesRef.current.forEach((meshGroup, key) => {
        // Idle animation
        meshGroup.rotation.z = Math.sin(elapsedTime * 2 + meshGroup.position.x) * 0.05;
        meshGroup.rotation.y = Math.cos(elapsedTime * 1.5 + meshGroup.position.y) * 0.08;

        // Physics interpolation towards target
        if (meshGroup.userData.targetY !== undefined) {
          const targetY = meshGroup.userData.targetY;
          const targetX = meshGroup.userData.targetX;
          
          // X interpolation (for horizontal shifts/swaps)
          if (Math.abs(meshGroup.position.x - targetX) > 0.01) {
            meshGroup.position.x += (targetX - meshGroup.position.x) * 15 * delta;
          } else {
            meshGroup.position.x = targetX;
          }

          // Y falling physics with acceleration
          if (meshGroup.userData.isFalling && meshGroup.position.y > targetY) {
            meshGroup.userData.velocityY = (meshGroup.userData.velocityY || 0) - (20 * delta); // Gravity
            meshGroup.position.y += meshGroup.userData.velocityY * delta;
            
            // Bounce/stop at target
            if (meshGroup.position.y <= targetY) {
              meshGroup.position.y = targetY;
              meshGroup.userData.velocityY = 0;
              meshGroup.userData.isFalling = false;
              // Play tiny bounce squash/stretch?
              meshGroup.scale.set(1.1, 0.9, 1.0);
            }
          } else if (Math.abs(meshGroup.position.y - targetY) > 0.01) {
            // Smooth lerp for non-falling movements (swaps)
            meshGroup.position.y += (targetY - meshGroup.position.y) * 15 * delta;
          } else {
            meshGroup.position.y = targetY;
          }
          
          // Recover scale from bounce
          if (!meshGroup.userData.isFalling) {
            const targetScale = meshGroup.userData.targetScale || 1.0;
            meshGroup.scale.x += (targetScale - meshGroup.scale.x) * 10 * delta;
            meshGroup.scale.y += (targetScale - meshGroup.scale.y) * 10 * delta;
            meshGroup.scale.z += (targetScale - meshGroup.scale.z) * 10 * delta;
          }
        }
      });

      if (particleGroupRef.current) {
        CandyVFXProfile.updateParticles(particleGroupRef.current, Math.min(delta, 0.1));
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (rendererRef.current && rendererRef.current.domElement) {
        mountRef.current?.removeChild(rendererRef.current.domElement);
      }
    };
  }, []);

  // Sync board tiles with Three.js scene
  useEffect(() => {
    if (!sceneRef.current) return;

    const rows = board.length;
    const cols = board[0]?.length || 8;
    const currentKeys = new Set<string>();

    if (cameraRef.current) {
      const maxDim = Math.max(rows, cols);
      const cameraZ = 10.5 + Math.max(0, maxDim - 8) * 1.35;
      cameraRef.current.position.set(0, -1.2, cameraZ);
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const tile = board[r][c];
        const x = (c - (cols - 1) / 2) * 1.1;
        const y = ((rows - 1) / 2 - r) * 1.1;
        const key = tile.id;

        currentKeys.add(key);

        let meshGroup = tileMeshesRef.current.get(key);

        if (!meshGroup) {
          meshGroup = createCandyMeshGroup(tile);
          
          // If the tile is newly created and falling (refill), start it above the board
          if (tile.isFalling && tile.fallOffset) {
            meshGroup.position.set(x, y + tile.fallOffset * 1.1, 0);
          } else {
            meshGroup.position.set(x, y, 0);
          }
          
          sceneRef.current.add(meshGroup);
          tileMeshesRef.current.set(key, meshGroup);
        }

        // Set Physics Target
        meshGroup.userData.targetX = x;
        meshGroup.userData.targetY = y;
        if (tile.isFalling) {
          meshGroup.userData.isFalling = true;
        }

        // Highlight selected or AI suggested tile
        const isSelected = selectedCell?.row === r && selectedCell?.col === c;
        const isAiSuggested =
          aiSuggestedSwap &&
          ((aiSuggestedSwap.fromRow === r && aiSuggestedSwap.fromCol === c) ||
            (aiSuggestedSwap.toRow === r && aiSuggestedSwap.toCol === c));

        if (isSelected) {
          meshGroup.userData.targetScale = 1.25;
        } else if (isAiSuggested) {
          meshGroup.userData.targetScale = 1.15;
        } else {
          meshGroup.userData.targetScale = 1.0;
        }
      }
    }

    // Remove old tiles that are destroyed
    tileMeshesRef.current.forEach((meshGroup, key) => {
      if (!currentKeys.has(key)) {
        sceneRef.current?.remove(meshGroup);
        tileMeshesRef.current.delete(key);
      }
    });
  }, [board, selectedCell, aiSuggestedSwap]);

  // Handle pointer / click / drag swap interaction
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isProcessing) return;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const col = Math.floor((x / rect.width) * cols);
    const row = Math.floor((y / rect.height) * rows);

    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      dragStartCell.current = { row, col };
      onTileClick(row, col);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartCell.current || isProcessing) return;
    
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const currentCol = Math.floor((x / rect.width) * cols);
    const currentRow = Math.floor((y / rect.height) * rows);

    const start = dragStartCell.current;

    // Detect swipe (distance must be exactly 1 cell away)
    const dr = Math.abs(currentRow - start.row);
    const dc = Math.abs(currentCol - start.col);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      onTileDragSwap(start.row, start.col, currentRow, currentCol);
      dragStartCell.current = null; // Reset to prevent multiple triggers
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragStartCell.current || isProcessing) return;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const endCol = Math.floor((x / rect.width) * cols);
    const endRow = Math.floor((y / rect.height) * rows);

    const start = dragStartCell.current;
    dragStartCell.current = null;

    if (
      (start.row !== endRow || start.col !== endCol) &&
      endRow >= 0 &&
      endRow < rows &&
      endCol >= 0 &&
      endCol < cols
    ) {
      onTileDragSwap(start.row, start.col, endRow, endCol);
    }
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full max-w-[540px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-300/60 bg-gradient-to-b from-sky-900/80 via-indigo-900/90 to-purple-950/95 cursor-pointer touch-none select-none backdrop-blur-md"
    >
      {/* 2D/3D Overlay sparkles & AI suggestion indicator */}
      {aiSuggestedSwap && (
        <div className="absolute top-3 left-3 bg-amber-400/90 text-amber-950 font-bold px-3 py-1 rounded-full text-xs shadow-lg animate-pulse flex items-center gap-1.5 z-10">
          <span>✨ AI Hint Active</span>
        </div>
      )}
    </div>
  );
};
