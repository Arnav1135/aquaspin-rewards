import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, CuboidCollider, CylinderCollider, RapierRigidBody } from '@react-three/rapier';
import { Box, Cylinder, Trail, Center } from '@react-three/drei';
import * as THREE from 'three';
import { Button } from '@/components/ui/Button';
import { GameEngine3D } from '@/engine/GameEngine3D';
import { audio } from '@/lib/audioEngine';
import toast from 'react-hot-toast';
import { useDrag } from '@use-gesture/react';

interface Props { onClose: () => void; }

// --- Dart Component ---
function Dart({ position, rotation, velocity, onHit }: { position: [number,number,number], rotation: [number,number,number], velocity: [number,number,number], onHit: (pos: THREE.Vector3) => void }) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (bodyRef.current && !stuck) {
      bodyRef.current.setLinvel(new THREE.Vector3(...velocity), true);
      audio.play('darts', 'hit'); // throw sound
    }
  }, [velocity, stuck]);

  useFrame(() => {
    if (stuck || !bodyRef.current) return;
    const vel = bodyRef.current.linvel();
    if (Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z) > 0.1) {
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
      mass={0.05}
      ccd={true}
      linearDamping={0.1}
      onCollisionEnter={(e) => {
        if (stuck) return;
        if (e.other.rigidBodyObject?.name === 'dartboard') {
          setStuck(true);
          if (bodyRef.current) {
            bodyRef.current.setBodyType(2, true);
            bodyRef.current.setLinvel({x:0, y:0, z:0}, true);
            bodyRef.current.setAngvel({x:0, y:0, z:0}, true);
          }
          audio.play('darts', 'hit', { bullseye: true });
          
          const hitPos = new THREE.Vector3();
          if (bodyRef.current) {
            const p = bodyRef.current.translation();
            hitPos.set(p.x, p.y, p.z);
          }
          onHit(hitPos);
        }
      }}
    >
      <CylinderCollider args={[0.2, 0.02]} position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]} />
      
      <Trail local width={0.05} length={2} color={new THREE.Color(1, 0.2, 0.2)} attenuation={(t: number) => t * t}>
        <group rotation={[Math.PI/2, 0, 0]}>
          <Cylinder args={[0.015, 0.015, 0.4, 8]}>
            <meshStandardMaterial color="#333" metalness={0.8} />
          </Cylinder>
          <Cylinder args={[0.001, 0.015, 0.1, 8]} position={[0, -0.25, 0]}>
            <meshStandardMaterial color="#silver" metalness={1} roughness={0.1} />
          </Cylinder>
          {/* Flights */}
          <Box args={[0.1, 0.1, 0.01]} position={[0, 0.15, 0]}>
            <meshStandardMaterial color="#ff0000" />
          </Box>
          <Box args={[0.01, 0.1, 0.1]} position={[0, 0.15, 0]}>
            <meshStandardMaterial color="#ff0000" />
          </Box>
        </group>
      </Trail>
    </RigidBody>
  );
}

// --- Dartboard Component ---
function Dartboard() {
  return (
    <RigidBody type="fixed" name="dartboard" position={[0, 1.5, -10]} rotation={[Math.PI/2, 0, 0]}>
      <CylinderCollider args={[0.05, 2]} />
      
      {/* Board Base */}
      <Cylinder args={[2, 2, 0.1, 32]}>
        <meshStandardMaterial color="#1a1a1a" />
      </Cylinder>
      
      {/* Rings - Bullseye & Multipliers */}
      <Cylinder args={[0.1, 0.1, 0.12, 16]}>
         <meshStandardMaterial color="red" />
      </Cylinder>
      <Cylinder args={[0.25, 0.25, 0.11, 16]}>
         <meshStandardMaterial color="green" />
      </Cylinder>
      
      {/* Target Segments representation */}
      <Cylinder args={[1.0, 1.0, 0.105, 32]}>
         <meshStandardMaterial color="#e5e0c8" />
      </Cylinder>
      <Cylinder args={[1.1, 1.1, 0.11, 32]}>
         <meshStandardMaterial color="red" />
      </Cylinder>
      
      <Cylinder args={[1.6, 1.6, 0.105, 32]}>
         <meshStandardMaterial color="#111" />
      </Cylinder>
      <Cylinder args={[1.7, 1.7, 0.11, 32]}>
         <meshStandardMaterial color="green" />
      </Cylinder>
      
      {/* Wall */}
      <Box args={[10, 0.01, 10]} position={[0, -0.1, 0]}>
         <meshStandardMaterial color="#4b3621" roughness={0.8} />
      </Box>
    </RigidBody>
  );
}

// --- Camera Controller ---
function DartsCamera({ flyingDart }: any) {
  const { camera } = useThree();
  
  useFrame(() => {
    if (flyingDart) {
      // Follow dart
      const tPos = new THREE.Vector3(flyingDart[0], flyingDart[1] + 1, flyingDart[2] + 4);
      camera.position.lerp(tPos, 0.1);
      camera.lookAt(flyingDart[0], flyingDart[1], flyingDart[2]);
    } else {
      // Return to aim pos
      camera.position.lerp(new THREE.Vector3(0, 1.5, 0), 0.1);
      camera.lookAt(0, 1.5, -10);
    }
  });
  
  return null;
}


export function DartsGame({ onClose }: Props) {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'result'>('menu');
  const [darts, setDarts] = useState<any[]>([]);
  const [score, setScore] = useState(0);
  const [throwsLeft, setThrowsLeft] = useState(3);
  const [flyingDartPos, setFlyingDartPos] = useState<[number,number,number] | null>(null);

  const getScore = (hitPos: THREE.Vector3) => {
    // board center is [0, 1.5, -10]
    const dx = hitPos.x;
    const dy = hitPos.y - 1.5;
    const dist = Math.sqrt(dx*dx + dy*dy);
    
    // Scale distance to dartboard dimensions (radius 1.7)
    if (dist <= 0.1) return 50; // Bullseye
    if (dist <= 0.25) return 25; // Outer bull
    if (dist > 1.7) return 0; // Miss
    
    // Simplified sector calculation
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const idx = Math.floor(((angle + 360 + 9) / 18) % 20);
    const SECTORS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
    const base = SECTORS[idx % 20];
    
    if (dist > 1.0 && dist <= 1.1) return base * 3;
    if (dist > 1.6 && dist <= 1.7) return base * 2;
    return base;
  };

  const bind = useDrag(({ down, movement: [mx, my], velocity: [vx, vy], direction: [dx, dy] }) => {
    if (gameState !== 'playing' || throwsLeft <= 0 || flyingDartPos) return;
    
    if (!down && dy < 0 && vy > 1.0) {
      // Fired!
      const speed = 15 + vy * 5;
      
      // Calculate spread based on lateral movement
      const spreadX = (mx / window.innerWidth) * 5;
      
      const velocity = [spreadX, -dy * speed * 0.2, -speed];
      
      const newDart = {
        id: Date.now(),
        position: [0, 1.5, 0],
        rotation: [0, 0, 0],
        velocity
      };
      
      setDarts(prev => [...prev, newDart]);
      setFlyingDartPos([0, 1.5, 0]);
      setThrowsLeft(s => s - 1);
    }
  });

  const handleHit = (pos: THREE.Vector3) => {
    const pts = getScore(pos);
    setScore(s => s + pts);
    setFlyingDartPos(null); // Return camera
    
    if (pts === 50) toast.success('🎯 BULLSEYE! 50 Points!');
    else if (pts > 0) toast.success(`Hit! ${pts} Points!`);
    else toast.error('Miss!');
    
    if (throwsLeft - 1 === 0) {
      setTimeout(() => {
        setGameState('result');
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black select-none touch-none" {...(gameState === 'playing' ? bind() : {})}>
      {gameState === 'menu' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-red-400 to-red-600 mb-8">
            PRO 3D DARTS
          </h1>
          <Button variant="neon" size="lg" className="px-12 py-6 text-xl" onClick={() => { setGameState('playing'); setScore(0); setThrowsLeft(3); setDarts([]); }}>
            PLAY MATCH
          </Button>
          <Button variant="ghost" className="mt-4 text-slate-400" onClick={onClose}>Exit</Button>
        </div>
      )}

      {gameState === 'result' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <h2 className="text-4xl text-white mb-2">MATCH COMPLETE</h2>
          <p className="text-6xl font-black text-yellow-400 mb-8">{score} PTS</p>
          <Button variant="neon" size="lg" className="px-12 py-6" onClick={() => { setGameState('playing'); setScore(0); setThrowsLeft(3); setDarts([]); }}>
            REMATCH
          </Button>
          <Button variant="ghost" className="mt-4 text-slate-400" onClick={onClose}>Exit</Button>
        </div>
      )}

      {gameState !== 'menu' && (
        <div className="absolute inset-0 z-10">
          {!flyingDartPos && (
             <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none animate-pulse">
               <p className="text-white/50 text-xl font-bold tracking-widest">SWIPE UP TO THROW</p>
             </div>
          )}
          
          <div className="absolute top-8 left-8 bg-slate-900/80 p-4 rounded-xl border border-slate-700 pointer-events-none">
            <p className="text-slate-400 text-xs uppercase font-bold">Total Score</p>
            <p className="text-3xl font-black text-white">{score}</p>
          </div>
          
          <div className="absolute top-8 right-8 bg-slate-900/80 p-4 rounded-xl border border-slate-700 text-right pointer-events-none">
            <p className="text-slate-400 text-xs uppercase font-bold">Throws Left</p>
            <p className="text-3xl font-black text-cyan-400">{throwsLeft}</p>
          </div>
          
          <Button variant="ghost" className="absolute bottom-8 left-8 z-50 text-slate-400" onClick={onClose}>Quit</Button>
          
          <div className="absolute inset-0 z-0 pointer-events-none">
            <GameEngine3D 
               enablePhysics={true} 
               environmentPreset="warehouse"
               enablePostProcessing={true}
               cameraPosition={[0, 1.5, 0]}
            >
               <DartsCamera flyingDart={flyingDartPos} />
               
               <RigidBody type="fixed" name="floor">
                 <Box args={[10, 1, 30]} position={[0, -0.5, -5]}>
                   <meshStandardMaterial color="#111" roughness={0.9} />
                 </Box>
               </RigidBody>
               
               <Dartboard />
               
               {darts.map(d => (
                 <Dart key={d.id} position={d.position} rotation={d.rotation} velocity={d.velocity} onHit={handleHit} />
               ))}
            </GameEngine3D>
          </div>
        </div>
      )}
    </div>
  );
}
