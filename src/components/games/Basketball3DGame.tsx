import { useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox, Text } from '@react-three/drei';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { GameFrame } from './GameFrame';
import { GameEngine3D } from '../../engine/GameEngine3D';

function Ball({ shooting, power, onResult }: { shooting: boolean; power: number; onResult: (scored: boolean) => void }) {
  const ref = useMemo(() => ({ t: 0, reported: false }), []);

  useFrame((_, dt) => {
    if (!shooting) {
      ref.t = 0;
      ref.reported = false;
      return;
    }
    ref.t += dt;
    if (ref.t >= 1.8 && !ref.reported) {
      ref.reported = true;
      onResult(power >= 0.52 && power <= 0.82);
    }
  });

  const t = shooting ? Math.min(ref.t, 1.8) / 1.8 : 0;
  const z = THREE.MathUtils.lerp(2.7, -3.0, t);
  const y = shooting
    ? 0.35 + 1.2 * t + 4.5 * t * (1 - t) + (power - 0.65) * 0.7 * t
    : 0.35;

  return (
    <mesh
      position={[0, y, z]}
      rotation={[ref.t * 6, ref.t * 4, ref.t * 3]}
      castShadow
    >
      <sphereGeometry args={[0.42, 48, 48]} />
      <meshStandardMaterial
        color="#c86a24"
        roughness={0.58}
        metalness={0.06}
        envMapIntensity={1.2}
        clearcoat={0.15}
      />
    </mesh>
  );
}

function Court() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[8.5, 10]} />
        <meshStandardMaterial color="#8d542c" roughness={0.34} metalness={0.02} />
      </mesh>
      <mesh position={[0, 2.8, -3.25]} castShadow>
        <boxGeometry args={[3.1, 2.2, 0.12]} />
        <meshPhysicalMaterial
          color="#dff7ff"
          transparent
          opacity={0.82}
          roughness={0.12}
          metalness={0.18}
          transmission={0.08}
          thickness={0.08}
        />
      </mesh>
      <mesh position={[0, 1.55, -2.92]} castShadow>
        <torusGeometry args={[0.62, 0.075, 20, 64]} />
        <meshStandardMaterial
          color="#ff8a3d"
          emissive="#8b3210"
          emissiveIntensity={0.7}
          metalness={0.65}
          roughness={0.2}
        />
      </mesh>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-1.1 + i * 0.36, 0.9, -2.92]}>
          <cylinderGeometry args={[0.012, 0.012, 1.1, 8]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
        </mesh>
      ))}
      <RoundedBox args={[2.4, 0.25, 0.45]} radius={0.08} position={[0, 1.1, -2.9]}>
        <meshStandardMaterial color="#1d2733" metalness={0.8} roughness={0.2} />
      </RoundedBox>
      <Text position={[0, 0.08, 1.2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.55} color="#ffe5ce">
        AQUA SPIN
      </Text>
    </>
  );
}

export function Basketball3DGame({ onClose }: { onClose: () => void }) {
  const [power, setPower] = useState(0.65);
  const [shooting, setShooting] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'score' | 'miss' | null>(null);

  const takeShot = () => {
    if (shooting) return;
    setResult(null);
    setShooting(true);
  };

  const finished = (scored: boolean) => {
    if (scored) setScore(s => s + 1);
    setResult(scored ? 'score' : 'miss');
    setShooting(false);
  };

  return (
    <GameFrame
      title="3D Basketball Arcade"
      onClose={onClose}
      score={score}
      onRestart={() => {
        setScore(0);
        setShooting(false);
        setResult(null);
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,#6d351b,#120b08_70%)]">
        <GameEngine3D
          enablePostProcessing
          cameraPosition={[0, 5.2, 8.6]}
          cameraFov={43}
          environmentPreset="warehouse"
          quality="auto"
          enableAtmosphere
        >
          <Court />
          <Ball shooting={shooting} power={power} onResult={finished} />
          <ContactShadows position={[0, -0.01, 0]} opacity={0.6} scale={10} blur={2.2} far={8} />
        </GameEngine3D>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,460px)] rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl">
          <div className="mb-2 flex justify-between text-xs font-bold text-white/80">
            <span>SHOT POWER</span>
            <span>{Math.round(power * 100)}%</span>
          </div>
          <input
            aria-label="Shot power"
            type="range"
            min="0.15"
            max="1"
            step="0.01"
            value={power}
            onChange={e => setPower(Number(e.target.value))}
            className="w-full accent-orange-400"
          />
          <button
            onClick={takeShot}
            disabled={shooting}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 px-5 py-3 font-black text-slate-950 transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {shooting ? 'SHOT IN MOTION…' : 'SHOOT'}
          </button>
          {result && (
            <div className="mt-2 text-center text-xs font-black text-white/80">
              {result === 'score' ? '🏀 SWISH!' : 'MISS — adjust your power'}
            </div>
          )}
        </div>
      </div>
    </GameFrame>
  );
}
