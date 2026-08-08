import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { AquaSpinEngine } from '../../engine/3d';
import { GameFrame } from './GameFrame';
import { GameEngine3D } from '../../engine/GameEngine3D';

function Pin({ position, index }: { position: [number, number, number], index: number }) {
  return (
    <RigidBody 
      position={position} 
      colliders="hull" 
      restitution={0.2} 
      friction={0.1}
      mass={0.5}
      linearDamping={0.1}
      angularDamping={0.1}
    >
      <group>
        <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.08, 0.2, 0.8, 16]} />
          <meshStandardMaterial color="#f5f7fb" metalness={0.1} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.8, 0]} castShadow receiveShadow>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial color="#f5f7fb" metalness={0.1} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
          <torusGeometry args={[0.12, 0.03, 8, 16]} />
          <meshStandardMaterial color="#e94b4b" emissive="#7d1111" emissiveIntensity={0.5} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function BowlingLane() {
  return (
    <group>
      {/* Lane Surface */}
      <RigidBody type="fixed" restitution={0.1} friction={0.05}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -5]} receiveShadow>
          <planeGeometry args={[4, 20]} />
          <meshStandardMaterial color="#d39a5e" metalness={0.2} roughness={0.1} />
        </mesh>
      </RigidBody>
      
      {/* Gutters */}
      <RigidBody type="fixed" restitution={0} friction={0.5}>
        <mesh position={[-2.3, -0.1, -5]} receiveShadow>
          <boxGeometry args={[0.6, 0.2, 20]} />
          <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
        </mesh>
        <mesh position={[2.3, -0.1, -5]} receiveShadow>
          <boxGeometry args={[0.6, 0.2, 20]} />
          <meshStandardMaterial color="#222" metalness={0.5} roughness={0.5} />
        </mesh>
      </RigidBody>

      {/* Bumpers/Walls */}
      <RigidBody type="fixed" restitution={0.5} friction={0}>
        <mesh position={[-2.7, 0.2, -5]}>
          <boxGeometry args={[0.2, 0.6, 20]} />
          <meshStandardMaterial color="#445" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh position={[2.7, 0.2, -5]}>
          <boxGeometry args={[0.2, 0.6, 20]} />
          <meshStandardMaterial color="#445" metalness={0.5} roughness={0.2} />
        </mesh>
      </RigidBody>
      
      {/* Back Wall */}
      <RigidBody type="fixed" restitution={0.2} friction={0.5}>
        <mesh position={[0, 1, -15.5]}>
          <boxGeometry args={[6, 2, 1]} />
          <meshStandardMaterial color="#112" metalness={0.5} roughness={0.5} />
        </mesh>
      </RigidBody>
    </group>
  );
}

function BowlingBall({ rolling, power, spin, onFinish }: { rolling: boolean, power: number, spin: number, onFinish: () => void }) {
  const ballRef = useRef<RapierRigidBody>(null);
  const doneRef = useRef(false);
  
  useState(() => {
    if (rolling && ballRef.current) {
      const p = 15 + (power * 35);
      ballRef.current.applyImpulse({ x: spin * 3, y: 0, z: -p }, true);
      ballRef.current.applyTorqueImpulse({ x: -p * 0.2, y: spin * 2, z: 0 }, true);
    }
  });

  useFrame(() => {
    if (!ballRef.current) return;
    const pos = ballRef.current.translation();
    if (pos.z < -14 && !doneRef.current) {
      doneRef.current = true;
      setTimeout(onFinish, 2000); // wait 2 seconds after hitting back to count pins
    }
  });

  return (
    <RigidBody 
      ref={ballRef}
      position={[0, 0.3, 4]} 
      colliders="ball" 
      restitution={0.4} 
      friction={0.1}
      mass={6.0}
      type={rolling ? "dynamic" : "kinematicPosition"}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color="#17233a" metalness={0.8} roughness={0.1} emissive="#263e72" emissiveIntensity={0.2} />
      </mesh>
    </RigidBody>
  );
}

export function Bowling3DGame({ onClose }: { onClose: () => void }) {
  const [power, setPower] = useState(0.8);
  const [spin, setSpin] = useState(0);
  const [rolling, setRolling] = useState(false);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(1);
  const [gameKey, setGameKey] = useState(0);
  const [cameraMode, setCameraMode] = useState<'default' | 'cinematic' | 'follow'>('default');

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setCameraMode('cinematic'); // Camera zooms in slightly
  };

  const handleFinish = useCallback(() => {
    // In a real implementation we would count fallen pins by checking their rotation in useFrame
    // For now we simulate score based on throw
    const knocked = Math.max(1, Math.min(10, Math.round(power * 10 - Math.abs(spin) * 2)));
    setScore(s => s + knocked);
    
    setTimeout(() => {
      setCameraMode('default');
      setRolling(false);
      setRound(r => r + 1);
      setGameKey(k => k + 1);
    }, 1000);
  }, [power, spin]);

  // Generate 10 pins triangle
  const pins = [];
  let index = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col <= row; col++) {
      const x = (col - row / 2) * 0.5;
      const z = -12 - row * 0.4;
      pins.push(<Pin key={index} index={index} position={[x, 0.5, z]} />);
      index++;
    }
  }

  return (
    <GameFrame 
      title="3D Bowling Arcade" 
      onClose={onClose} 
      score={score} 
      level={`Round ${round}`} 
      onRestart={() => { setScore(0); setRound(1); setRolling(false); setGameKey(k => k + 1); }}
    >
      <AquaSpinEngine 
        enablePhysics 
        quality="high" 
        bloomIntensity={0.8}
        cameraMode={cameraMode}
        environmentPreset="night"
        physicsGravity={[0, -20, 0]}
      >
        <BowlingLane />
        
        {/* Render the 10 pins */}
        <group key={`pins-${gameKey}`}>
          {pins}
        </group>

        <BowlingBall 
          key={`ball-${gameKey}`} 
          rolling={rolling} 
          power={power} 
          spin={spin} 
          onFinish={handleFinish} 
        />
        
        <Text position={[0, 0.01, -2]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.8} color="#e7f7ff" fillOpacity={0.3}>
          AQUA SPIN
        </Text>
      </AquaSpinEngine>
      
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,480px)] rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-white/80">
          <label>POWER 
            <input type="range" min="0.2" max="1" step="0.01" value={power} onChange={e => setPower(Number(e.target.value))} disabled={rolling} className="mt-2 w-full accent-cyan-400" />
          </label>
          <label>SPIN 
            <input type="range" min="-1" max="1" step="0.01" value={spin} onChange={e => setSpin(Number(e.target.value))} disabled={rolling} className="mt-2 w-full accent-violet-400" />
          </label>
        </div>
        <button 
          onClick={roll} 
          disabled={rolling} 
          className="mt-4 w-full rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 px-5 py-3 font-black text-white shadow-lg transition-transform hover:scale-[1.01] disabled:opacity-50"
        >
          {rolling ? 'ROLLING…' : 'ROLL BALL'}
        </button>
      </div>
    </GameFrame>
  );
}
