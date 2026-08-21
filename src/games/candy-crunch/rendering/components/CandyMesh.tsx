import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TileData } from '../../types';
import { CandyIdentityRegistry } from '../CandyDesignSystem/CandyIdentityRegistry';
import { CandyMaterialFactory } from '../CandyDesignSystem/CandyMaterialFactory';

interface CandyMeshProps {
  tile: TileData;
}

export const CandyMesh: React.FC<CandyMeshProps> = ({ tile }) => {
  const meshGroupRef = useRef<THREE.Group>(null);
  
  // Phase 1: Retrieve Unique Candy Identity
  const identity = useMemo(() => CandyIdentityRegistry.getIdentityForColor(tile.color), [tile.color]);

  // Phase 2: Physically Based Material System
  const mainMat = useMemo(() => {
    return CandyMaterialFactory.createMaterial(identity.materialProfile, colorHexMap[tile.color] || 0xef4444);
  }, [identity, tile.color]);

  // Procedural Phase 3 offsets
  const timeOffset = useMemo(() => Math.random() * Math.PI * 2, []);

  // Phase 3: CANDY BREATHING SYSTEM (Procedural Idle Motion)
  useFrame((state) => {
    if (!meshGroupRef.current) return;
    
    // Only apply breathing if not currently being animated by SWAP/FALL tweens
    // A more advanced integration checks engine states, but here we add base sine waves
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
        // Highlight movement via slight rotation
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
            <mesh material={mainMat}>
              <sphereGeometry args={[0.38, 32, 32]} />
            </mesh>
            <mesh material={mainMat} position={[-0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.25, 0.4, 16]} />
            </mesh>
          </group>
        );
      case 'jelly-bean':
        return (
          <mesh material={mainMat} rotation={[Math.PI / 2, 0, 0]} scale={[proportions.width, proportions.height, proportions.depth]}>
            <torusGeometry args={[0.28, 0.18, 24, 48, Math.PI * 0.8]} />
          </mesh>
        );
      case 'lozenge':
        return (
          <mesh material={mainMat} scale={[proportions.width, proportions.height, proportions.depth]}>
            <boxGeometry args={[0.65, 0.45, 0.35, 4, 4, 4]} />
          </mesh>
        );
      case 'teardrop':
        return (
          <mesh material={mainMat} rotation={[Math.PI, 0, 0]} scale={[proportions.width, proportions.height, proportions.depth]}>
            <coneGeometry args={[0.38, 0.7, 32, 1, false, 0, Math.PI * 2]} />
          </mesh>
        );
      case 'square':
        return (
          <mesh material={mainMat} scale={[proportions.width, proportions.height, proportions.depth]}>
            <boxGeometry args={[0.55, 0.55, 0.35, 8, 8, 8]} />
          </mesh>
        );
      case 'circle':
      default:
        return (
          <mesh material={mainMat} scale={[proportions.width, proportions.height, proportions.depth]}>
            <sphereGeometry args={[0.4, 32, 32]} />
          </mesh>
        );
    }
  };

  return (
    <group ref={meshGroupRef}>
      {/* Jelly Underlay */}
      {tile.jellyLayers > 0 && (
        <mesh position={[0, 0, -0.25]}>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial color={0x38bdf8} transparent opacity={tile.jellyLayers === 2 ? 0.7 : 0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Main Premium Geometry */}
      {renderShape()}

      {/* Special Overlays */}
      {(tile.special === 'striped-h' || tile.special === 'striped-v') && (
        <mesh rotation={tile.special === 'striped-v' ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
          <cylinderGeometry args={[0.45, 0.45, 0.08, 32]} />
          <meshStandardMaterial color={0xffffff} emissive={0xffffff} emissiveIntensity={0.5} />
        </mesh>
      )}
      
      {tile.special === 'wrapped' && (
        <mesh>
          <boxGeometry args={[0.75, 0.75, 0.5]} />
          <meshPhysicalMaterial color={0xffffff} transmission={0.95} roughness={0.0} clearcoat={1.0} transparent opacity={0.7} />
        </mesh>
      )}

      {tile.special === 'color-bomb' && (
        <mesh>
          <sphereGeometry args={[0.42, 32, 32]} />
          <meshStandardMaterial color={0x221100} roughness={0.2} metalness={0.8} />
        </mesh>
      )}

      {/* Blockers */}
      {(tile.blocker === 'frosting-1' || tile.blocker === 'frosting-2' || tile.blocker === 'frosting-3') && (
        <mesh>
          <boxGeometry args={[0.9, 0.9, 0.4]} />
          <meshStandardMaterial color={0xfaf5ff} roughness={0.8} bumpScale={0.05} />
        </mesh>
      )}
      {tile.blocker === 'chocolate' && (
        <mesh>
          <boxGeometry args={[0.9, 0.9, 0.4]} />
          <meshStandardMaterial color={0x2e180c} roughness={0.3} />
        </mesh>
      )}
    </group>
  );
};

const colorHexMap: Record<string, number> = {
  red: 0xff1133,
  orange: 0xff7700,
  yellow: 0xffcc00,
  green: 0x33ff66,
  blue: 0x2266ff,
  purple: 0xaa22ff,
};
