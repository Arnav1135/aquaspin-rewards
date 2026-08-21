import * as THREE from 'three';
import { CANDY_COLOR_PALETTE } from './CandyColorPalette';
import { CandyMaterialFactory } from './CandyMaterialFactory';
import { CandyShapeFactory } from './CandyShapeFactory';
import { CandyIdentityRegistry } from './CandyIdentityRegistry';
import { CandyShape, SpecialType, CandyColor } from '../../types';

export class CandyAssetRegistry {
  public static getBaseMesh(color: CandyColor): THREE.Mesh {
    const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
    const identity = CandyIdentityRegistry.getIdentityForColor(color);
    
    // Geometry with identity proportions
    const geo = CandyShapeFactory.getGeometry(identity.shapeFamily).clone();
    geo.scale(identity.proportions.width, identity.proportions.height, identity.proportions.depth);
    
    // Material from identity
    const mat = CandyMaterialFactory.createMaterial(identity.materialProfile, cp);
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Attach identity for animations
    mesh.userData.identity = identity;
    return mesh;
  }

  public static applySpecialOverlays(group: THREE.Group, special: SpecialType, color: CandyColor) {
    const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
    const identity = CandyIdentityRegistry.getIdentityForColor(color);

    if (special === 'striped-h' || special === 'striped-v') {
      const ringMat = CandyMaterialFactory.createMaterial('STRIPE', cp);
      // Stripe scales dynamically with the base shape's proportions
      const baseR = 0.42 * Math.max(identity.proportions.width, identity.proportions.depth);
      const ringGeo = new THREE.CylinderGeometry(baseR, baseR, 0.08, 16);
      if (special === 'striped-v') ringGeo.rotateZ(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);
    } else if (special === 'wrapped') {
      // Wrapper scales with candy proportions
      const wrapGeo = new THREE.BoxGeometry(
        0.75 * identity.proportions.width, 
        0.75 * identity.proportions.height, 
        0.5 * identity.proportions.depth
      );
      const wrapMat = CandyMaterialFactory.createMaterial('WRAPPER', cp);
      group.add(new THREE.Mesh(wrapGeo, wrapMat));
    } else if (special === 'color-bomb') {
      group.clear(); // Wipe base for bomb
      
      const bombGeo = new THREE.SphereGeometry(0.42, 20, 20);
      const bombMat = CandyMaterialFactory.createMaterial('CHOCOLATE', cp);
      const bomb = new THREE.Mesh(bombGeo, bombMat);

      const sprinkleColors = [
        CANDY_COLOR_PALETTE.red.baseColor,
        CANDY_COLOR_PALETTE.orange.baseColor,
        CANDY_COLOR_PALETTE.yellow.baseColor,
        CANDY_COLOR_PALETTE.green.baseColor,
        CANDY_COLOR_PALETTE.blue.baseColor,
        CANDY_COLOR_PALETTE.purple.baseColor,
      ];
      for (let i = 0; i < 24; i++) {
        const sGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const sMat = new THREE.MeshPhysicalMaterial({ color: sprinkleColors[i % sprinkleColors.length], roughness: 0.1, clearcoat: 1.0 });
        const sprinkle = new THREE.Mesh(sGeo, sMat);
        
        const goldenRatio = (1 + Math.sqrt(5)) / 2;
        const theta = (2 * Math.PI * i) / goldenRatio;
        const phi = Math.acos(1 - (2 * (i + 0.5)) / 24);
        
        sprinkle.position.set(
          0.43 * Math.sin(phi) * Math.cos(theta),
          0.43 * Math.sin(phi) * Math.sin(theta),
          0.43 * Math.cos(phi)
        );
        bomb.add(sprinkle);
      }
      group.add(bomb);
    }
  }

  public static createCandyGroup(color: CandyColor, shapeOverride: CandyShape, special: SpecialType, isWrappedCellophane: boolean = false): THREE.Group {
    const group = new THREE.Group();
    const identity = CandyIdentityRegistry.getIdentityForColor(color);
    
    if (special !== 'color-bomb') {
      const baseMesh = this.getBaseMesh(color);
      group.add(baseMesh);

      // We maintain legacy 'fish' tail logic specifically if identity is a leaf/fish shape
      if (identity.shapeFamily === 'fish') {
        const tailGeo = CandyShapeFactory.getFishTailGeometry().clone();
        tailGeo.scale(identity.proportions.width, identity.proportions.height, identity.proportions.depth);
        const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
        const tailMat = CandyMaterialFactory.createMaterial(identity.materialProfile, cp);
        const tail = new THREE.Mesh(tailGeo, tailMat);
        group.add(tail);
      }
    }

    this.applySpecialOverlays(group, special, color);

    if (isWrappedCellophane) {
      const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
      const wrapGeo = new THREE.CylinderGeometry(
        0.45 * identity.proportions.width, 
        0.45 * identity.proportions.depth, 
        0.8 * identity.proportions.height, 
        12
      );
      wrapGeo.rotateZ(Math.PI / 2);
      const wrapMat = CandyMaterialFactory.createMaterial('WRAPPER', cp);
      group.add(new THREE.Mesh(wrapGeo, wrapMat));
    }

    // Embed identity in group userData for renderer animation access
    group.userData.identity = identity;
    return group;
  }
}

