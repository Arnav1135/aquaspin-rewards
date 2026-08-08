import { useCallback, useRef, useState } from 'react';
import { Text, ContactShadows, RoundedBox } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GameEngine3D } from '../../engine/GameEngine3D';
import { GameFrame } from './GameFrame';

const TABLE_W = 10;
const TABLE_H = 5.6;
const PUCK_R = 0.34;
const PADDLE_R = 0.58;

type Score = [number, number];
type Point = [number, number];

function Paddle({ position, color }: { position: Point; color: string }) {
  return (
    <mesh position={[position[0], 0.34, position[1]]} castShadow>
      <cylinderGeometry args={[PADDLE_R, PADDLE_R * 0.86, 0.48, 48]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.28} metalness={0.8} roughness={0.2} clearcoat={0.5} />
    </mesh>
  );
}

function Arena({
  puck,
  player,
  ai,
  score,
  onPointerMove,
}: {
  puck: Point;
  player: Point;
  ai: Point;
  score: Score;
  onPointerMove: (x: number, z: number) => void;
}) {
  const puckRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (puckRef.current) {
      puckRef.current.rotation.y += delta * 8;
      puckRef.current.position.y = 0.22 + Math.sin(performance.now() * 0.008) * 0.006;
    }
  });

  return (
    <>
      <RoundedBox args={[11, 0.35, 6.6]} radius={0.28} smoothness={6} position={[0, -0.35, 0]} receiveShadow castShadow>
        <meshStandardMaterial color="#071629" metalness={0.82} roughness={0.22} />
      </RoundedBox>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.14, 0]}
        receiveShadow
        onPointerMove={(event) => onPointerMove(event.point.x, event.point.z)}
      >
        <planeGeometry args={[TABLE_W, TABLE_H]} />
        <meshStandardMaterial color="#0b3555" metalness={0.28} roughness={0.3} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, 0]}>
        <ringGeometry args={[0.92, 0.96, 64]} />
        <meshBasicMaterial color="#63d7ff" transparent opacity={0.65} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
        <planeGeometry args={[0.045, TABLE_H]} />
        <meshBasicMaterial color="#8eeaff" transparent opacity={0.5} />
      </mesh>

      {[-1, 1].map((side) => (
        <mesh key={`v-${side}`} position={[side * 5.25, 0.12, 0]} castShadow>
          <boxGeometry args={[0.18, 0.42, 6.1]} />
          <meshStandardMaterial color="#43c7ff" emissive="#126d9b" emissiveIntensity={1.1} metalness={0.7} roughness={0.22} />
        </mesh>
      ))}

      {[-1, 1].map((side) => (
        <mesh key={`h-${side}`} position={[0, 0.12, side * 2.85]} castShadow>
          <boxGeometry args={[10.5, 0.42, 0.18]} />
          <meshStandardMaterial color="#43c7ff" emissive="#126d9b" emissiveIntensity={1.1} metalness={0.7} roughness={0.22} />
        </mesh>
      ))}

      <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#9ceaff" anchorX="center" anchorY="middle">
        AQUA SPIN
      </Text>
      <Text position={[-2.1, 0.45, -3.05]} fontSize={0.48} color="#ffffff" anchorX="center">{score[0]}</Text>
      <Text position={[2.1, 0.45, -3.05]} fontSize={0.48} color="#ffffff" anchorX="center">{score[1]}</Text>

      <Paddle position={player} color="#5ee7ff" />
      <Paddle position={ai} color="#a78bfa" />

      <mesh ref={puckRef} position={[puck[0], 0.22, puck[1]]} castShadow>
        <cylinderGeometry args={[PUCK_R, PUCK_R, 0.22, 48]} />
        <meshStandardMaterial color="#f7fbff" emissive="#8edfff" emissiveIntensity={0.9} metalness={0.75} roughness={0.16} clearcoat={0.7} />
      </mesh>
    </>
  );
}

function GameSimulation({
  score,
  onScore,
}: {
  score: Score;
  onScore: (player: boolean) => void;
}) {
  const [puck, setPuck] = useState<Point>([0, 0]);
  const puckVelocity = useRef<Point>([3.5, 1.7]);
  const [player, setPlayer] = useState<Point>([0, 1.8]);
  const [ai, setAi] = useState<Point>([0, -1.8]);
  const lastGoal = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.025);
    const p = puck.slice() as Point;
    const v = puckVelocity.current;

    // Small aerodynamic drag keeps the puck from gaining energy indefinitely.
    const drag = Math.pow(0.992, dt * 60);
    v[0] *= drag;
    v[1] *= drag;

    p[0] += v[0] * dt;
    p[1] += v[1] * dt;

    if (Math.abs(p[0]) > TABLE_W / 2 - PUCK_R) {
      if (Math.abs(p[1]) < 1.25 && performance.now() - lastGoal.current > 700) {
        lastGoal.current = performance.now();
        onScore(v[0] > 0);
        p[0] = 0;
        p[1] = 0;
        v[0] = -Math.sign(v[0] || 1) * 3.5;
        v[1] = 1.7;
      } else {
        p[0] = THREE.MathUtils.clamp(p[0], -TABLE_W / 2 + PUCK_R, TABLE_W / 2 - PUCK_R);
        v[0] *= -0.96;
      }
    }

    if (Math.abs(p[1]) > TABLE_H / 2 - PUCK_R) {
      p[1] = THREE.MathUtils.clamp(p[1], -TABLE_H / 2 + PUCK_R, TABLE_H / 2 - PUCK_R);
      v[1] *= -0.96;
    }

    const hitPlayer = Math.hypot(p[0] - player[0], p[1] - player[1]) < PADDLE_R + PUCK_R;
    const hitAi = Math.hypot(p[0] - ai[0], p[1] - ai[1]) < PADDLE_R + PUCK_R;

    if (hitPlayer && v[1] > 0) {
      v[1] = -Math.max(Math.abs(v[1]) * 1.03, 2.4);
      v[0] += (p[0] - player[0]) * 1.35;
    }

    if (hitAi && v[1] < 0) {
      v[1] = Math.max(Math.abs(v[1]) * 1.02, 2.4);
      v[0] += (p[0] - ai[0]) * 1.15;
    }

    const speed = Math.hypot(v[0], v[1]);
    if (speed > 8) {
      const scale = 8 / speed;
      v[0] *= scale;
      v[1] *= scale;
    }

    const targetZ = p[1] > 0 ? 1.9 : -1.9;
    setAi(([x, z]) => [THREE.MathUtils.lerp(x, p[0], dt * 1.7), THREE.MathUtils.lerp(z, targetZ, dt * 2)]);
    setPuck(p);
  });

  const move = useCallback((x: number, z: number) => {
    setPlayer([
      THREE.MathUtils.clamp(x, -4.5, 4.5),
      THREE.MathUtils.clamp(z, 0.35, 2.35),
    ]);
  }, []);

  return <Arena puck={puck} player={player} ai={ai} score={score} onPointerMove={move} />;
}

export function AirHockey3DGame({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState<Score>([0, 0]);
  const [key, setKey] = useState(0);
  const handleScore = useCallback(
    (player: boolean) => setScore((current) => player ? [current[0] + 1, current[1]] : [current[0], current[1] + 1]),
    [],
  );

  return (
    <GameFrame
      title="3D Neon Air Hockey"
      onClose={onClose}
      score={`${score[0]} - ${score[1]}`}
      onRestart={() => { setScore([0, 0]); setKey((value) => value + 1); }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#174b72,#050b16_70%)]">
        <GameEngine3D
          key={key}
          quality="auto"
          enablePostProcessing
          environmentPreset="night"
          cameraPosition={[0, 7.8, 7.8]}
          cameraFov={48}
        >
          <GameSimulation score={score} onScore={handleScore} />
          <ContactShadows position={[0, -0.1, 0]} opacity={0.55} scale={14} blur={2.4} far={8} />
        </GameEngine3D>
        <div className="absolute left-1/2 bottom-4 -translate-x-1/2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-white/70 backdrop-blur">
          Move your pointer over the table to control the paddle
        </div>
      </div>
    </GameFrame>
  );
}
