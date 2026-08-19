import * as THREE from 'three';
import { ProceduralGeometrySystem, ProceduralShapeType, ProceduralGeometryParams } from './ProceduralGeometrySystem';

export type LODLevel = 'LOD0' | 'LOD1' | 'LOD2' | 'LOD3';

export interface LODConfig {
  distanceThresholds: [number, number, number]; // Distances where it switches to LOD1, LOD2, LOD3
  baseParams: ProceduralGeometryParams;
}

export class GeometryLODManager {
  // Phase 2: Geometry LOD System
  
  public static createLODMesh(
    shapeType: ProceduralShapeType, 
    config: LODConfig, 
    material: THREE.Material
  ): THREE.LOD {
    const lod = new THREE.LOD();

    // LOD0 (Hero / High Detail)
    const geom0 = ProceduralGeometrySystem.getGeometry(shapeType, config.baseParams);
    const mesh0 = new THREE.Mesh(geom0, material);
    lod.addLevel(mesh0, 0);

    // LOD1 (Normal Detail)
    const params1 = { ...config.baseParams, segments: Math.max(1, (config.baseParams.segments || 32) / 2), detail: Math.max(0, (config.baseParams.detail || 4) - 1) };
    const geom1 = ProceduralGeometrySystem.getGeometry(shapeType, params1);
    const mesh1 = new THREE.Mesh(geom1, material);
    lod.addLevel(mesh1, config.distanceThresholds[0]);

    // LOD2 (Simplified)
    const params2 = { ...params1, segments: Math.max(1, (params1.segments || 16) / 2), detail: Math.max(0, (params1.detail || 3) - 1) };
    const geom2 = ProceduralGeometrySystem.getGeometry(shapeType, params2);
    const mesh2 = new THREE.Mesh(geom2, material);
    lod.addLevel(mesh2, config.distanceThresholds[1]);

    // LOD3 (Minimal/Imposter geometry)
    const params3 = { ...params2, segments: 4, detail: 0 };
    const geom3 = ProceduralGeometrySystem.getGeometry(shapeType, params3);
    const mesh3 = new THREE.Mesh(geom3, material);
    lod.addLevel(mesh3, config.distanceThresholds[2]);

    return lod;
  }
}
