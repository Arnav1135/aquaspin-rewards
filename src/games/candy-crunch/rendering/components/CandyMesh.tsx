import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TileData } from '../../types';

interface CandyMeshProps {
  tile: TileData;
}

const colorHexMap: Record<string, number> = {
  red: 0xef4444,
  orange: 0xf97316,
  yellow: 0xeab308,
  green: 0x22c55e,
  blue: 0x3b82f6,
  purple: 0xa855f7,
};

export const CandyMesh: React.FC<CandyMeshProps> = ({ tile }) => {
  const colorHex = colorHexMap[tile.color] || 0xef4444;

  const mainMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.1,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.4,
    ior: 1.5,
    thickness: 0.8,
  }), [colorHex]);

  const opaqueMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: colorHex,
    metalness: 0.1,
    roughness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transmission: 0.0,
  }), [colorHex]);

  const stripeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }), []);
  
  const renderShape = () => {
    switch (tile.shape) {
      case 'fish':
        return (
          <group>
            <mesh material={mainMat} scale={[1.2, 0.7, 0.5]}>
              <sphereGeometry args={[0.38, 16, 16]} />
              <mesh material={stripeMat} position={[-0.18, 0, 0]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
                <torusGeometry args={[0.28, 0.03, 8, 24]} />
              </mesh>
              <mesh material={stripeMat} position={[0, 0, 0]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
                <torusGeometry args={[0.28, 0.03, 8, 24]} />
              </mesh>
              <mesh material={stripeMat} position={[0.18, 0, 0]} rotation={[Math.PI / 4, Math.PI / 6, 0]}>
                <torusGeometry args={[0.28, 0.03, 8, 24]} />
              </mesh>
            </mesh>
            <mesh material={opaqueMat} position={[-0.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
              <coneGeometry args={[0.25, 0.4, 12]} />
            </mesh>
          </group>
        );
      case 'jelly-bean':
        return (
          <mesh material={mainMat} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.28, 0.18, 16, 32, Math.PI * 0.8]} />
          </mesh>
        );
      case 'lozenge':
        return (
          <mesh material={mainMat}>
            <boxGeometry args={[0.65, 0.45, 0.35]} />
          </mesh>
        );
      case 'teardrop':
        return (
          <mesh material={mainMat} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.38, 0.7, 16]} />
          </mesh>
        );
      case 'square':
        return (
          <mesh material={mainMat}>
            <boxGeometry args={[0.55, 0.55, 0.35]} />
          </mesh>
        );
      case 'cluster':
        return (
          <group>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const angle = (i * Math.PI) / 3;
              return (
                <mesh key={i} material={mainMat} position={[Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, 0]}>
                  <sphereGeometry args={[0.18, 12, 12]} />
                </mesh>
              );
            })}
            <mesh material={mainMat}>
              <sphereGeometry args={[0.22, 12, 12]} />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh material={mainMat}>
            <sphereGeometry args={[0.38, 20, 20]} />
          </mesh>
        );
    }
  };

  return (
    <group>
      {/* Jelly Underlay */}
      {tile.jellyLayers > 0 && (
        <mesh position={[0, 0, -0.25]}>
          <planeGeometry args={[0.95, 0.95]} />
          <meshBasicMaterial color={0x38bdf8} transparent opacity={tile.jellyLayers === 2 ? 0.7 : 0.4} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Main Candy */}
      {renderShape()}

      {/* Special Overlays */}
      {(tile.special === 'striped-h' || tile.special === 'striped-v') && (
        <mesh rotation={tile.special === 'striped-v' ? [0, 0, Math.PI / 2] : [0, 0, 0]}>
          <cylinderGeometry args={[0.42, 0.42, 0.08, 16]} />
          <meshBasicMaterial color={0xffffff} />
        </mesh>
      )}
      
      {tile.special === 'wrapped' && (
        <mesh>
          <boxGeometry args={[0.75, 0.75, 0.5]} />
          <meshPhysicalMaterial color={0xffffff} transmission={0.85} roughness={0.1} clearcoat={1.0} transparent opacity={0.7} />
        </mesh>
      )}

      {tile.special === 'color-bomb' && (
        <mesh>
          <sphereGeometry args={[0.42, 20, 20]} />
          <meshStandardMaterial color={0x3d2314} roughness={0.4} />
          {/* Simple sprinkles via random mapping could be added, skipping explicit meshes for performance */}
        </mesh>
      )}

      {tile.isWrappedCellophane && (
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.45, 0.45, 0.8, 12]} />
          <meshPhysicalMaterial color={0xffffff} transmission={0.9} transparent opacity={0.6} />
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
