import { RigidBody, CuboidCollider, CylinderCollider } from '@react-three/rapier';

export const TABLE_WIDTH = 5.0; // Half-width = 2.5
export const TABLE_LENGTH = 10.0; // Half-length = 5.0
export const POCKET_RADIUS = 0.45;
export const CUSHION_HEIGHT = 0.5;

export function TableMesh() {
  return (
    <group>
      {/* Play Surface (Felt) */}
      <RigidBody type="fixed" friction={0.4} restitution={0.2} colliders={false}>
        <CuboidCollider args={[TABLE_WIDTH / 2, 0.1, TABLE_LENGTH / 2]} position={[0, -0.1, 0]} />
        <mesh position={[0, 0, 0]} receiveShadow>
          <boxGeometry args={[TABLE_WIDTH, 0.2, TABLE_LENGTH]} />
          <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#0b6623" roughness={0.8} metalness={0.1} />
        </mesh>
      </RigidBody>

      {/* Wood Rails (Visual) */}
      <mesh position={[0, 0.1, 0]} receiveShadow castShadow>
        {/* Simplified rail visuals for now, actual bounds are the physics colliders */}
        <boxGeometry args={[TABLE_WIDTH + 0.5, 0.4, TABLE_LENGTH + 0.5]} />
        <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#3b2f2f" roughness={0.6} metalness={0.3} />
      </mesh>

      {/* Inner Cutout for the play surface so the rails look like borders */}
      <mesh position={[0, 0.11, 0]} renderOrder={-1}>
         {/* This is a hacky way to create the inner void if we were using CSG. 
             Since we are not using CSG right now, the wood rails are just an outer rim.
         */}
      </mesh>
      
      {/* Let's build the rails properly using 4 long boxes instead of one big box */}
      <group position={[0, 0.2, 0]}>
        {/* Top Rail */}
        <RigidBody type="fixed" restitution={0.8} friction={0.2}>
          <mesh position={[0, 0, -TABLE_LENGTH / 2 - 0.25]} receiveShadow castShadow>
             <boxGeometry args={[TABLE_WIDTH + 1.0, CUSHION_HEIGHT, 0.5]} />
             <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#3b2f2f" />
          </mesh>
          <CuboidCollider args={[(TABLE_WIDTH + 1.0) / 2, CUSHION_HEIGHT / 2, 0.25]} position={[0, 0, -TABLE_LENGTH / 2 - 0.25]} />
        </RigidBody>

        {/* Bottom Rail */}
        <RigidBody type="fixed" restitution={0.8} friction={0.2}>
          <mesh position={[0, 0, TABLE_LENGTH / 2 + 0.25]} receiveShadow castShadow>
             <boxGeometry args={[TABLE_WIDTH + 1.0, CUSHION_HEIGHT, 0.5]} />
             <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#3b2f2f" />
          </mesh>
          <CuboidCollider args={[(TABLE_WIDTH + 1.0) / 2, CUSHION_HEIGHT / 2, 0.25]} position={[0, 0, TABLE_LENGTH / 2 + 0.25]} />
        </RigidBody>

        {/* Left Rail */}
        <RigidBody type="fixed" restitution={0.8} friction={0.2}>
          <mesh position={[-TABLE_WIDTH / 2 - 0.25, 0, 0]} receiveShadow castShadow>
             <boxGeometry args={[0.5, CUSHION_HEIGHT, TABLE_LENGTH]} />
             <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#3b2f2f" />
          </mesh>
          <CuboidCollider args={[0.25, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2]} position={[-TABLE_WIDTH / 2 - 0.25, 0, 0]} />
        </RigidBody>

        {/* Right Rail */}
        <RigidBody type="fixed" restitution={0.8} friction={0.2}>
          <mesh position={[TABLE_WIDTH / 2 + 0.25, 0, 0]} receiveShadow castShadow>
             <boxGeometry args={[0.5, CUSHION_HEIGHT, TABLE_LENGTH]} />
             <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#3b2f2f" />
          </mesh>
          <CuboidCollider args={[0.25, CUSHION_HEIGHT / 2, TABLE_LENGTH / 2]} position={[TABLE_WIDTH / 2 + 0.25, 0, 0]} />
        </RigidBody>
      </group>

      {/* Pockets (Sensors) */}
      {[
        [-TABLE_WIDTH / 2, -TABLE_LENGTH / 2], // Top Left
        [TABLE_WIDTH / 2, -TABLE_LENGTH / 2],  // Top Right
        [-TABLE_WIDTH / 2, 0],                 // Mid Left
        [TABLE_WIDTH / 2, 0],                  // Mid Right
        [-TABLE_WIDTH / 2, TABLE_LENGTH / 2],  // Bottom Left
        [TABLE_WIDTH / 2, TABLE_LENGTH / 2],   // Bottom Right
      ].map((pos, i) => (
        <group key={i} position={[pos[0], 0, pos[1]]}>
          <mesh position={[0, 0.05, 0]}>
            <cylinderGeometry args={[POCKET_RADIUS, POCKET_RADIUS, 0.1, 32]} />
            <meshBasicMaterial color="#000000" />
          </mesh>
          <RigidBody type="fixed" colliders={false} sensor name={`pocket_${i}`}>
            <CylinderCollider args={[0.5, POCKET_RADIUS]} />
          </RigidBody>
        </group>
      ))}
    </group>
  );
}
