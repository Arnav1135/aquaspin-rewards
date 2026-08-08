import { useRef, useState, useCallback, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text, useCursor, PerspectiveCamera } from '@react-three/drei';
import { RigidBody, CuboidCollider, CylinderCollider, InstancedRigidBodies, RapierRigidBody } from '@react-three/rapier';
import { AquaSpinEngine } from '../../engine/3d';
import { GameFrame } from './GameFrame';
import { gsap } from 'gsap';

const TABLE_W = 10;
const TABLE_H = 18;
const PUCK_R = 0.5;
const PADDLE_R = 0.8;
const GOAL_W = 3.5;

function AirHockeyTable() {
  return (
    <group position={[0, -0.2, 0]}>
      {/* Base */}
      <RoundedBox args={[TABLE_W + 1, 0.4, TABLE_H + 1]} radius={0.2} smoothness={4} position={[0, -0.2, 0]}>
        <meshStandardMaterial color="#0a0a0f" metalness={0.9} roughness={0.1} />
      </RoundedBox>
      
      {/* Surface */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[TABLE_W, TABLE_H]} />
        <meshStandardMaterial color="#051224" metalness={0.6} roughness={0.2} emissive="#020a14" emissiveIntensity={0.5} />
      </mesh>

      {/* Center Line and Circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <planeGeometry args={[TABLE_W, 0.05]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[1.5, 1.55, 64]} />
        <meshBasicMaterial color="#00ffcc" transparent opacity={0.4} />
      </mesh>

      {/* Physics Walls */}
      {/* Left */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[-TABLE_W / 2 - 0.25, 0.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.5, 0.6, TABLE_H]} />
          <meshStandardMaterial color="#00aaff" emissive="#004488" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Right */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[TABLE_W / 2 + 0.25, 0.3, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.5, 0.6, TABLE_H]} />
          <meshStandardMaterial color="#00aaff" emissive="#004488" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Top Left */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow>
          <boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />
          <meshStandardMaterial color="#ff0055" emissive="#880022" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Top Right */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, -TABLE_H / 2 - 0.25]} receiveShadow castShadow>
          <boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />
          <meshStandardMaterial color="#ff0055" emissive="#880022" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Bottom Left */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[-(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow>
          <boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />
          <meshStandardMaterial color="#00ffcc" emissive="#008866" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Bottom Right */}
      <RigidBody type="fixed" restitution={0.8} friction={0}>
        <mesh position={[(TABLE_W + GOAL_W) / 4, 0.3, TABLE_H / 2 + 0.25]} receiveShadow castShadow>
          <boxGeometry args={[(TABLE_W - GOAL_W) / 2, 0.6, 0.5]} />
          <meshStandardMaterial color="#00ffcc" emissive="#008866" emissiveIntensity={2} metalness={0.8} roughness={0.2} />
        </mesh>
      </RigidBody>
    </group>
  );
}

function Paddle({ position, color, isPlayer, rigidBodyRef }: { position: [number, number, number], color: string, isPlayer: boolean, rigidBodyRef?: React.MutableRefObject<RapierRigidBody | null> }) {
  return (
    <RigidBody 
      ref={rigidBodyRef} 
      type={isPlayer ? "kinematicPosition" : "kinematicPosition"} 
      position={position} 
      restitution={0.5} 
      friction={0}
      lockRotations
    >
      <group>
        <mesh position={[0, 0.3, 0]} castShadow>
          <cylinderGeometry args={[PADDLE_R, PADDLE_R * 1.1, 0.6, 64]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.8} metalness={0.8} roughness={0.1} />
        </mesh>
        <mesh position={[0, 0.65, 0]} castShadow>
          <sphereGeometry args={[PADDLE_R * 0.6, 32, 32]} />
          <meshStandardMaterial color="#ffffff" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
    </RigidBody>
  );
}

function Puck({ onGoal }: { onGoal: (isPlayer: boolean) => void }) {
  const puckRef = useRef<RapierRigidBody>(null);

  useFrame(() => {
    if (!puckRef.current) return;
    const pos = puckRef.current.translation();
    
    // Check Goal
    if (Math.abs(pos.z) > TABLE_H / 2 + 0.2 && Math.abs(pos.x) < GOAL_W / 2) {
      onGoal(pos.z < 0); // If negative Z, player scored against AI
      
      // Reset puck
      puckRef.current.setTranslation({ x: 0, y: 0.2, z: 0 }, true);
      puckRef.current.setLinvel({ x: 0, y: 0, z: 0 }, true);
      puckRef.current.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }

    // Keep puck on table
    if (pos.y > 0.5) {
      puckRef.current.setTranslation({ x: pos.x, y: 0.2, z: pos.z }, true);
      const vel = puckRef.current.linvel();
      puckRef.current.setLinvel({ x: vel.x, y: -2, z: vel.z }, true);
    }
  });

  return (
    <RigidBody 
      ref={puckRef} 
      position={[0, 0.2, 0]} 
      restitution={0.95} 
      friction={0.01} 
      linearDamping={0.2}
      mass={0.5}
      lockRotations
      userData={{ isPuck: true }}
    >
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[PUCK_R, PUCK_R, 0.2, 64]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.5} metalness={0.5} roughness={0.1} />
        <pointLight color="#ffffff" intensity={2} distance={3} />
      </mesh>
    </RigidBody>
  );
}

export function AirHockey3DGame({ onClose }: { onClose: () => void }) {
  const [score, setScore] = useState([0, 0]);
  const [cameraMode, setCameraMode] = useState<'default' | 'cinematic' | 'impact'>('default');
  const [key, setKey] = useState(0);

  const playerRef = useRef<RapierRigidBody>(null);
  const aiRef = useRef<RapierRigidBody>(null);
  
  const handleScore = useCallback((isPlayer: boolean) => {
    setScore(s => isPlayer ? [s[0] + 1, s[1]] : [s[0], s[1] + 1]);
    setCameraMode('impact');
    setTimeout(() => setCameraMode('default'), 400);
  }, []);

  const handlePointerMove = (e: any) => {
    if (!playerRef.current) return;
    const x = THREE.MathUtils.clamp(e.point.x, -TABLE_W/2 + PADDLE_R, TABLE_W/2 - PADDLE_R);
    const z = THREE.MathUtils.clamp(e.point.z, 0, TABLE_H/2 - PADDLE_R);
    playerRef.current.setNextKinematicTranslation({ x, y: 0, z });
  };

  useFrame((state) => {
    // Better AI that actually chases the puck
    if (aiRef.current) {
      // Find the puck position if it exists in the scene
      const puckPos = state.scene.children.find(c => c.type === 'Group' && (c as any).userData?.isPuck)?.position;
      const targetX = puckPos ? THREE.MathUtils.clamp(puckPos.x, -TABLE_W/2 + PADDLE_R, TABLE_W/2 - PADDLE_R) : Math.sin(state.clock.getElapsedTime()) * 2;
      
      const currentPos = aiRef.current.translation();
      const newX = THREE.MathUtils.lerp(currentPos.x, targetX, 0.1);
      aiRef.current.setNextKinematicTranslation({ x: newX, y: 0, z: -TABLE_H/3 });
    }
  });

  return (
    <GameFrame 
      title="3D Neon Air Hockey" 
      onClose={onClose} 
      score={`${score[0]} - ${score[1]}`} 
      onRestart={() => { setScore([0,0]); setKey(k => k + 1); }}
    >
      <AquaSpinEngine 
        key={key} 
        enablePhysics 
        quality="high" 
        cameraMode={cameraMode} 
        bloomIntensity={1.5} 
        environmentPreset="night"
        physicsGravity={[0, -30, 0]}
      >
        
        {/* Invisible plane to catch pointer events for player movement */}
        <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, 0.5, TABLE_H/4]} onPointerMove={handlePointerMove} visible={false}>
          <planeGeometry args={[TABLE_W, TABLE_H/2]} />
        </mesh>

        <AirHockeyTable />
        
        <Puck onGoal={handleScore} />
        
        <Paddle isPlayer={true} rigidBodyRef={playerRef} position={[0, 0, TABLE_H/3]} color="#00ffcc" />
        <Paddle isPlayer={false} rigidBodyRef={aiRef} position={[0, 0, -TABLE_H/3]} color="#ff0055" />
        
        {/* Cinematic overhead camera for Air Hockey */}
        <PerspectiveCamera makeDefault position={[0, 15, 12]} fov={45} rotation={[-0.9, 0, 0]} />

      </AquaSpinEngine>
    </GameFrame>
  );
}
