import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, InstancedRigidBodies, RapierRigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { WaterDropUI } from './WaterDropUI';

const DROP_COUNT = 30;

function GlassContainer({ position, onCatch }: { position: [number, number, number], onCatch: () => void }) {
  const group = useRef<THREE.Group>(null);
  const { viewport } = useThree();
  
  // Use a kinematic position body so it can be moved via drag/touch
  const bodyRef = useRef<RapierRigidBody>(null);
  const [targetX, setTargetX] = useState(0);

  // Mouse / Touch tracking
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
      } else if (e instanceof TouchEvent) {
        clientX = e.touches[0].clientX;
      }
      
      const normalizedX = (clientX / window.innerWidth) * 2 - 1;
      const xPos = normalizedX * (viewport.width / 2);
      setTargetX(Math.max(-viewport.width / 2 + 1.5, Math.min(viewport.width / 2 - 1.5, xPos)));
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [viewport.width]);

  useFrame(() => {
    if (bodyRef.current) {
      const currentPos = bodyRef.current.translation();
      // Smooth interpolation towards targetX
      bodyRef.current.setNextKinematicTranslation({
        x: THREE.MathUtils.lerp(currentPos.x, targetX, 0.15),
        y: position[1],
        z: position[2]
      });
    }
  });

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false}>
      <group ref={group}>
        {/* Glass Visuals */}
        <mesh position={[0, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.5, 1.2, 2.5, 32, 1, true]} />
          <MeshTransmissionMaterial 
            backside
            samples={4}
            thickness={0.5}
            chromaticAberration={0.05}
            anisotropy={0.1}
            distortion={0.1}
            distortionScale={0.3}
            temporalDistortion={0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            roughness={0.1}
            transmission={1}
            ior={1.5}
            color="#aaddff"
          />
        </mesh>
        
        {/* Bottom */}
        <mesh position={[0, -1.25, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 0.1, 32]} />
          <MeshTransmissionMaterial transmission={1} ior={1.5} thickness={0.5} color="#aaddff" />
        </mesh>

        {/* Colliders (Walls) */}
        {/* Left wall */}
        <CuboidCollider position={[-1.4, 0, 0]} args={[0.1, 1.25, 1.5]} />
        {/* Right wall */}
        <CuboidCollider position={[1.4, 0, 0]} args={[0.1, 1.25, 1.5]} />
        {/* Front wall */}
        <CuboidCollider position={[0, 0, 1.4]} args={[1.5, 1.25, 0.1]} />
        {/* Back wall */}
        <CuboidCollider position={[0, 0, -1.4]} args={[1.5, 1.25, 0.1]} />
        {/* Sensor Bottom to count catches */}
        <CuboidCollider 
          position={[0, -1.0, 0]} 
          args={[1.1, 0.2, 1.1]} 
          sensor
          onIntersectionEnter={(payload) => {
            if (payload.other.rigidBodyObject?.name === 'waterDrop') {
              onCatch();
              // Teleport drop back up to reuse
              if (payload.other.rigidBody) {
                 payload.other.rigidBody.setTranslation({
                    x: (Math.random() - 0.5) * 8,
                    y: 10 + Math.random() * 5,
                    z: (Math.random() - 0.5) * 2
                 }, true);
                 payload.other.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
              }
            }
          }}
        />
      </group>
    </RigidBody>
  );
}

function WaterDrops() {
  const instances = useMemo(() => {
    return Array.from({ length: DROP_COUNT }).map((_, i) => ({
      key: `drop_${i}`,
      position: [
        (Math.random() - 0.5) * 8,
        10 + Math.random() * 10,
        (Math.random() - 0.5) * 2
      ] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number]
    }));
  }, []);

  return (
    <InstancedRigidBodies
      instances={instances}
      colliders="ball"
      restitution={0.2}
      friction={0.1}
      name="waterDrop"
    >
      <instancedMesh args={[undefined, undefined, DROP_COUNT]} castShadow receiveShadow>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshPhysicalMaterial 
          color="#42a5f5"
          metalness={0.1}
          roughness={0.1}
          transmission={0.9}
          ior={1.33}
          thickness={0.5}
          envMapIntensity={2}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  );
}

function KillFloor() {
   return (
      <RigidBody type="fixed" position={[0, -10, 0]}>
         <CuboidCollider 
            args={[20, 1, 20]} 
            sensor
            onIntersectionEnter={(p) => {
               if (p.other.rigidBodyObject?.name === 'waterDrop' && p.other.rigidBody) {
                  p.other.rigidBody.setTranslation({
                    x: (Math.random() - 0.5) * 8,
                    y: 10 + Math.random() * 5,
                    z: (Math.random() - 0.5) * 2
                 }, true);
                 p.other.rigidBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
               }
            }}
         />
      </RigidBody>
   )
}

export default function WaterDropApp() {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  const handleCatch = () => {
    if (isPlaying) {
      setScore(s => s + 10);
    }
  };

  const handleRestart = () => {
    setScore(0);
    setIsPlaying(true);
  };

  return (
    <div className="w-full h-full relative bg-[#0A1428] overflow-hidden select-none">
      <WaterDropUI score={score} isPlaying={isPlaying} onRestart={handleRestart} />
      
      <Canvas shadows camera={{ position: [0, 2, 8], fov: 45 }} className="touch-none">
        <color attach="background" args={['#0A1428']} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
        <spotLight position={[-5, 10, -5]} intensity={2} color="#42a5f5" />
        
        <Environment preset="city" />
        <Sparkles count={50} scale={10} size={2} speed={0.4} color="#aaddff" />
        
        <Physics gravity={[0, -9.81, 0]}>
          {isPlaying && (
            <>
              <GlassContainer position={[0, -2, 0]} onCatch={handleCatch} />
              <WaterDrops />
              <KillFloor />
            </>
          )}
        </Physics>
      </Canvas>
    </div>
  );
}
