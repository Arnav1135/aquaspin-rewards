import * as THREE from 'three';

export class BoardRenderer {
  private boardGroup: THREE.Group;
  
  constructor() {
    this.boardGroup = new THREE.Group();
    this.boardGroup.name = "BoardRendererGroup";
  }

  public getGroup(): THREE.Group {
    return this.boardGroup;
  }

  // Phase 5 & 16: Dynamic Board Rendering & Depth Layers
  public rebuildBoardBackground(rows: number, cols: number) {
    // Clear old board tiles
    while(this.boardGroup.children.length > 0) {
      const child = this.boardGroup.children[0] as THREE.Mesh;
      this.boardGroup.remove(child);
      if (child.geometry) child.geometry.dispose();
      if (child.material) (child.material as THREE.Material).dispose();
    }

    const tileSpacing = 1.1;

    // Create the background tiles with depth, bevels, and contact shadow receivers
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c - (cols - 1) / 2) * tileSpacing;
        const y = ((rows - 1) / 2 - r) * tileSpacing;

        // Bevelled Tile Geometry for realistic depth
        const bgGeo = new THREE.BoxGeometry(1.04, 1.04, 0.25);
        
        const isChecker = (r + c) % 2 === 0;
        
        // PBR Frosted Glass / Cream Board Material
        const bgMat = new THREE.MeshPhysicalMaterial({
          color: isChecker ? 0xffffff : 0xeef4fc,
          roughness: 0.25,
          metalness: 0.05,
          clearcoat: 0.8,
          clearcoatRoughness: 0.2,
          transmission: 0.15,
          ior: 1.4,
        });

        const bgMesh = new THREE.Mesh(bgGeo, bgMat);
        bgMesh.position.set(x, y, -0.3);
        bgMesh.receiveShadow = true;
        
        // Contact Shadow Plane per Tile
        const shadowGeo = new THREE.PlaneGeometry(1.0, 1.0);
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        });
        const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.position.set(x, y, -0.16);
        this.boardGroup.add(shadowMesh);

        this.boardGroup.add(bgMesh);
      }
    }

    // Outer Beveled Frame / Rim
    const boardWidth = cols * tileSpacing + 0.6;
    const boardHeight = rows * tileSpacing + 0.6;

    const frameGeo = new THREE.BoxGeometry(boardWidth, boardHeight, 0.5);
    const frameMat = new THREE.MeshPhysicalMaterial({
      color: 0x2b1e17,
      roughness: 0.4,
      metalness: 0.1,
      clearcoat: 0.5,
    });
    const frameMesh = new THREE.Mesh(frameGeo, frameMat);
    frameMesh.position.set(0, 0, -0.55);
    frameMesh.receiveShadow = true;
    this.boardGroup.add(frameMesh);
  }
}
