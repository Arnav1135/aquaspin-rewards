import * as THREE from 'three';
import { MaterialTheme, PieceColor } from '../types';
import { createWoodNormalMap, createRoughnessMap } from './textures';

/**
 * PBR Material Manager
 * Constructs MeshPhysicalMaterials with clearcoat, metalness, roughness,
 * normal maps, and subsurface scattering (SSS) transmission properties.
 */

// Cached procedural textures
let normalMapCache: THREE.CanvasTexture | null = null;

function getNormalMap(): THREE.CanvasTexture {
  if (!normalMapCache) {
    normalMapCache = createWoodNormalMap();
  }
  return normalMapCache;
}

export function createPieceMaterial(color: PieceColor, theme: MaterialTheme): THREE.MeshPhysicalMaterial {
  const normalMap = getNormalMap();

  if (theme === 'wood-bronze') {
    if (color === 'w') {
      // White pieces: Polished Warm Boxwood / Hand-Rubbed Satin Sheen
      return new THREE.MeshPhysicalMaterial({
        color: 0xf4e6c3,
        roughness: 0.11,
        metalness: 0.02,
        clearcoat: 0.75,
        clearcoatRoughness: 0.04,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.04, 0.04),
        reflectivity: 0.9,
        sheen: 0.2,
        sheenColor: new THREE.Color(0xfff5e6),
      });
    } else {
      // Black pieces: Ebonized Dark Walnut / Weighted Polish
      return new THREE.MeshPhysicalMaterial({
        color: 0x1c1714,
        roughness: 0.13,
        metalness: 0.18,
        clearcoat: 0.8,
        clearcoatRoughness: 0.04,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.05, 0.05),
        reflectivity: 0.95,
      });
    }
  } else {
    // Marble & Onyx Theme
    if (color === 'w') {
      // White Marble / Translucent Ivory (Mirror Polish)
      return new THREE.MeshPhysicalMaterial({
        color: 0xfbf9f5,
        roughness: 0.05,
        metalness: 0.01,
        transmission: 0.2, // SSS translucency
        thickness: 0.5,
        attenuationDistance: 1.4,
        attenuationColor: new THREE.Color(0xfff2e0),
        clearcoat: 0.95,
        clearcoatRoughness: 0.02,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.03, 0.03),
      });
    } else {
      // Black Obsidian Onyx (High Gloss Polish)
      return new THREE.MeshPhysicalMaterial({
        color: 0x0c0e12,
        roughness: 0.06,
        metalness: 0.08,
        transmission: 0.08,
        thickness: 0.8,
        attenuationDistance: 1.0,
        attenuationColor: new THREE.Color(0x3a2010),
        clearcoat: 0.98,
        clearcoatRoughness: 0.02,
        normalMap: normalMap,
        normalScale: new THREE.Vector2(0.03, 0.03),
      });
    }
  }
}

/**
 * Chessboard Tile Materials
 * STRICT REQUIREMENT: Dark tile = #769656, Light tile = #eeeed2
 */
export const TILE_COLORS = {
  dark: '#769656',
  light: '#eeeed2',
};

export function createTileMaterials(): { light: THREE.MeshPhysicalMaterial; dark: THREE.MeshPhysicalMaterial } {
  const normalMap = getNormalMap();

  const lightMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(TILE_COLORS.light),
    roughness: 0.25,
    metalness: 0.02,
    clearcoat: 0.2,
    clearcoatRoughness: 0.1,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.08, 0.08),
  });

  const darkMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(TILE_COLORS.dark),
    roughness: 0.28,
    metalness: 0.02,
    clearcoat: 0.2,
    clearcoatRoughness: 0.1,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.08, 0.08),
  });

  return { light: lightMaterial, dark: darkMaterial };
}

// Outer wooden/brass border frame material
export function createFrameMaterial(theme: MaterialTheme): THREE.MeshPhysicalMaterial {
  const normalMap = getNormalMap();
  if (theme === 'wood-bronze') {
    return new THREE.MeshPhysicalMaterial({
      color: 0x3d2314, // Dark mahogany border
      roughness: 0.3,
      metalness: 0.1,
      clearcoat: 0.4,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.3, 0.3),
    });
  } else {
    return new THREE.MeshPhysicalMaterial({
      color: 0x181a1e, // Brushed dark titanium/onyx border
      roughness: 0.2,
      metalness: 0.6,
      clearcoat: 0.6,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.2, 0.2),
    });
  }
}
