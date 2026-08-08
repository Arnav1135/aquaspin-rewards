import { useState, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Text, RoundedBox } from '@react-three/drei';
import { RigidBody, RapierRigidBody, CuboidCollider, CylinderCollider, useRevoluteJoint } from '@react-three/rapier';
import { AquaSpinEngine } from '../../engine/3d';
import { GameFrame } from './GameFrame';
import { gsap } from 'gsap';

function Hoop() {
  return (
    <group position={[0, 3.5, -4.5]}>
      {/* Backboard */}
      <RigidBody type="fixed" restitution={0.6} friction={0.5}>
        <mesh position={[0, 1, -0.3]} castShadow receiveShadow>
          <boxGeometry args={[4, 3, 0.2]} />
          <meshStandardMaterial color="#ffffff" metalness={0.8} roughness={0.1} transparent opacity={0.85} />
        </mesh>
        {/* Backboard border */}
        <mesh position={[0, 1, -0.2]}>
          <boxGeometry args={[4.2, 3.2, 0.1]} />
          <meshStandardMaterial color="#222222" metalness={0.9} roughness={0.2} />
        </mesh>
      </RigidBody>

      {/* Rim Base */}
      <RigidBody type="fixed" restitution={0.1} friction={0.5}>
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.3, 0.2, 0.6]} />
          <meshStandardMaterial color="#ff4400" metalness={0.6} roughness={0.2} />
        </mesh>
      </RigidBody>

      {/* Rim (Simplified as a torus but physics is a torus-like collider if needed, we'll use fixed colliders) */}
      <RigidBody type="fixed" restitution={0.4} colliders="trimesh">
        <mesh position={[0, 0, 0.7]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <torusGeometry args={[0.7, 0.05, 16, 32]} />
          <meshStandardMaterial color="#ff4400" metalness={0.5} roughness={0.2} />
        </mesh>
      </RigidBody>
    </group>
  );
}

function Basketball({ shooting, power, onResult, isScored }: { shooting: boolean, power: number, onResult: (res: boolean) => void, isScored: boolean }) {
  const ballRef = useRef<RapierRigidBody>(null);
  const startPos = new THREE.Vector3(0, 1, 3);
  
  // Track if we scored
  const scoreRef = useRef(false);
  const doneRef = useRef(false);

  useFrame(() => {
    if (!ballRef.current) return;
    
    const pos = ballRef.current.translation();
    
    // Check if it goes through hoop (roughly y < 3.5 and inside rim x,z)
    if (!scoreRef.current && pos.y < 3.4 && pos.y > 2.5 && pos.z < -3.5 && pos.z > -4.5 && Math.abs(pos.x) < 0.6) {
      scoreRef.current = true;
      if (!doneRef.current) {
        doneRef.current = true;
        onResult(true);
      }
    }
    
    // Check if missed and hit ground
    if (pos.y < 0.2 && !doneRef.current && shooting) {
      doneRef.current = true;
      onResult(scoreRef.current);
    }
  });

  // When shooting state changes from false to true, apply impulse
  useState(() => {
    if (shooting && ballRef.current) {
      // power is 0 to 1, map to impulse
      const impulseY = 8 + (power * 6);
      const impulseZ = -8 - (power * 4);
      ballRef.current.applyImpulse({ x: 0, y: impulseY, z: impulseZ }, true);
      ballRef.current.applyTorqueImpulse({ x: -2, y: 0, z: 0 }, true); // Backspin
    }
  });

  return (
    <RigidBody 
      ref={ballRef} 
      position={startPos} 
      colliders="ball" 
      restitution={0.8} 
      friction={0.8} 
      mass={0.6}
      type={shooting ? "dynamic" : "kinematicPosition"}
    >
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[0.4, 32, 32]} />
        <meshStandardMaterial color="#cc5500" metalness={0.1} roughness={0.8} />
      </mesh>
    </RigidBody>
  );
}

export function Basketball3DGame({ onClose }: { onClose: () => void }) {
  const [power, setPower] = useState(0.5);
  const [shooting, setShooting] = useState(false);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<'score' | 'miss' | null>(null);
  const [shotKey, setShotKey] = useState(0);
  const [cameraMode, setCameraMode] = useState<'default' | 'cinematic' | 'impact'>('default');

  const takeShot = () => {
    if (shooting) return;
    setResult(null);
    setShooting(true);
  };

  const handleResult = useCallback((scored: boolean) => {
    if (scored) {
      setScore(s => s + 1);
      setCameraMode('impact');
      setTimeout(() => setCameraMode('default'), 500);
    }
    setResult(scored ? 'score' : 'miss');
    
    // Auto reset after 2 seconds
    setTimeout(() => {
      setShooting(false);
      setResult(null);
      setShotKey(k => k + 1);
    }, 2000);
  }, []);

  return (
    <GameFrame 
      title="3D Basketball Arcade" 
      onClose={onClose} 
      score={score} 
      onRestart={() => { setScore(0); setShooting(false); setResult(null); setShotKey(k => k + 1); }}
    >
      <AquaSpinEngine 
        enablePhysics 
        quality="high" 
        bloomIntensity={1.2} 
        cameraMode={cameraMode}
        environmentPreset="studio"
      >
        
        {/* Floor */}
        <RigidBody type="fixed" friction={1} restitution={0.5}>
          <mesh rotation={[-Math.PI/2, 0, 0]} receiveShadow position={[0, 0, 0]}>
            <planeGeometry args={[20, 20]} />
            <meshStandardMaterial color="#aa6633" metalness={0.1} roughness={0.4} />
          </mesh>
        </RigidBody>

        <Hoop />
        
        <Basketball 
          key={`ball-${shotKey}`}
          shooting={shooting} 
          power={power} 
          onResult={handleResult} 
          isScored={result === 'score'} 
        />
        
      </AquaSpinEngine>
      
      {/* HUD */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-[min(92%,460px)] rounded-2xl border border-white/15 bg-black/35 p-4 backdrop-blur-xl">
        <div className="mb-2 flex justify-between text-xs font-bold text-white/80">
          <span>SHOT POWER</span>
          <span>{Math.round(power * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" max="1" step="0.01" 
          value={power} 
          onChange={e => setPower(Number(e.target.value))} 
          disabled={shooting}
          className="w-full accent-orange-500" 
        />
        <button 
          onClick={takeShot} 
          disabled={shooting} 
          className="mt-3 w-full rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 px-5 py-3 font-black text-white shadow-lg transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {shooting ? 'IN AIR...' : 'SHOOT'}
        </button>
        {result && (
          <div className="mt-3 text-center text-lg font-black text-white/90">
            {result === 'score' ? '🏀 SWISH!' : '❌ MISS'}
          </div>
        )}
      </div>
    </GameFrame>
  );
}
