import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, RoundedBox, Text } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useMemo, useState } from 'react';
import * as THREE from 'three';
import { GameFrame } from './GameFrame';

function Pin({ position, fallen, index }: { position: [number, number, number]; fallen: boolean; index: number }) {
  const ref = useMemo(() => ({ t: 0 }), []);
  useFrame((_, dt) => { if (fallen) ref.t = Math.min(1, ref.t + dt * 3.8); });
  const r = fallen ? ref.t : 0;
  return <group position={position} rotation={[r * (0.8 + index * 0.08), r * (0.4 + index * 0.04), r * (index % 2 ? 0.9 : -0.9)]}>
    <mesh castShadow position={[0, 0.62, 0]}>
      <cylinderGeometry args={[0.13, 0.24, 1.1, 24]} />
      <meshStandardMaterial color="#f5f7fb" roughness={0.28} metalness={0.08} />
    </mesh>
    <mesh castShadow position={[0, 1.2, 0]}>
      <sphereGeometry args={[0.24, 24, 24]} />
      <meshStandardMaterial color="#f5f7fb" roughness={0.28} metalness={0.08} />
    </mesh>
    <mesh position={[0, 0.98, 0]}>
      <torusGeometry args={[0.18, 0.035, 8, 24]} />
      <meshStandardMaterial color="#e94b4b" emissive="#7d1111" emissiveIntensity={0.15} />
    </mesh>
  </group>;
}

function Lane({ pinsFallen, rolling, power, spin }: { pinsFallen: boolean; rolling: boolean; power: number; spin: number }) {
  const ballRef = useMemo(() => ({ t: 0 }), []);
  useFrame((_, dt) => { if (rolling) ballRef.t = Math.min(1, ballRef.t + dt * (0.48 + power * 0.45)); });
  const t = rolling ? ballRef.t : 0;
  const z = THREE.MathUtils.lerp(4.1, -7.2, t);
  const x = Math.sin(t * Math.PI) * spin * 1.7;
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -1.4]} receiveShadow>
      <planeGeometry args={[5.2, 13]} />
      <meshStandardMaterial color="#b97943" roughness={0.34} metalness={0.05} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.06, -1.4]}>
      <planeGeometry args={[4.8, 12.5]} />
      <meshStandardMaterial color="#d39a5e" roughness={0.3} />
    </mesh>
    {[-2.65, 2.65].map(xp => <mesh key={xp} position={[xp, 0.15, -1.4]}>
      <boxGeometry args={[0.12, 0.32, 13]} />
      <meshStandardMaterial color="#e5edf3" metalness={0.6} roughness={0.25} />
    </mesh>)}
    {Array.from({ length: 10 }).map((_, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x0 = (col - 1) * (0.42 + row * 0.08) + (row % 2 ? 0.2 : 0);
      const z0 = -6.0 - row * 0.52;
      return <Pin key={i} index={i} position={[x0, 0, z0]} fallen={pinsFallen} />;
    })}
    <mesh position={[x, 0.34, z]} rotation={[t * 9, t * 12, t * 5]} castShadow>
      <sphereGeometry args={[0.46, 40, 40]} />
      <meshStandardMaterial color="#17233a" metalness={0.7} roughness={0.14} emissive="#263e72" emissiveIntensity={0.55} />
    </mesh>
  </>;
}

export function Bowling3DGame({ onClose }: { onClose: () => void }) {
  const [power, setPower] = useState(0.72);
  const [spin, setSpin] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [pinsFallen, setPinsFallen] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const roll = () => { if (rolling) return; setRolling(true); setPinsFallen(false); setRound(r => r + 1); window.setTimeout(() => { const knocked = Math.max(1, Math.min(10, Math.round(power * 10 - Math.abs(spin) * 2))); setScore(s => s + knocked); setPinsFallen(true); window.setTimeout(() => setRolling(false), 1200); }, 1900); };
  return <GameFrame title="3D Bowling" onClose={onClose} score={score} level={`Round ${round}`} onRestart={() => { setScore(0); setRound(0); setRolling(false); setPinsFallen(false); }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_10%,#263d63,#070b12_72%)]">
      <Canvas shadows camera={{ position: [0, 5.4, 7.8], fov: 44 }}>
        <color attach="background" args={["#070b12"]} />
        <ambientLight intensity={1.35} />
        <spotLight position={[0, 9, 2]} angle={0.5} penumbra={0.7} intensity={85} castShadow shadow-mapSize={[2048, 2048]} />
        <pointLight position={[-4, 4, -3]} color="#5bc8ff" intensity={12} distance={12} />
        <pointLight position={[4, 4, -3]} color="#a78bfa" intensity={12} distance={12} />
        <Lane pinsFallen={pinsFallen} rolling={rolling} power={power} spin={spin} />
        <Text position={[0, 0.12, 3.1]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.5} color="#e7f7ff">AQUA SPIN BOWLING</Text>
        <ContactShadows position={[0, -0.05, -1]} opacity={0.55} scale={9} blur={2.3} far={10} />
        <EffectComposer><Bloom intensity={0.8} luminanceThreshold={0.85} mipmapBlur /><Vignette darkness={0.52} /></EffectComposer>
      </Canvas>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,480px)] rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-white/80">
          <label>POWER <input aria-label="Bowling power" type="range" min="0.2" max="1" step="0.01" value={power} onChange={e => setPower(Number(e.target.value))} className="mt-2 w-full accent-cyan-400" /></label>
          <label>SPIN <input aria-label="Bowling spin" type="range" min="-1" max="1" step="0.01" value={spin} onChange={e => setSpin(Number(e.target.value))} className="mt-2 w-full accent-violet-400" /></label>
        </div>
        <button onClick={roll} disabled={rolling} className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-black text-slate-950 transition-transform hover:scale-[1.01] disabled:opacity-50">{rolling ? 'ROLLING…' : 'ROLL BALL'}</button>
      </div>
    </div>
  </GameFrame>;
}
