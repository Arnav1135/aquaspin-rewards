import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';
import * as THREE from 'three';

export const TABLE_WIDTH = 5.0; // Half-width = 2.5
export const TABLE_LENGTH = 10.0; // Half-length = 5.0
export const POCKET_RADIUS = 0.45;
export const CUSHION_HEIGHT = 0.4;

export function TableMesh() {
  return (
    <group>
      {/* Play Surface (Felt) */}
      <RigidBody type="fixed" friction={0.6} restitution={0.3} colliders={false}>
        <CuboidCollider args={[TABLE_WIDTH / 2, 0.1, TABLE_LENGTH / 2]} position={[0, -0.1, 0]} />
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[TABLE_WIDTH, 0.2, TABLE_LENGTH]} />
          {/* True cloth/felt PBR material with microscopic fuzz simulation via sheen */}
          <meshPhysicalMaterial 
            color="#09551c" 
            roughness={0.95} 
            metalness={0.0} 
            sheen={1.0}
            sheenRoughness={0.8}
            sheenColor="#1e9c40"
            clearcoat={0.0} 
          />
        </mesh>
      </RigidBody>

      {/* Wood Rails (Visual base) */}
      <mesh position={[0, -0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[TABLE_WIDTH + 1.2, 0.5, TABLE_LENGTH + 1.2]} />
        {/* Polished wood for the base */}
        <meshPhysicalMaterial 
          color="#2a1f1a" 
          roughness={0.3} 
          metalness={0.1} 
          clearcoat={0.5} 
          clearcoatRoughness={0.2}
          envMapIntensity={1.2}
        />
      </mesh>

      {/* Cushions and Rails */}
      <group position={[0, 0.2, 0]}>
        {/* Top Rail */}
        <RigidBody type="fixed" restitution={0.85} friction={0.2} userData={{ isRail: true }}>
          <mesh position={[0, 0, -TABLE_LENGTH / 2 - 0.25]} receiveShadow castShadow>
             <boxGeometry args={[TABLE_WIDTH + 1.0, CUSHION_HEIGHT, 0.5]} />
             <meshPhysicalMaterial color="#3b2b22" roughness={0.2} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.15} envMapIntensity={1.5} />
          </mesh>
          <CuboidCollider args={[(TABLE_WIDTH + 1.0) / 2, CUSHION_HEIGHT / 2, 0.25]} position={[0, 0, -TABLE_LENGTH / 2 - 0.25]} />
        </RigidBody>

        {/* Bottom Rail */}
        <RigidBody type="fixed" restitution={0.85} friction={0.2} userData={{ isRail: true }}>
          <mesh position={[0, 0, TABLE_LENGTH / 2 + 0.25]} receiveShadow castShadow>
             <boxGeometry args={[TABLE_WIDTH + 1.0, CUSHION_HEIGHT, 0.5]} />
             <meshPhysicalMaterial color="#3b2b22" roughness={0.2} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.15} envMapIntensity={1.5} />
          </mesh>
          <CuboidCollider args={[(TABLE_WIDTH + 1.0) / 2, CUSHION_HEIGHT / 2, 0.25]} position={[0, 0, TABLE_LENGTH / 2 + 0.25]} />
        </RigidBody>

        {/* Left Rail */}
        <RigidBody type="fixed" restitution={0.85} friction={0.2} userData={{ isRail: true }}>
          <mesh position={[-TABLE_WIDTH / 2 - 0.25, 0, 0]} receiveShadow castShadow>
             <boxGeometry args={[0.5, CUSHION_HEIGHT, TABLE_LENGTH]} />
             <meshPhysicalMaterial color="#3b2b22" roughness={0.2} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.15} envMapIntensity={1.5} />
          </mesh>
          <CuboidCollider args={[0.25, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2]} position={[-TABLE_WIDTH / 2 - 0.25, 0, 0]} />
        </RigidBody>

        {/* Right Rail */}
        <RigidBody type="fixed" restitution={0.85} friction={0.2} userData={{ isRail: true }}>
          <mesh position={[TABLE_WIDTH / 2 + 0.25, 0, 0]} receiveShadow castShadow>
             <boxGeometry args={[0.5, CUSHION_HEIGHT, TABLE_LENGTH]} />
             <meshPhysicalMaterial color="#3b2b22" roughness={0.2} metalness={0.1} clearcoat={0.8} clearcoatRoughness={0.15} envMapIntensity={1.5} />
          </mesh>
          <CuboidCollider args={[0.25, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2]} position={[TABLE_WIDTH / 2 + 0.25, 0, 0]} />
        </RigidBody>
      </group>

      {/* Pockets (Deep Cavity & Sensors) */}
      {[
        [-TABLE_WIDTH / 2, -TABLE_LENGTH / 2],
        [TABLE_WIDTH / 2, -TABLE_LENGTH / 2],
        [-TABLE_WIDTH / 2, 0],
        [TABLE_WIDTH / 2, 0],
        [-TABLE_WIDTH / 2, TABLE_LENGTH / 2],
        [TABLE_WIDTH / 2, TABLE_LENGTH / 2],
      ].map((pos, i) => (
        <group key={i} position={[pos[0], 0, pos[1]]}>
          {/* Deep pocket visual */}
          <mesh position={[0, -0.4, 0]}>
            <cylinderGeometry args={[POCKET_RADIUS, POCKET_RADIUS * 0.8, 1.0, 32]} />
            <meshPhysicalMaterial color="#050505" roughness={1.0} metalness={0.0} />
          </mesh>
          <mesh position={[0, 0.11, 0]}>
             <ringGeometry args={[POCKET_RADIUS - 0.05, POCKET_RADIUS + 0.1, 32]} />
             <meshPhysicalMaterial color="#111" roughness={0.8} metalness={0.8} />
             <lineSegments>
                <edgesGeometry args={[new THREE.RingGeometry(POCKET_RADIUS - 0.05, POCKET_RADIUS + 0.1, 32)]} />
                <lineBasicMaterial color="#000" />
             </lineSegments>
          </mesh>
          {/* Sensor for scoring */}
          <RigidBody type="fixed" colliders={false} sensor name={`pocket_${i}`}>
            <CylinderCollider args={[0.5, POCKET_RADIUS * 0.9]} position={[0, -0.5, 0]} />
          </RigidBody>
        </group>
      ))}
    </group>
  );
}
