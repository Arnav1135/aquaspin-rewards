import { usePlane, useBox, useCylinder } from '@react-three/cannon';
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
      {/* Pockets */}
      <Pocket position={[-1.27, -0.05, -0.635]} /> // Top Left
      <Pocket position={[0, -0.05, -0.68]} />      // Top Center
      <Pocket position={[1.27, -0.05, -0.635]} />  // Top Right
      <Pocket position={[-1.27, -0.05, 0.635]} />  // Bottom Left
      <Pocket position={[0, -0.05, 0.68]} />       // Bottom Center
      <Pocket position={[1.27, -0.05, 0.635]} />   // Bottom Right
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
        // We also need to move the ball out of play. We can send a message to it or modify its position manually, 
        // but for now, we'll let the ball fall through since it's a trigger and gravity applies!
        // Wait, the felt floor plane extends everywhere. 
        // For a true pocket, it needs to fall. We'll handle visuals in Phase 2/3.
      }
    }
  }));
  return (
    <mesh ref={ref as any} position={position}>
      <cylinderGeometry args={[0.06, 0.06, 0.2, 16]} />
      <meshBasicMaterial color={0x000000} />
    </mesh>
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