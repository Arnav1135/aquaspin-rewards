import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TileData } from '../../types';
import { CandyIdentityRegistry } from '../CandyDesignSystem/CandyIdentityRegistry';
import { CandyMaterialFactory } from '../CandyDesignSystem/CandyMaterialFactory';

const colorHexMap: Record<string, number> = {
  red: 0xff1133,
  orange: 0xff7700,
  yellow: 0xffcc00,
  green: 0x33ff66,
  blue: 0x2266ff,
  purple: 0xaa22ff,
};

// --- PRE-CACHED MATERIALS ---
const CANDY_MATERIALS: Record<string, THREE.Material> = {};
for (const [colorName, hexColor] of Object.entries(colorHexMap)) {
  const identity = CandyIdentityRegistry.getIdentityForColor(colorName as any);
  CANDY_MATERIALS[colorName] = CandyMaterialFactory.createMaterial(identity.materialProfile, hexColor);
}

const matJellyLayer1 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
const matJellyLayer2 = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.7, side: THREE.DoubleSide });
const matStriped = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 });
const matWrapped = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.95, roughness: 0.0, clearcoat: 1.0, transparent: true, opacity: 0.7 });
const matLightning = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.9 });
const matColorBomb = new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.2, metalness: 0.8 });
const matRainbowBomb = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.5, iridescence: 1.0, roughness: 0.05 });
const matGalaxy = new THREE.MeshStandardMaterial({ color: 0x110033, emissive: 0xaa22ff, emissiveIntensity: 2.0 });
const matFrosting = new THREE.MeshStandardMaterial({ color: 0xfaf5ff, roughness: 0.8, bumpScale: 0.05 });
const matChocolate = new THREE.MeshStandardMaterial({ color: 0x2e180c, roughness: 0.3 });

// --- PRE-CACHED GEOMETRIES ---
const geoFishSphere = new THREE.SphereGeometry(0.38, 32, 32);
const geoFishCone = new THREE.ConeGeometry(0.25, 0.4, 16);
const geoJellyBeanTorus = new THREE.TorusGeometry(0.28, 0.18, 24, 48, Math.PI * 0.8);
const geoLozengeBox = new THREE.BoxGeometry(0.65, 0.45, 0.35, 4, 4, 4);
const geoTeardropCone = new THREE.ConeGeometry(0.38, 0.7, 32, 1, false, 0, Math.PI * 2);
const geoSquareBox = new THREE.BoxGeometry(0.55, 0.55, 0.35, 8, 8, 8);
const geoCircleSphere = new THREE.SphereGeometry(0.4, 32, 32);

const geoJellyPlane = new THREE.PlaneGeometry(0.95, 0.95);
const geoStripedCylinder = new THREE.CylinderGeometry(0.45, 0.45, 0.08, 32);
const geoWrappedBox = new THREE.BoxGeometry(0.75, 0.75, 0.5);
const geoLightningPlane = new THREE.PlaneGeometry(0.8, 0.8);
const geoColorBombSphere = new THREE.SphereGeometry(0.45, 32, 32);
const geoRainbowBombSphere = new THREE.SphereGeometry(0.5, 32, 32);
const geoGalaxyTorusKnot = new THREE.TorusKnotGeometry(0.3, 0.1, 64, 8);
const geoBlockerBox = new THREE.BoxGeometry(0.9, 0.9, 0.4);

interface CandyMeshProps {
  tile: TileData;
}

export const CandyMesh: React.FC<CandyMeshProps> = ({ tile }) => {
  const meshGroupRef = useRef<THREE.Group>(null);
  
  // Phase 1: Retrieve Unique Candy Identity
  const identity = useMemo(() => CandyIdentityRegistry.getIdentityForColor(tile.color), [tile.color]);

  // Phase 2: Physically Based Material System (Cached)
  const mainMat = CANDY_MATERIALS[tile.color] || CandyMaterialFactory.createMaterial(identity.materialProfile, colorHexMap[tile.color] || 0xef4444);

  const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  // Phase 3: CANDY BREATHING SYSTEM (Procedural Idle Motion)
  useFrame((state) => {
    if (!meshGroupRef.current) return;
    const t = state.clock.getElapsedTime() + timeOffset;
    
    switch (identity.animationProfile.idleMotion) {
      case 'breathe':
        meshGroupRef.current.scale.x = 1.0 + Math.sin(t * 2) * 0.03;
        meshGroupRef.current.scale.y = 1.0 - Math.sin(t * 2) * 0.03;
        break;
      case 'wobble':
        meshGroupRef.current.rotation.z = Math.sin(t * 3) * 0.05;
        meshGroupRef.current.position.y = Math.cos(t * 4) * 0.02;
        break;
      case 'spin':
        meshGroupRef.current.rotation.y = Math.sin(t) * 0.1;
        break;
      case 'light_sweep':
        meshGroupRef.current.rotation.x = Math.sin(t * 1.5) * 0.05;
        meshGroupRef.current.rotation.y = Math.cos(t * 1.5) * 0.05;
        break;
      case 'sparkle':
        meshGroupRef.current.position.y = Math.sin(t * 5) * 0.015;
        meshGroupRef.current.scale.setScalar(1.0 + Math.sin(t * 4) * 0.015);
        break;
      default:
        break;
    }
  });

  const renderShape = () => {
    const { proportions, shapeFamily } = identity;

    switch (shapeFamily) {
      case 'fish':
        return (
          <group scale={[proportions.width, proportions.height, proportions.depth]}>
            <mesh material={mainMat} geometry={geoFishSphere} />
            <mesh material={mainMat} geometry={geoFishCone} position={[-0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
          </group>
        );
      case 'jelly-bean':
        return (
          <mesh material={mainMat} geometry={geoJellyBeanTorus} rotation={[Math.PI / 2, 0, 0]} scale={[proportions.width, proportions.height, proportions.depth]} />
        );
      case 'lozenge':
        return (
          <mesh material={mainMat} geometry={geoLozengeBox} scale={[proportions.width, proportions.height, proportions.depth]} />
        );
      case 'teardrop':
        return (
          <mesh material={mainMat} geometry={geoTeardropCone} rotation={[Math.PI, 0, 0]} scale={[proportions.width, proportions.height, proportions.depth]} />
        );
      case 'square':
        return (
          <mesh material={mainMat} geometry={geoSquareBox} scale={[proportions.width, proportions.height, proportions.depth]} />
        );
      case 'circle':
      default:
        return (
          <mesh material={mainMat} geometry={geoCircleSphere} scale={[proportions.width, proportions.height, proportions.depth]} />
        );
    }
  };

  return (
    <group ref={meshGroupRef}>
      {/* Jelly Underlay */}
      {tile.jellyLayers > 0 && (
        <mesh position={[0, 0, -0.25]} geometry={geoJellyPlane} material={tile.jellyLayers === 2 ? matJellyLayer2 : matJellyLayer1} />
      )}

      {/* Main Premium Geometry (Hide if Galaxy/Color-Bomb since they replace the entire shape) */}
      {(tile.special !== 'color-bomb' && tile.special !== 'galaxy' && tile.special !== 'rainbow-bomb') && renderShape()}

      {/* Special Overlays - Phase 8 */}
      {(tile.special === 'striped-h' || tile.special === 'striped-v') && (
        <mesh geometry={geoStripedCylinder} material={matStriped} rotation={tile.special === 'striped-v' ? [0, 0, Math.PI / 2] : [0, 0, 0]} />
      )}
      
      {tile.special === 'wrapped' && (
        <mesh geometry={geoWrappedBox} material={matWrapped} />
      )}
      
      {tile.special === 'lightning' && (
        <mesh geometry={geoLightningPlane} material={matLightning} position={[0, 0, 0.3]} />
      )}

      {tile.special === 'color-bomb' && (
        <mesh geometry={geoColorBombSphere} material={matColorBomb} />
      )}

      {tile.special === 'rainbow-bomb' && (
        <mesh geometry={geoRainbowBombSphere} material={matRainbowBomb}>
          <pointLight color={0xffffff} distance={2} intensity={2} />
        </mesh>
      )}
      
      {tile.special === 'galaxy' && (
        <mesh geometry={geoGalaxyTorusKnot} material={matGalaxy}>
          <pointLight color={0xaa22ff} distance={3} intensity={5} />
        </mesh>
      )}

      {/* Blockers */}
      {(tile.blocker === 'frosting-1' || tile.blocker === 'frosting-2' || tile.blocker === 'frosting-3') && (
        <mesh geometry={geoBlockerBox} material={matFrosting} />
      )}
      {tile.blocker === 'chocolate' && (
        <mesh geometry={geoBlockerBox} material={matChocolate} />
      )}
    </group>
  );
};
