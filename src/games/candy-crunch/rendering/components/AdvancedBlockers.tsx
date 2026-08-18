import React, { useMemo } from 'react';
import * as THREE from 'three';
import { BlockerType } from '../../types';

interface AdvancedBlockerProps {
  type: BlockerType;
}

export const AdvancedBlockerMesh: React.FC<AdvancedBlockerProps> = ({ type }) => {
  const blockerMat = useMemo(() => {
    switch (type) {
      case 'chocolate':
        return new THREE.MeshPhysicalMaterial({ color: 0x3e1f04, roughness: 0.8, metalness: 0.1 });
      case 'marmalade':
        return new THREE.MeshPhysicalMaterial({ color: 0xffaa00, transmission: 0.8, opacity: 1, transparent: true, roughness: 0.1 });
      case 'candy-cane-fence':
        return new THREE.MeshStandardMaterial({ color: 0xff0000 });
      case 'licorice-lock':
      case 'licorice-swirl':
        return new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
      default:
        // Frosting
        return new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.2, roughness: 0.4, clearcoat: 0.5 });
    }
  }, [type]);

  const renderShape = () => {
    switch (type) {
      case 'chocolate':
        return (
          <mesh material={blockerMat}>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
          </mesh>
        );
      case 'marmalade':
        return (
          <mesh material={blockerMat}>
            <sphereGeometry args={[0.5, 32, 32]} />
          </mesh>
        );
      case 'candy-cane-fence':
        return (
          <group>
            <mesh material={blockerMat} position={[-0.4, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1]} />
            </mesh>
            <mesh material={blockerMat} position={[0.4, 0, 0]}>
              <cylinderGeometry args={[0.1, 0.1, 1]} />
            </mesh>
            <mesh material={blockerMat} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.1, 0.1, 1]} />
            </mesh>
          </group>
        );
      case 'licorice-lock':
        return (
          <mesh material={blockerMat}>
            <torusGeometry args={[0.4, 0.1, 16, 100]} />
          </mesh>
        );
      case 'licorice-swirl':
        return (
          <mesh material={blockerMat}>
            <torusKnotGeometry args={[0.3, 0.1, 64, 8]} />
          </mesh>
        );
      default:
        // Frosting
        return (
          <mesh material={blockerMat}>
            <dodecahedronGeometry args={[0.5]} />
          </mesh>
        );
    }
  };

  return <group>{renderShape()}</group>;
};
