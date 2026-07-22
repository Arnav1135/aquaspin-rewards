import { useSphere } from '@react-three/cannon';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Mesh } from 'three';
import { usePoolStore } from './store';
import { Text } from '@react-three/drei';

interface PoolBallProps {
  id: number;
  position: [number, number, number];
  color: string;
  isCue?: boolean;
}

const BALL_RADIUS = 0.35; // Size in 3D units

export function PoolBall3D({ id, position, color, isCue = false }: PoolBallProps) {
  const [ref, api] = useSphere(() => ({
    mass: 1, // 1 kg
    position,
    args: [BALL_RADIUS],
    material: { friction: 0.1, restitution: 0.8 },
    linearDamping: 0.2, // Simulate rolling friction on cloth
    angularDamping: 0.2,
  }), useRef<Mesh>(null));

  const pocketBall = usePoolStore((state) => state.pocketBall);
  const pocketed = usePoolStore((state) => state.ballsPocketed.includes(id));
  const setCueBallPosition = usePoolStore((state) => state.setCueBallPosition);

  // Fallback AI Engine check: if ball goes below table or NaN, reset it
  useFrame(() => {
    if (pocketed) return;
    
    if (ref.current) {
      const pos = ref.current.position;
      
      // AI Engine: NaN safeguard
      if (isNaN(pos.x) || isNaN(pos.y) || isNaN(pos.z)) {
        api.position.set(0, 2, 0);
        api.velocity.set(0, 0, 0);
      }
      
      // Pocket logic: if ball falls below the table
      if (pos.y < -0.5) {
        if (isCue) {
          // Cue ball sink: Reset it above the table
          api.position.set(0, 2, 5);
          api.velocity.set(0, 0, 0);
          api.angularVelocity.set(0, 0, 0);
        } else {
          // Normal ball sunk
          pocketBall(id);
        }
      }

      // Sync cue ball pos for aim line
      if (isCue) {
        setCueBallPosition([pos.x, pos.y, pos.z]);
      }
    }
  });

  useEffect(() => {
    if (!isCue) return;
    const handleShoot = (e: any) => {
      const { angle, power } = e.detail;
      const forceMultiplier = 40; // Max impulse
      const impulseX = -Math.sin(angle) * power * forceMultiplier;
      const impulseZ = -Math.cos(angle) * power * forceMultiplier;
      api.applyImpulse([impulseX, 0, impulseZ], [0, 0, 0]);
    };
    window.addEventListener('pool-shoot', handleShoot);
    return () => window.removeEventListener('pool-shoot', handleShoot);
  }, [isCue, api]);

  if (pocketed && !isCue) return null;

  return (
    <mesh ref={ref as any} castShadow receiveShadow>
      <sphereGeometry args={[BALL_RADIUS, 32, 32]} />
      <meshPhysicalMaterial 
        color={isCue ? '#ffffff' : color} 
        roughness={0.1} 
        metalness={0.1}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
      />
      {!isCue && (
        <>
          {/* White circle background for number */}
          <mesh position={[0, 0, BALL_RADIUS + 0.005]}>
            <circleGeometry args={[BALL_RADIUS * 0.45, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0, -BALL_RADIUS - 0.005]} rotation={[0, Math.PI, 0]}>
            <circleGeometry args={[BALL_RADIUS * 0.45, 32]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <Text 
            position={[0, 0, BALL_RADIUS + 0.01]} 
            fontSize={0.25} 
            color="#000000" 
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            anchorX="center" 
            anchorY="middle"
          >
            {id.toString()}
          </Text>
          <Text 
            position={[0, 0, -BALL_RADIUS - 0.01]} 
            rotation={[0, Math.PI, 0]}
            fontSize={0.25} 
            color="#000000" 
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff"
            anchorX="center" 
            anchorY="middle"
          >
            {id.toString()}
          </Text>
        </>
      )}
    </mesh>
  );
}
