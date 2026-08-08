import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, RoundedBox, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useCallback, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameFrame } from './GameFrame';

const TABLE_W = 10;
const TABLE_H = 5.6;
const PUCK_R = 0.34;
const PADDLE_R = 0.58;

function Arena({ puck, player, ai, score }: { puck: [number, number]; player: [number, number]; ai: [number, number]; score: [number, number] }) {
  return <>
    <RoundedBox args={[11, 0.35, 6.6]} radius={0.28} smoothness={5} position={[0, -0.35, 0]}>
      <meshStandardMaterial color="#071629" metalness={0.8} roughness={0.2} />
    </RoundedBox>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} receiveShadow>
      <planeGeometry args={[TABLE_W, TABLE_H]} />
      <meshStandardMaterial color="#0b3555" metalness={0.35} roughness={0.28} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, 0]}>
      <ringGeometry args={[0.92, 0.96, 64]} />
      <meshBasicMaterial color="#63d7ff" transparent opacity={0.7} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, 0]}>
      <planeGeometry args={[0.045, TABLE_H]} />
      <meshBasicMaterial color="#8eeaff" transparent opacity={0.55} />
    </mesh>
    {[-1, 1].map((side) => <mesh key={side} position={[side * 5.25, 0.12, 0]} castShadow>
      <boxGeometry args={[0.18, 0.42, 6.1]} />
      <meshStandardMaterial color="#43c7ff" emissive="#126d9b" emissiveIntensity={1.4} metalness={0.7} roughness={0.2} />
    </mesh>)}
    {[-1, 1].map((side) => <mesh key={side} position={[0, 0.12, side * 2.85]} castShadow>
      <boxGeometry args={[10.5, 0.42, 0.18]} />
      <meshStandardMaterial color="#43c7ff" emissive="#126d9b" emissiveIntensity={1.4} metalness={0.7} roughness={0.2} />
    </mesh>)}
    <Text position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#9ceaff" anchorX="center" anchorY="middle">AQUA SPIN</Text>
    <Text position={[-2.1, 0.45, -3.05]} fontSize={0.48} color="#ffffff" anchorX="center">{score[0]}</Text>
    <Text position={[2.1, 0.45, -3.05]} fontSize={0.48} color="#ffffff" anchorX="center">{score[1]}</Text>
    <Paddle position={player} color="#5ee7ff" />
    <Paddle position={ai} color="#a78bfa" />
    <mesh position={[puck[0], 0.22, puck[1]]} castShadow>
      <cylinderGeometry args={[PUCK_R, PUCK_R, 0.22, 48]} />
      <meshStandardMaterial color="#f7fbff" emissive="#b8efff" emissiveIntensity={1.2} metalness={0.65} roughness={0.15} />
    </mesh>
  </>;
}

function Paddle({ position, color }: { position: [number, number]; color: string }) {
  return <mesh position={[position[0], 0.34, position[1]]} castShadow>
    <cylinderGeometry args={[PADDLE_R, PADDLE_R * 0.86, 0.48, 48]} />
    <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} metalness={0.75} roughness={0.18} />
  </mesh>;
}

function GameSimulation({ onScore }: { onScore: (player: boolean) => void }) {
  const [puck, setPuck] = useState<[number, number]>([0, 0]);
  const puckVelocity = useRef<[number, number]>([3.5, 1.7]);
  const [player, setPlayer] = useState<[number, number]>([0, 1.8]);
  const [ai, setAi] = useState<[number, number]>([0, -1.8]);
  const last = useRef(0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.032);
    const p = puck.slice() as [number, number];
    const v = puckVelocity.current;
    p[0] += v[0] * dt;
    p[1] += v[1] * dt;
    if (Math.abs(p[0]) > TABLE_W / 2 - PUCK_R) {
      if (Math.abs(p[1]) < 1.25) {
        onScore(v[0] > 0);
        p[0] = 0; p[1] = 0; v[0] = -v[0] * 0.98; v[1] = (Math.random() - 0.5) * 3;
      } else { p[0] = Math.sign(p[0]) * (TABLE_W / 2 - PUCK_R); v[0] *= -1; }
    }
    if (Math.abs(p[1]) > TABLE_H / 2 - PUCK_R) { p[1] = Math.sign(p[1]) * (TABLE_H / 2 - PUCK_R); v[1] *= -1; }
    const targetZ = p[1] > 0 ? 1.9 : -1.9;
    setAi(([x, z]) => [THREE.MathUtils.lerp(x, p[0], dt * 1.7), THREE.MathUtils.lerp(z, targetZ, dt * 2)]);
    setPuck(p);
    last.current += dt;
  });

  const move = useCallback((x: number, z: number) => {
    setPlayer([THREE.MathUtils.clamp(x, -4.5, 4.5), THREE.MathUtils.clamp(z, 0.35, 2.35)]);
  }, []);

  return <>
    <Arena puck={puck} player={player} ai={ai} score={[0, 0]} />
    <mesh position={[player[0], 0.6, player[1]]} onPointerMove={(e) => move(e.point.x, e.point.z)} visible={false}>
      <planeGeometry args={[TABLE_W, TABLE_H / 2]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  </>;
}

export function AirHockey3DGame({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [key, setKey] = useState(0);
  const handleScore = useCallback((player: boolean) => setScore(s => player ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]), []);
  return <GameFrame title="3D Neon Air Hockey" onClose={onClose} score={`${score[0]} - ${score[1]}`} onRestart={() => { setScore([0, 0]); setKey(k => k + 1); }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#174b72,#050b16_70%)]">
      <Canvas key={key} shadows camera={{ position: [0, 7.8, 7.8], fov: 48 }}>
        <color attach="background" args={["#050b16"]} />
        <ambientLight intensity={1.2} />
        <directionalLight position={[0, 7, 3]} intensity={4} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[0, 2, 0]} color="#36d8ff" intensity={18} distance={12} />
        <Float speed={1.2} rotationIntensity={0.04} floatIntensity={0.08}>
          <GameSimulation onScore={handleScore} />
        </Float>
        <ContactShadows position={[0, -0.1, 0]} opacity={0.55} scale={14} blur={2.4} far={8} />
        <EffectComposer><Bloom intensity={1.2} luminanceThreshold={0.7} mipmapBlur /><Vignette darkness={0.55} /></EffectComposer>
      </Canvas>
      <div className="absolute left-1/2 bottom-4 -translate-x-1/2 rounded-full border border-white/15 bg-black/30 px-4 py-2 text-xs text-white/70 backdrop-blur">Move your pointer over the table to control the paddle</div>
    </div>
  </GameFrame>;
}
