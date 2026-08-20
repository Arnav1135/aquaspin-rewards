import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { Environment, PerspectiveCamera, Box, Cylinder, Trail } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/Button';
import { GameEngine3D } from '@/engine/GameEngine3D';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';

interface Props { onClose: () => void; }

// --- Arrow Component ---
function Arrow({ position, rotation, velocity, onHit }: { position: [number,number,number], rotation: [number,number,number], velocity: [number,number,number], onHit: (pos: THREE.Vector3, distFromCenter: number) => void }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (bodyRef.current && !stuck) {
      bodyRef.current.setLinvel(new THREE.Vector3(...velocity), true);
      audio.play('archery', 'shoot');
    }
  }, [velocity, stuck]);

  useFrame(() => {
    if (stuck || !bodyRef.current) return;
    const vel = bodyRef.current.linvel();
    if (Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) > 0.1) {
      // align arrow with velocity
      const dir = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
      const targetRotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1),
        dir
      );
      bodyRef.current.setRotation(targetRotation, true);
    }
  });

  return (
    <RigidBody
      ref={bodyRef}
      position={position}
      rotation={rotation}
      colliders={false}
      mass={0.1}
      ccd={true}
      linearDamping={0.1}
      onCollisionEnter={(e) => {
        if (stuck) return;
        if (e.other.rigidBodyObject?.name === 'target') {
          setStuck(true);
          if (bodyRef.current) {
            bodyRef.current.setBodyType(2, true); // kinematic position
            bodyRef.current.setLinvel({x:0, y:0, z:0}, true);
            bodyRef.current.setAngvel({x:0, y:0, z:0}, true);
          }
          audio.play('archery', 'hit');
          
          const hitPos = new THREE.Vector3();
          if (bodyRef.current) {
            const p = bodyRef.current.translation();
            hitPos.set(p.x, p.y, p.z);
          }
          const targetCenter = new THREE.Vector3(0, 1.5, -30);
          const dist = hitPos.distanceTo(targetCenter);
          onHit(hitPos, dist);
        } else if (e.other.rigidBodyObject?.name === 'ground') {
          setStuck(true);
        }
      }}
    >
      <CylinderCollider args={[0.4, 0.02]} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} />
      
      <Trail local width={0.1} length={4} color={new THREE.Color(0.2, 0.8, 1)} attenuation={(t: number) => t * t}>
        <group rotation={[Math.PI/2, 0, 0]}>
          <Cylinder args={[0.02, 0.02, 0.8, 8]}>
            <meshStandardMaterial color="#8B4513" />
          </Cylinder>
          <Cylinder args={[0.03, 0.001, 0.1, 8]} position={[0, -0.45, 0]}>
            <meshStandardMaterial color="#silver" metalness={0.8} roughness={0.2} />
          </Cylinder>
          <Box args={[0.1, 0.1, 0.01]} position={[0, 0.35, 0]}>
            <meshStandardMaterial color="#ff0000" />
          </Box>
        </group>
      </Trail>
    </RigidBody>
  );
}

// --- Target Component ---
function ArcheryTarget() {
  return (
    <RigidBody type="fixed" name="target" position={[0, 1.5, -30]} rotation={[Math.PI/2, 0, 0]}>
      <CylinderCollider args={[0.1, 2]} />
      <Cylinder args={[2, 2, 0.2, 32]}>
        <meshStandardMaterial color="white" />
      </Cylinder>
      <Cylinder args={[1.6, 1.6, 0.21, 32]}>
         <meshStandardMaterial color="black" />
      </Cylinder>
      <Cylinder args={[1.2, 1.2, 0.22, 32]}>
         <meshStandardMaterial color="#00a8ff" />
      </Cylinder>
      <Cylinder args={[0.8, 0.8, 0.23, 32]}>
         <meshStandardMaterial color="red" />
      </Cylinder>
      <Cylinder args={[0.4, 0.4, 0.24, 32]}>
         <meshStandardMaterial color="#FFD700" />
      </Cylinder>
      
      {/* Stand */}
      <Box args={[0.2, 3, 0.2]} position={[-1, 0, -1.5]} rotation={[0, 0, Math.PI/2]}>
        <meshStandardMaterial color="#5C4033" />
      </Box>
      <Box args={[0.2, 3, 0.2]} position={[1, 0, -1.5]} rotation={[0, 0, Math.PI/2]}>
        <meshStandardMaterial color="#5C4033" />
      </Box>
    </RigidBody>
  );
}

// --- Player Bow Camera ---
function BowCamera({ isAiming, swayX, swayY, firePower }: any) {
  const { camera } = useThree();
  
  useFrame((state) => {
    const basePos = new THREE.Vector3(0, 1.8, 0);
    const targetPos = new THREE.Vector3(
      basePos.x + swayX * 0.5,
      basePos.y + swayY * 0.5,
      isAiming ? 1 : 0
    );
    camera.position.lerp(targetPos, 0.1);
    
    const lookAtPos = new THREE.Vector3(swayX * 5, 1.5 + swayY * 5, -30);
    camera.lookAt(lookAtPos);
  });
  
  return null;
}

export function ArcheryGame({ onClose }: Props) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [arrows, setArrows] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [shotsLeft, setShotsLeft] = useState(5);
  
  const [isAiming, setIsAiming] = useState(false);
  const [power, setPower] = useState(0);
  const [swayX, setSwayX] = useState(0);
  const [swayY, setSwayY] = useState(0);
  
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    let time = 0;
    const interval = setInterval(() => {
      time += 0.05;
      const magnitude = isAiming ? 0.05 + (power / 100) * 0.1 : 0.02;
      setSwayX(Math.sin(time * 2) * magnitude);
      setSwayY(Math.cos(time * 3) * magnitude * 0.5);
      
      if (isAiming) {
        setPower(p => Math.min(100, p + 2)); // draw bow
      }
    }, 50);
    return () => clearInterval(interval);
  }, [gameState, isAiming, power]);

  const handlePointerDown = () => {
    if (shotsLeft <= 0) return;
    setIsAiming(true);
    setPower(0);
  };

  const handlePointerUp = () => {
    if (!isAiming) return;
    setIsAiming(false);
    
    if (power < 10) return; // misfire
    
    const dir = new THREE.Vector3(swayX * 0.2, swayY * 0.2, -1).normalize();
    const speed = 20 + (power / 100) * 60; // 20 to 80 units/sec
    
    const velocity = [dir.x * speed, dir.y * speed + (speed * 0.05), dir.z * speed]; // arc
    
    setArrows(prev => [...prev, {
      id: Date.now(),
      position: [0, 1.8, 0],
      rotation: [0, 0, 0],
      velocity
    }]);
    
    setShotsLeft(s => s - 1);
    
    if (shotsLeft - 1 === 0) {
      setTimeout(() => {
        setGameState('result');
      }, 3000);
    }
  };

  const handleHit = (pos: THREE.Vector3, dist: number) => {
    let pts = 0;
    if (dist < 0.4) pts = 10;
    else if (dist < 0.8) pts = 8;
    else if (dist < 1.2) pts = 6;
    else if (dist < 1.6) pts = 4;
    else if (dist < 2.0) pts = 2;
    
    if (pts > 0) {
      setScore(s => s + pts);
      if (pts === 10) toast.success('🎯 BULLSEYE! +10');
      else toast.success(`Hit! +${pts}`);
    } else {
      toast.error('Miss!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-green-400 to-emerald-600 mb-8">
            3D ARCHERY
          </h1>
          <Button variant="neon" size="lg" className="px-12 py-6 text-xl" onClick={() => { setGameState('playing'); setScore(0); setShotsLeft(5); setArrows([]); }}>
            ENTER RANGE
          </Button>
          <Button variant="ghost" className="mt-4 text-slate-400" onClick={onClose}>Exit</Button>
        </div>
      )}

      {gameState === 'result' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h2 className="text-4xl text-white mb-2">ROUND COMPLETE</h2>
          <p className="text-6xl font-black text-yellow-400 mb-8">{score} / 50</p>
          <Button variant="neon" size="lg" className="px-12 py-6" onClick={() => { setGameState('playing'); setScore(0); setShotsLeft(5); setArrows([]); }}>
            PLAY AGAIN
          </Button>
          <Button variant="ghost" className="mt-4 text-slate-400" onClick={onClose}>Exit</Button>
        </div>
      )}

      {gameState !== 'menu' && (
        <div 
          className="absolute inset-0 z-10 touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <div className="absolute top-1/2 left-1/2 w-8 h-8 -mt-4 -ml-4 pointer-events-none">
            <div className="w-full h-full border-2 border-white/50 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-red-500 rounded-full" />
            </div>
          </div>
          
          {isAiming && (
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-64 h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-600">
              <div className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 transition-all" style={{ width: `${power}%` }} />
            </div>
          )}
          
          <div className="absolute top-8 left-8 bg-slate-900/80 p-4 rounded-xl border border-slate-700 pointer-events-none">
            <p className="text-slate-400 text-xs uppercase font-bold">Score</p>
            <p className="text-3xl font-black text-white">{score}</p>
          </div>
          
          <div className="absolute top-8 right-8 bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-right pointer-events-none">
            <p className="text-slate-400 text-xs uppercase font-bold">Arrows</p>
            <p className="text-3xl font-black text-cyan-400">{shotsLeft}</p>
          </div>
          
          <Button variant="ghost" className="absolute bottom-8 left-8 z-50 text-slate-400" onClick={onClose}>Quit</Button>
          
          <div className="absolute inset-0 z-0 pointer-events-none">
            <GameEngine3D 
               enablePhysics={true} 
               environmentPreset="forest"
               enablePostProcessing={true}
               cameraPosition={[0, 1.8, 0]}
               cameraFov={60}
            >
               <BowCamera isAiming={isAiming} swayX={swayX} swayY={swayY} firePower={power} />
               
               <RigidBody type="fixed" name="ground">
                 <Box args={[100, 1, 100]} position={[0, -0.5, 0]}>
                   <meshStandardMaterial color="#2d4c1e" roughness={0.9} />
                 </Box>
               </RigidBody>
               
               <ArcheryTarget />
               
               {arrows.map(a => (
                 <Arrow key={a.id} position={a.position} rotation={a.rotation} velocity={a.velocity} onHit={handleHit} />
               ))}
            </GameEngine3D>
          </div>
        </div>
      )}
    </div>
  );
}
