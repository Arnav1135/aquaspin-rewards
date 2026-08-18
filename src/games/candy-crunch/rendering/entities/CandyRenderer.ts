import * as THREE from 'three';
import { TileData } from '../../types';
import { ResourceManager } from '../managers/ResourceManager';

export class CandyRenderer {
  private resourceManager: ResourceManager;

  constructor(resourceManager: ResourceManager) {
    this.resourceManager = resourceManager;
  }

  // Phase 7: Declarative definition construction
  public createCandyMeshGroup(tile: TileData): THREE.Group {
    const group = new THREE.Group();
    group.name = `CandyGroup_${tile.id}`;
    
    // Core Candy Mesh
    const isSpecial = tile.special !== 'none';
    const geo = this.resourceManager.getGeometry(tile.shape);
    const mat = this.resourceManager.getCandyMaterial(tile.color, isSpecial);
    
    const candyMesh = new THREE.Mesh(geo, mat);
    candyMesh.name = "CandyMesh";
    candyMesh.castShadow = true;
    candyMesh.receiveShadow = true;
    group.add(candyMesh);

    // Special Candy Attachments (Decorators)
    if (tile.special === 'striped-h') {
      const stripeGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
      stripeGeo.rotateZ(Math.PI / 2);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      group.add(stripe);
    } else if (tile.special === 'striped-v') {
      const stripeGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.1, 16);
      const stripeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      group.add(stripe);
    } else if (tile.special === 'wrapped') {
      const wrapGeo = new THREE.BoxGeometry(0.9, 0.9, 0.9);
      const wrapMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.9,
        opacity: 1,
        transparent: true,
        roughness: 0.1
      });
      const wrap = new THREE.Mesh(wrapGeo, wrapMat);
      group.add(wrap);
    } else if (tile.special === 'color-bomb') {
      // Color bomb overrides normal geometry/material
      candyMesh.geometry = this.resourceManager.getGeometry('cluster');
      candyMesh.material = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
      // Add colorful sprinkles
      for(let i = 0; i < 8; i++) {
        const sprinkle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), new THREE.MeshBasicMaterial({color: Math.random() * 0xffffff}));
        sprinkle.position.set(
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8,
          (Math.random() - 0.5) * 0.8
        );
        group.add(sprinkle);
      }
    }

    // Blocker Overlay
    if (tile.blocker !== 'none') {
      const bGeo = this.resourceManager.getBlockerGeometry(tile.blocker);
      const bMat = this.resourceManager.getBlockerMaterial(tile.blocker);
      const blockerMesh = new THREE.Mesh(bGeo, bMat);
      blockerMesh.name = "BlockerMesh";
      group.add(blockerMesh);
    }

    // Jelly Underlay
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
      jellyMesh.name = "JellyMesh";
      group.add(jellyMesh);
    }

    return group;
  }
}
