import * as THREE from 'three';
import { MaterialTheme } from '../types';
import { createTileMaterials, createFrameMaterial } from './materials';

/**
 * 3D Chessboard Construction
 * 8x8 grid of individual tiles (1.0 x 1.0 unit each) centered at origin (0,0,0).
 * Coordinates: File A = x -3.5, File H = x +3.5
 *              Rank 1 = z +3.5, Rank 8 = z -3.5
 */

export interface BoardMeshContainer {
  group: THREE.Group;
  tiles: Map<string, THREE.Mesh>; // e.g. "e4" -> Mesh
  tilePositions: Map<string, THREE.Vector3>; // "e4" -> Vector3(x, 0, z)
  highlightGroup: THREE.Group;
  updateTheme: (theme: MaterialTheme) => void;
  updateLabels?: (cameraDistance: number) => void;
}

export function algebraToWorld(square: string): THREE.Vector3 {
  const file = square.charCodeAt(0) - 97; // 'a' -> 0, 'h' -> 7
  const rank = parseInt(square[1], 10) - 1; // '1' -> 0, '8' -> 7

  const x = file - 3.5;
  const z = 3.5 - rank;
  return new THREE.Vector3(x, 0, z);
}

export function worldToAlgebra(pos: THREE.Vector3): string | null {
  const fileIdx = Math.round(pos.x + 3.5);
  const rankIdx = Math.round(3.5 - pos.z);

  if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return null;

  const fileChar = String.fromCharCode(97 + fileIdx);
  const rankNum = rankIdx + 1;
  return `${fileChar}${rankNum}`;
}

export function create3DBoard(theme: MaterialTheme): BoardMeshContainer {
  const boardGroup = new THREE.Group();
  const tilesMap = new Map<string, THREE.Mesh>();
  const positionsMap = new Map<string, THREE.Vector3>();

  const { light: lightMat, dark: darkMat } = createTileMaterials();

  // Beveled Square Tile Geometry
  const tileGeo = new THREE.BoxGeometry(0.98, 0.1, 0.98);

  // 1. Build 8x8 Squares
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const isLight = (file + rank) % 2 === 1; // standard chessboard light square condition
      const squareName = `${String.fromCharCode(97 + file)}${rank + 1}`;
      const mat = isLight ? lightMat : darkMat;

      const tileMesh = new THREE.Mesh(tileGeo, mat);
      const worldPos = algebraToWorld(squareName);
      tileMesh.position.set(worldPos.x, -0.05, worldPos.z);
      tileMesh.receiveShadow = true;
      tileMesh.castShadow = true;
      tileMesh.userData = { square: squareName, isTile: true };

      boardGroup.add(tileMesh);
      tilesMap.set(squareName, tileMesh);
      positionsMap.set(squareName, worldPos.clone());
    }
  }

  // 2. Outer Frame
  const frameMat = createFrameMaterial(theme);
  const outerFrameGeo = new THREE.BoxGeometry(9.2, 0.22, 9.2);
  const innerFrameGeo = new THREE.BoxGeometry(8.05, 0.25, 8.05);

  // Frame Border Shell
  const frameMesh = new THREE.Mesh(outerFrameGeo, frameMat);
  frameMesh.position.set(0, -0.12, 0);
  frameMesh.receiveShadow = true;
  frameMesh.castShadow = true;
  boardGroup.add(frameMesh);

  // 3. Ground Plane for Contact Shadows
  const groundGeo = new THREE.PlaneGeometry(30, 30);
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = -0.23;
  groundMesh.receiveShadow = true;
  boardGroup.add(groundMesh);

  // 4. Highlight Overlays Group
  const highlightGroup = new THREE.Group();
  boardGroup.add(highlightGroup);

  // 5. Coordinate Labels Overlay
  const { group: labelsGroup, updateLabels } = createCoordinateLabels();
  boardGroup.add(labelsGroup);

  const updateTheme = (newTheme: MaterialTheme) => {
    frameMesh.material = createFrameMaterial(newTheme);
  };

  return {
    group: boardGroup,
    tiles: tilesMap,
    tilePositions: positionsMap,
    highlightGroup,
    updateTheme,
    updateLabels,
  };
}

/**
 * Creates small, unobtrusive coordinate labels (a-h, 1-8) along the board frame edges
 */
function createTextCanvasTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 128, 128);

  ctx.font = '900 68px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // High contrast subtle dark outline
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.lineWidth = 10;
  ctx.strokeText(text, 64, 64);

  // Bright crisp text
  ctx.fillStyle = '#f8fafc';
  ctx.fillText(text, 64, 64);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function createCoordinateLabels(): { group: THREE.Group; updateLabels: (dist: number) => void } {
  const labelsGroup = new THREE.Group();
  const labelMeshes: THREE.Mesh[] = [];

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const planeGeo = new THREE.PlaneGeometry(0.38, 0.38);
  planeGeo.rotateX(-Math.PI / 2);

  const textureMap = new Map<string, THREE.CanvasTexture>();

  const getTexture = (str: string) => {
    if (!textureMap.has(str)) {
      textureMap.set(str, createTextCanvasTexture(str));
    }
    return textureMap.get(str)!;
  };

  // Outer Frame Edges Labels
  // File labels (a-h) along front (z = 4.18) & back (z = -4.18) frame
  files.forEach((fileChar, i) => {
    const x = i - 3.5;
    const tex = getTexture(fileChar);

    // Front edge
    const matFront = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meshFront = new THREE.Mesh(planeGeo, matFront);
    meshFront.position.set(x, 0.006, 4.18);
    labelsGroup.add(meshFront);
    labelMeshes.push(meshFront);

    // Back edge
    const matBack = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meshBack = new THREE.Mesh(planeGeo, matBack);
    meshBack.position.set(x, 0.006, -4.18);
    meshBack.rotation.y = Math.PI;
    labelsGroup.add(meshBack);
    labelMeshes.push(meshBack);
  });

  // Rank labels (1-8) along left (x = -4.18) & right (x = 4.18) frame
  ranks.forEach((rankChar, i) => {
    const z = 3.5 - i;
    const tex = getTexture(rankChar);

    // Left edge
    const matLeft = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meshLeft = new THREE.Mesh(planeGeo, matLeft);
    meshLeft.position.set(-4.18, 0.006, z);
    meshLeft.rotation.y = Math.PI / 2;
    labelsGroup.add(meshLeft);
    labelMeshes.push(meshLeft);

    // Right edge
    const matRight = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.85,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const meshRight = new THREE.Mesh(planeGeo, matRight);
    meshRight.position.set(4.18, 0.006, z);
    meshRight.rotation.y = -Math.PI / 2;
    labelsGroup.add(meshRight);
    labelMeshes.push(meshRight);
  });

  // Dynamic visibility and scale adjustment based on camera distance
  const updateLabels = (cameraDistance: number) => {
    // Distance typically ranges from 5.0 (close zoom) to 18.0 (far zoom)
    const scale = THREE.MathUtils.clamp(0.65 + (cameraDistance - 5) * 0.045, 0.65, 1.35);
    const opacity = THREE.MathUtils.clamp(0.65 + (cameraDistance - 5) * 0.025, 0.65, 0.98);

    labelMeshes.forEach(mesh => {
      mesh.scale.set(scale, scale, scale);
      (mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
    });
  };

  return { group: labelsGroup, updateLabels };
}

/**
 * Creates glowing overlay tiles for selected squares, legal target moves, and check alerts
 */
export function createHighlightMesh(type: 'select' | 'legal' | 'lastMove' | 'check'): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(0.96, 0.96);
  geo.rotateX(-Math.PI / 2);

  let color = 0xffff00; // yellow for selection
  let opacity = 0.45;

  if (type === 'legal') {
    color = 0x22c55e; // emerald green for legal target move
    opacity = 0.55;
  } else if (type === 'lastMove') {
    color = 0x3b82f6; // blue for last moved squares
    opacity = 0.35;
  } else if (type === 'check') {
    color = 0xef4444; // ruby red for king in check
    opacity = 0.7;
  }

  const mat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.005; // Slightly above tile surface to prevent z-fighting
  return mesh;
}

/**
 * Creates a subtle upward-glowing particle beam cylinder on legal move squares for high visibility
 */
export function createBeaconMesh(): THREE.Group {
  const group = new THREE.Group();

  // Vertical light column beam
  const geo = new THREE.CylinderGeometry(0.2, 0.35, 1.2, 16, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x10b981,
    transparent: true,
    opacity: 0.38,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const beam = new THREE.Mesh(geo, mat);
  beam.position.y = 0.6; // Center height of 1.2 cylinder
  group.add(beam);

  // Top halo ring
  const ringGeo = new THREE.RingGeometry(0.12, 0.22, 16);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 1.2;
  group.add(ring);

  return group;
}

/**
 * Creates translucent circle markers / target rings for valid move destinations
 */
export function createDestinationMarkerMesh(isCapture: boolean): THREE.Mesh {
  if (isCapture) {
    // Translucent capture ring
    const geo = new THREE.RingGeometry(0.28, 0.44, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.012;
    return mesh;
  } else {
    // Translucent circle dot marker
    const geo = new THREE.CircleGeometry(0.22, 32);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.75,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.012;
    return mesh;
  }
}

