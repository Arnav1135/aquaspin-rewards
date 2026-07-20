import { usePlane, useBox } from '@react-three/cannon';

export function Table() {
  // Felt surface
  const [feltRef] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    material: 'table',
    type: 'Static'
  }));

  // Create highly realistic procedural felt material since we lack textures
  return (
    <group>
      {/* Felt Floor */}
      <mesh ref={feltRef as any} receiveShadow>
        <planeGeometry args={[2.54, 1.27]} /> {/* 9ft table approx play area */}
        <meshPhysicalMaterial 
          color={0x1a6b3c}
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>
      
      {/* Rails - Static Boxes */}
      <Cushion position={[0, 0.05, -0.685]} size={[2.54, 0.1, 0.1]} /> // Top
      <Cushion position={[0, 0.05, 0.685]} size={[2.54, 0.1, 0.1]} />  // Bottom
      <Cushion position={[-1.32, 0.05, 0]} size={[0.1, 0.1, 1.27]} />  // Left
      <Cushion position={[1.32, 0.05, 0]} size={[0.1, 0.1, 1.27]} />   // Right
      
      {/* Wooden Frame styling */}
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[2.8, 0.1, 1.5]} />
        <meshPhysicalMaterial 
          color={0x3a2010}
          roughness={0.3}
          metalness={0.1}
          clearcoat={0.8}
          clearcoatRoughness={0.1}
        />
      </mesh>
    </group>
  );
}

function Cushion({ position, size }: { position: [number, number, number], size: [number, number, number] }) {
  const [ref] = useBox(() => ({
    args: size,
    position,
    material: 'cushion',
    type: 'Static'
  }));
  return (
    <mesh ref={ref as any} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color={0x12522c} roughness={0.8} />
    </mesh>
  );
}