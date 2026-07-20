import { usePlane, useBox, useCylinder } from '@react-three/cannon';
import { RoundedBox } from '@react-three/drei';
import { usePoolStore } from './store';

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
          clearcoat={0.1}
          clearcoatRoughness={0.8}
        />
      </mesh>
      
      {/* Rails - Static Boxes for Physics */}
      <Cushion position={[0, 0.05, -0.685]} size={[2.54, 0.1, 0.1]} /> {/* Top */}
      <Cushion position={[0, 0.05, 0.685]} size={[2.54, 0.1, 0.1]} />  {/* Bottom */}
      <Cushion position={[-1.32, 0.05, 0]} size={[0.1, 0.1, 1.27]} />  {/* Left */}
      <Cushion position={[1.32, 0.05, 0]} size={[0.1, 0.1, 1.27]} />   {/* Right */}
      
      {/* Wooden Frame styling */}
      <RoundedBox args={[2.8, 0.2, 1.5]} radius={0.02} smoothness={4} position={[0, -0.1, 0]} receiveShadow castShadow>
        <meshPhysicalMaterial 
          color={0x2b1509}
          roughness={0.2}
          metalness={0.05}
          clearcoat={1.0}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>
      
      {/* Pockets */}
      <Pocket position={[-1.27, -0.05, -0.635]} /> {/* Top Left */}
      <Pocket position={[0, -0.05, -0.68]} />      {/* Top Center */}
      <Pocket position={[1.27, -0.05, -0.635]} />  {/* Top Right */}
      <Pocket position={[-1.27, -0.05, 0.635]} />  {/* Bottom Left */}
      <Pocket position={[0, -0.05, 0.68]} />       {/* Bottom Center */}
      <Pocket position={[1.27, -0.05, 0.635]} />   {/* Bottom Right */}
    </group>
  );
}

function Pocket({ position }: { position: [number, number, number] }) {
  const [ref] = useCylinder(() => ({
    type: 'Static',
    args: [0.06, 0.06, 0.2, 16], // Slightly larger than ball radius
    position,
    isTrigger: true,
    onCollide: (e) => {
      const ballId = Number(e.body.userData?.id);
      if (!isNaN(ballId)) {
        usePoolStore.getState().registerPocket(ballId);
      }
    }
  }));
  return (
    <group position={position}>
      {/* Physics trigger */}
      <mesh ref={ref as any}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 16]} />
        <meshBasicMaterial color={0x000000} transparent opacity={0} />
      </mesh>
      {/* Visual Pocket Hole */}
      <mesh position={[0, 0.06, 0]} rotation={[Math.PI/2, 0, 0]}>
        <circleGeometry args={[0.06, 32]} />
        <meshBasicMaterial color={0x000000} />
      </mesh>
      {/* Metal trim */}
      <mesh position={[0, 0.061, 0]} rotation={[Math.PI/2, 0, 0]}>
        <ringGeometry args={[0.06, 0.08, 32]} />
        <meshStandardMaterial color={0xd4d4d4} metalness={0.9} roughness={0.1} />
      </mesh>
    </group>
  );
}

function Cushion({ position, size }: { position: [number, number, number], size: [number, number, number] }) {
  const [ref] = useBox(() => ({
    args: size,
    position,
    material: 'cushion',
    type: 'Static',
    userData: { name: 'cushion' }
  }));
  return (
    <mesh ref={ref as any} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshPhysicalMaterial color={0x12522c} roughness={0.8} />
    </mesh>
  );
}
