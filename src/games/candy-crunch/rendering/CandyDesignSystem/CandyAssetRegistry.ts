import * as THREE from 'three';
import { CandyColorProfile, CANDY_COLOR_PALETTE } from './CandyColorPalette';
import { CandyMaterialFactory, CandyMaterialType } from './CandyMaterialFactory';
import { CandyShapeFactory } from './CandyShapeFactory';
import { CandyShape, SpecialType, CandyColor } from '../../types';

export interface CandyDefinition {
  colorProfile: CandyColorProfile;
  materialType: CandyMaterialType;
  shape: CandyShape;
}

export class CandyAssetRegistry {
  private static defaultMaterialMapping: Record<CandyColor, CandyMaterialType> = {
    red: 'GUMMY',
    orange: 'HARD_CANDY',
    yellow: 'JELLY',
    green: 'GLAZED',
    blue: 'HARD_CANDY',
    purple: 'CRYSTAL',
  };

  public static getBaseMesh(color: CandyColor, shape: CandyShape): THREE.Mesh {
    const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
    const materialType = this.defaultMaterialMapping[color] || 'HARD_CANDY';
    
    const geo = CandyShapeFactory.getGeometry(shape);
    const mat = CandyMaterialFactory.getMaterial(materialType, cp);
    
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  public static applySpecialOverlays(group: THREE.Group, special: SpecialType, color: CandyColor) {
    const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;

    if (special === 'striped-h' || special === 'striped-v') {
      const ringMat = CandyMaterialFactory.getMaterial('STRIPE', cp);
      const ringGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.08, 16);
      if (special === 'striped-v') ringGeo.rotateZ(Math.PI / 2);
      const ring = new THREE.Mesh(ringGeo, ringMat);
      group.add(ring);
    } else if (special === 'wrapped') {
      const wrapGeo = new THREE.BoxGeometry(0.75, 0.75, 0.5);
      const wrapMat = CandyMaterialFactory.getMaterial('WRAPPER', cp);
      group.add(new THREE.Mesh(wrapGeo, wrapMat));
    } else if (special === 'color-bomb') {
      // Clear out the standard base mesh
      group.clear();
      
      const bombGeo = new THREE.SphereGeometry(0.42, 20, 20);
      const bombMat = CandyMaterialFactory.getMaterial('CHOCOLATE', cp);
      const bomb = new THREE.Mesh(bombGeo, bombMat);

      // Deterministic sprinkles instead of random
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
        
        // Golden ratio deterministic distribution
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

  public static createCandyGroup(color: CandyColor, shape: CandyShape, special: SpecialType, isWrappedCellophane: boolean = false): THREE.Group {
    const group = new THREE.Group();
    
    if (special !== 'color-bomb') {
      const baseMesh = this.getBaseMesh(color, shape);
      group.add(baseMesh);

      if (shape === 'fish') {
        const tailGeo = CandyShapeFactory.getFishTailGeometry();
        const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
        const tailMat = CandyMaterialFactory.getMaterial('HARD_CANDY', cp);
        const tail = new THREE.Mesh(tailGeo, tailMat);
        group.add(tail);
      }
    }

    this.applySpecialOverlays(group, special, color);

    if (isWrappedCellophane) {
      const cp = CANDY_COLOR_PALETTE[color] || CANDY_COLOR_PALETTE.red;
      const wrapGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.8, 12);
      wrapGeo.rotateZ(Math.PI / 2);
      const wrapMat = CandyMaterialFactory.getMaterial('WRAPPER', cp);
      group.add(new THREE.Mesh(wrapGeo, wrapMat));
    }

    return group;
  }
}
