import { useBox, usePlane } from '@react-three/cannon';

// Standard 9ft pool table dimensions in playing area (approx 100 x 50 inches)
// Converted to local units: length = 20, width = 10 (multiplier for stability)
const TABLE_LENGTH = 20;
const TABLE_WIDTH = 10;
const CUSHION_HEIGHT = 0.5;
const CUSHION_DEPTH = 1.0;
const POCKET_RADIUS = 0.8;

export function PoolTable3D() {
  // 1. The playing surface (Floor)
  usePlane(() => ({
    type: 'Static',
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: { friction: 0.2, restitution: 0.1 }, // Cloth friction
  }));

  // 2. Cushions (Bumpers)
  // Long rails
  useBox(() => ({
    type: 'Static',
    position: [-(TABLE_WIDTH / 2 + CUSHION_DEPTH / 2), CUSHION_HEIGHT / 2, 0],
    args: [CUSHION_DEPTH, CUSHION_HEIGHT, TABLE_LENGTH],
    material: { friction: 0.1, restitution: 0.8 },
  }));
  
  useBox(() => ({
    type: 'Static',
    position: [TABLE_WIDTH / 2 + CUSHION_DEPTH / 2, CUSHION_HEIGHT / 2, 0],
    args: [CUSHION_DEPTH, CUSHION_HEIGHT, TABLE_LENGTH],
    material: { friction: 0.1, restitution: 0.8 },
  }));

  // Short rails
  useBox(() => ({
    type: 'Static',
    position: [0, CUSHION_HEIGHT / 2, -(TABLE_LENGTH / 2 + CUSHION_DEPTH / 2)],
    args: [TABLE_WIDTH, CUSHION_HEIGHT, CUSHION_DEPTH],
    material: { friction: 0.1, restitution: 0.8 },
  }));

  useBox(() => ({
    type: 'Static',
    position: [0, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2 + CUSHION_DEPTH / 2],
    args: [TABLE_WIDTH, CUSHION_HEIGHT, CUSHION_DEPTH],
    material: { friction: 0.1, restitution: 0.8 },
  }));

  // 3. Visuals
  return (
    <group>
      {/* Playing Surface Cloth */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[TABLE_WIDTH + 2, TABLE_LENGTH + 2]} />
        <meshStandardMaterial color="#0b4619" roughness={0.9} metalness={0.1} />
      </mesh>

      {/* Frame / Wood */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[TABLE_WIDTH + CUSHION_DEPTH * 2 + 1, 1, TABLE_LENGTH + CUSHION_DEPTH * 2 + 1]} />
        <meshStandardMaterial color="#2d1406" roughness={0.6} metalness={0.2} />
      </mesh>

      {/* Cushions */}
      <mesh position={[-(TABLE_WIDTH / 2 + CUSHION_DEPTH / 2), CUSHION_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[CUSHION_DEPTH, CUSHION_HEIGHT, TABLE_LENGTH]} />
        <meshStandardMaterial color="#0a3d16" roughness={0.8} />
      </mesh>
      <mesh position={[TABLE_WIDTH / 2 + CUSHION_DEPTH / 2, CUSHION_HEIGHT / 2, 0]} receiveShadow>
        <boxGeometry args={[CUSHION_DEPTH, CUSHION_HEIGHT, TABLE_LENGTH]} />
        <meshStandardMaterial color="#0a3d16" roughness={0.8} />
      </mesh>
      <mesh position={[0, CUSHION_HEIGHT / 2, -(TABLE_LENGTH / 2 + CUSHION_DEPTH / 2)]} receiveShadow>
        <boxGeometry args={[TABLE_WIDTH, CUSHION_HEIGHT, CUSHION_DEPTH]} />
        <meshStandardMaterial color="#0a3d16" roughness={0.8} />
      </mesh>
      <mesh position={[0, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2 + CUSHION_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[TABLE_WIDTH, CUSHION_HEIGHT, CUSHION_DEPTH]} />
        <meshStandardMaterial color="#0a3d16" roughness={0.8} />
      </mesh>

      {/* Pockets Visuals */}
      {(() => {
        const pX = TABLE_WIDTH / 2 - 0.2;
        const pZ = TABLE_LENGTH / 2 - 0.2;
        const pockets = [
          [-pX, pZ], [pX, pZ],
          [-pX, 0], [pX, 0],
          [-pX, -pZ], [pX, -pZ]
        ];
        return pockets.map((pos, idx) => (
          <mesh key={`pocket-${idx}`} position={[pos[0], 0.01, pos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[POCKET_RADIUS, 32]} />
            <meshBasicMaterial color="#050505" />
          </mesh>
        ));
      })()}
    </group>
  );
}
