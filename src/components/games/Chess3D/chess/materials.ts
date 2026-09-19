import * as THREE from 'three';
import { MaterialTheme, PieceColor } from '../types';
import { createWoodNormalMap, createRoughnessMap, createMicroSurfaceTexture, createMarbleTexture } from './textures';

let normalMapCache: THREE.CanvasTexture | null = null;
let roughnessMapCache: THREE.CanvasTexture | null = null;
let microSurfaceCache: THREE.CanvasTexture | null = null;
let marbleWhiteCache: THREE.CanvasTexture | null = null;
let marbleBlackCache: THREE.CanvasTexture | null = null;

const pieceMaterialCache: Record<string, THREE.MeshPhysicalMaterial> = {};

function getNormalMap() {
  if (!normalMapCache) normalMapCache = createWoodNormalMap();
  return normalMapCache;
}
function getRoughnessMap() {
  if (!roughnessMapCache) roughnessMapCache = createRoughnessMap();
  return roughnessMapCache;
}
function getMicroSurfaceMap() {
  if (!microSurfaceCache) microSurfaceCache = createMicroSurfaceTexture();
  return microSurfaceCache;
}
function getMarbleMap(isBlack: boolean) {
  if (isBlack) {
    if (!marbleBlackCache) marbleBlackCache = createMarbleTexture(true);
    return marbleBlackCache;
  } else {
    if (!marbleWhiteCache) marbleWhiteCache = createMarbleTexture(false);
    return marbleWhiteCache;
  }
}

export function createPieceMaterial(color: PieceColor, theme: MaterialTheme): THREE.MeshPhysicalMaterial {
  const cacheKey = `${color}-${theme}-pbr`;
  if (pieceMaterialCache[cacheKey]) return pieceMaterialCache[cacheKey];

  let mat: THREE.MeshPhysicalMaterial;

  if (color === 'w') {
    // White: Realistic Marble with gold flecks
    mat = new THREE.MeshPhysicalMaterial({
      map: getMarbleMap(false),
      color: 0xffffff,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      normalMap: getNormalMap(),
      normalScale: new THREE.Vector2(0.02, 0.02),
      reflectivity: 1.0,
      ior: 1.5,
      transmission: 0.1, // Subtle SSS
      thickness: 0.5,
    });
  } else {
    // Black: Obsidian
    mat = new THREE.MeshPhysicalMaterial({
      map: getMarbleMap(true),
      color: 0x0a0a0a,
      roughness: 0.05,
      metalness: 0.3,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      normalMap: getNormalMap(),
      normalScale: new THREE.Vector2(0.02, 0.02),
      reflectivity: 1.0,
      ior: 1.6,
    });
  }

  pieceMaterialCache[cacheKey] = mat;
  return mat;
}

export function createTileMaterials() {
  // 4K Procedural PBR for Board
  const light = new THREE.MeshPhysicalMaterial({
    color: 0xe3c19b,
    roughnessMap: getRoughnessMap(),
    roughness: 0.3,
    metalness: 0.0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    normalMap: getNormalMap(),
    normalScale: new THREE.Vector2(0.1, 0.1),
    reflectivity: 0.5
  });

  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x4a2e15,
    roughnessMap: getRoughnessMap(),
    roughness: 0.2,
    metalness: 0.0,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    normalMap: getNormalMap(),
    normalScale: new THREE.Vector2(0.1, 0.1),
    reflectivity: 0.6
  });
  
  return { light, dark };
}

export function createFrameMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x1a0f08, // Dark premium wood frame
    roughness: 0.4,
    metalness: 0.1,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
    normalMap: getNormalMap(),
    normalScale: new THREE.Vector2(0.2, 0.2),
  });
}
