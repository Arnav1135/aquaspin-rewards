import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Detailed } from '@react-three/drei';

interface GeometryManagerProps {
  children?: React.ReactNode;
}

export const GeometryManager: React.FC<GeometryManagerProps> = ({ children }) => {
  const { highDetail, medDetail, lowDetail } = useMemo(() => {
    return {
      highDetail: new THREE.IcosahedronGeometry(1, 4),
      medDetail: new THREE.IcosahedronGeometry(1, 2),
      lowDetail: new THREE.IcosahedronGeometry(1, 0),
    };
  }, []);

  return (
    <group>
      {/* LOD Group example */}
      <Detailed distances={[0, 15, 30]}>
        <mesh geometry={highDetail}>
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh geometry={medDetail}>
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh geometry={lowDetail}>
          <meshStandardMaterial color="white" />
        </mesh>
      </Detailed>
      {children}
    </group>
  );
};
