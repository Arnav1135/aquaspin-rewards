import * as THREE from 'three';
import { TileData } from '../../types';

export class BoardRenderer {
  private boardGroup: THREE.Group;
  
  constructor() {
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "BoardRendererGroup";
  }

  public getGroup(): THREE.Group {
    return this.boardGroup;
  }

  // Phase 10: Dynamic Board Rendering (No 8x8 hardcoding)
  public rebuildBoardBackground(rows: number, cols: number) {
    // Clear old board tiles
    while(this.boardGroup.children.length > 0) {
      const child = this.boardGroup.children[0] as THREE.Mesh;
      this.boardGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) (child.material as THREE.Material).dispose();
    }

    // Create the background tiles with depth and bevel
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // We use 1.1 spacing.
        const x = (c - (cols - 1) / 2) * 1.1;
        const y = ((rows - 1) / 2 - r) * 1.1;

        // Bevelled Tile Geometry
        const bgGeo = new THREE.BoxGeometry(1.02, 1.02, 0.2);
        
        const isChecker = (r + c) % 2 === 0;
        
        // PBR Base material for the board
        const bgMat = new THREE.MeshStandardMaterial({
          color: isChecker ? 0xffffff : 0xebf2fa,
          roughness: 0.6,
          metalness: 0.05,
        });

        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(x, y, -0.4); // Offset behind candies
        bgMesh.receiveShadow = true;
        
        this.boardGroup.add(bgMesh);
      }
    }

    // Board Border/Frame
    const frameGeo = new THREE.BoxGeometry(cols * 1.1 + 0.5, rows * 1.1 + 0.5, 0.4);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b, // Woody/Caramel border color
      roughness: 0.8,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, 0, -0.6);
    frameMesh.receiveShadow = true;
    this.boardGroup.add(frameMesh);
  }
}
