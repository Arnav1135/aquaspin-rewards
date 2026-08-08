import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { TableMesh, TABLE_LENGTH } from './TableMesh';
import { BallMesh, BALL_RADIUS } from './BallMesh';
import { CueStick } from './CueStick';
import { usePoolRules } from './RulesEngine';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

interface Scene3DProps { cueAngle: number; power: number; }

export function Scene3D({ cueAngle, power }: Scene3DProps) {
  const { camera } = useThree();
  const turnState = usePoolRules(s => s.turnState);
  const cueBallRef = useRef<RapierRigidBody>(null);
  const cameraTarget = useRef(new THREE.Vector3());
  const cameraPosition = useRef(new THREE.Vector3());

  const initialBalls = useMemo(() => {
    const balls: { id: number; position: [number, number, number] }[] = [];
    const startZ = TABLE_LENGTH / 4;
    const spacing = BALL_RADIUS * 2.05;
    const sqrt3 = Math.sqrt(3);
    let id = 1;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col <= row; col++) {
        const x = (col - row / 2) * spacing;
        const z = startZ + row * (spacing * sqrt3 / 2);
        let ballId = id;
        if (row === 2 && col === 1) ballId = 8;
        else if (id === 8) ballId = 5;
        balls.push({ id: ballId, position: [x, BALL_RADIUS, z] });
        id++;
      }
    }
    return balls;
  }, []);

  const [cueBallPos, setCueBallPos] = useState<[number, number, number]>([0, BALL_RADIUS, -TABLE_LENGTH / 4]);

  useFrame(() => {
    const body = cueBallRef.current;
    if (!body) return;
    const pos = body.translation();
    setCueBallPos([pos.x, pos.y, pos.z]);

    const aiming = turnState === 'AIMING' || turnState === 'BALL_IN_HAND';
    const camDistance = aiming ? 4.0 : 5.5;
    const camHeight = aiming ? 3.0 : 7.5;
    const offsetZ = aiming ? 1 : 4;

    cameraTarget.current.set(pos.x, aiming ? pos.y : 0.2, pos.z);
    cameraPosition.current.set(
      pos.x - Math.sin(cueAngle) * camDistance,
      camHeight,
      pos.z - Math.cos(cueAngle) * camDistance + offsetZ,
    );

    camera.position.lerp(cameraPosition.current, aiming ? 0.12 : 0.06);
    const lookTarget = cameraTarget.current;
    camera.lookAt(lookTarget);
  });

  useEffect(() => {
    const handleStrike = (event: Event) => {
      const { power: strikePower, angle } = (event as CustomEvent).detail as { power: number; angle: number };
      if (!cueBallRef.current || turnState !== 'AIMING') return;
      const clampedPower = THREE.MathUtils.clamp(Number(strikePower) || 0, 0, 1);
      const forceMultiplier = 50;
      cueBallRef.current.applyImpulse({
        x: -Math.sin(angle) * clampedPower * forceMultiplier,
        y: 0,
        z: -Math.cos(angle) * clampedPower * forceMultiplier,
      }, true);
      usePoolRules.getState().ballsRolling();
    };
    window.addEventListener('pool-strike', handleStrike);
    return () => window.removeEventListener('pool-strike', handleStrike);
  }, [turnState]);

  useEffect(() => {
    if (turnState !== 'ROLLING') return;
    const timer = window.setTimeout(() => {
      usePoolRules.getState().resolveTurn(null, [], false);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [turnState]);

  return (
    <>
      <color attach="background" args={['#06151b']} />
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#bff6ff', '#071018', 0.7]} />
      <rectAreaLight position={[0, 6, 0]} rotation={[-Math.PI / 2, 0, 0]} width={7} height={12} intensity={4.5} />
      <pointLight position={[0, 3.5, 0]} intensity={0.6} distance={12} />
      <directionalLight position={[4, 10, 6]} intensity={1.4} castShadow shadow-mapSize={[2048, 2048]} />

      <Physics gravity={[0, -9.81, 0]}>
        <TableMesh />
        <BallMesh ref={cueBallRef} id={0} position={cueBallPos} isCue />
        {initialBalls.map(ball => <BallMesh key={ball.id} id={ball.id} position={ball.position} />)}
      </Physics>

      <CueStick
        position={cueBallPos}
        rotation={cueAngle}
        power={power}
        isVisible={turnState === 'AIMING' || turnState === 'BALL_IN_HAND'}
      />

      {(turnState === 'AIMING' || turnState === 'BALL_IN_HAND') && (
        <Line
          points={[
            new THREE.Vector3(cueBallPos[0], BALL_RADIUS, cueBallPos[2]),
            new THREE.Vector3(cueBallPos[0] - Math.sin(cueAngle) * 10, BALL_RADIUS, cueBallPos[2] - Math.cos(cueAngle) * 10),
          ]}
          color="#dffbff"
          lineWidth={2}
          dashed
          dashSize={0.2}
          dashScale={0.1}
          dashOffset={0}
        />
      )}
    </>
  );
}
