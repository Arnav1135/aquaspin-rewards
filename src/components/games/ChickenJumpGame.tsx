import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { playTone, vibrate } from '@/lib/utils';
import toast from 'react-hot-toast';

import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody } from '@react-three/rapier';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

interface Props { onClose: () => void }

type Obstacle = { id: number; x: number; type: 'cactus' | 'rock' | 'log'; h: number; w: number };
type Coin = { id: number; x: number; y: number; collected: boolean };

function Chicken3D({ y, dead }: { y: number; dead: boolean }) {
  const group = useRef<any>(null);
  
  useFrame((state) => {
    if (group.current && !dead) {
      // Wobble while running
      group.current.rotation.z = Math.sin(state.clock.elapsedTime * 15) * 0.1;
    }
  });

  return (
    <group position={[-5, y, 0]}>
      {dead ? (
        <RigidBody position={[0,0,0]} colliders="hull" restitution={0.6}>
          <group ref={group}>
            {/* Body */}
            <mesh castShadow position={[0,0,0]}>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshStandardMaterial color="#FFE082" roughness={0.5} />
            </mesh>
            {/* Beak */}
            <mesh castShadow position={[0.7, 0.2, 0]} rotation={[0, 0, -Math.PI/2]}>
              <coneGeometry args={[0.2, 0.5, 8]} />
              <meshStandardMaterial color="#FF8F00" roughness={0.4} />
            </mesh>
          </group>
        </RigidBody>
      ) : (
        <group ref={group}>
            {/* Body */}
            <mesh castShadow position={[0,0,0]}>
              <sphereGeometry args={[0.8, 16, 16]} />
              <meshStandardMaterial color="#FFE082" roughness={0.5} />
            </mesh>
            {/* Beak */}
            <mesh castShadow position={[0.7, 0.2, 0]} rotation={[0, 0, -Math.PI/2]}>
              <coneGeometry args={[0.2, 0.5, 8]} />
              <meshStandardMaterial color="#FF8F00" roughness={0.4} />
            </mesh>
            {/* Eyes */}
            <mesh position={[0.5, 0.4, 0.3]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            <mesh position={[0.5, 0.4, -0.3]}>
              <sphereGeometry args={[0.15, 8, 8]} />
              <meshStandardMaterial color="#333" />
            </mesh>
            {/* Comb */}
            <mesh position={[0.2, 0.8, 0]}>
              <boxGeometry args={[0.4, 0.5, 0.1]} />
              <meshStandardMaterial color="#E53935" />
            </mesh>
            {/* Wings */}
            <mesh position={[-0.2, 0, 0.85]} rotation={[0.2, 0, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.1]} />
              <meshStandardMaterial color="#FFC107" />
            </mesh>
            <mesh position={[-0.2, 0, -0.85]} rotation={[-0.2, 0, 0]}>
              <boxGeometry args={[0.6, 0.4, 0.1]} />
              <meshStandardMaterial color="#FFC107" />
            </mesh>
        </group>
      )}
    </group>
  );
}

function Obstacle3D({ ob }: { ob: Obstacle }) {
  return (
    <group position={[ob.x, -2 + ob.h/2, 0]}>
      {ob.type === 'cactus' && (
        <mesh castShadow>
          <boxGeometry args={[0.8, ob.h, 0.8]} />
          <meshStandardMaterial color="#2e7d32" roughness={0.8} />
        </mesh>
      )}
      {ob.type === 'rock' && (
        <mesh castShadow>
          <sphereGeometry args={[ob.w/2, 16, 16]} />
          <meshStandardMaterial color="#607d8b" roughness={0.9} />
        </mesh>
      )}
      {ob.type === 'log' && (
        <mesh castShadow rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[ob.h/2, ob.h/2, ob.w, 16]} />
          <meshStandardMaterial color="#795548" roughness={1.0} />
        </mesh>
      )}
    </group>
  );
}

function Coin3D({ coin }: { coin: Coin }) {
  const ref = useRef<any>(null);
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y += 0.05;
      ref.current.position.y = coin.y + Math.sin(state.clock.elapsedTime * 5) * 0.2;
    }
  });

  return (
    <group position={[coin.x, coin.y, 0]} ref={ref}>
      <mesh castShadow rotation={[Math.PI/2, 0, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.1, 16]} />
        <meshStandardMaterial color="#FFD700" metalness={0.8} roughness={0.2} emissive="#FFD700" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
}

export function ChickenJumpGame({ onClose }: Props) {
  const rafRef = useRef(0);
  const s = useRef({
    phase: 'idle' as 'idle'|'playing'|'dead',
    chickenY: -1.2, chickenVY: 0, onGround: true,
    obstacles: [] as Obstacle[], coins: [] as Coin[],
    score: 0, dist: 0, speed: 10, spawnTimer: 0, coinTimer: 0,
    lastTime: 0, best: parseInt(localStorage.getItem('cj-best') || '0'),
    doubleJump: false, nextId: 0
  });

  const [disp, setDisp] = useState({ score: 0, phase: 'idle' as 'idle'|'playing'|'dead', best: parseInt(localStorage.getItem('cj-best')||'0') });
  const [, setRenderTrigger] = useState(0);

  const jump = useCallback(() => {
    const gs = s.current;
    if (gs.phase === 'idle') {
      gs.phase = 'playing'; gs.lastTime = performance.now();
      setDisp(d => ({ ...d, phase: 'playing' }));
    }
    if (gs.phase !== 'playing') return;
    if (gs.onGround) { 
      gs.chickenVY = 12; gs.onGround = false; gs.doubleJump = true; 
      playTone(580, 0.04, 'sine', 0.08); vibrate(12); 
    }
    else if (gs.doubleJump) { 
      gs.chickenVY = 10; gs.doubleJump = false; 
      playTone(680, 0.04, 'sine', 0.08); vibrate(12); 
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); } };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [jump]);

  const restart = useCallback(() => {
    const gs = s.current;
    gs.phase = 'idle'; gs.chickenY = -1.2; gs.chickenVY = 0; gs.onGround = true;
    gs.obstacles = []; gs.coins = []; gs.score = 0; gs.dist = 0;
    gs.speed = 10; gs.spawnTimer = 0; gs.coinTimer = 0; gs.doubleJump = false;
    setDisp(d => ({ ...d, score: 0, phase: 'idle' }));
    setRenderTrigger(v => v + 1);
  }, []);

  useEffect(() => {
    const loop = (timestamp: number) => {
      const gs = s.current;
      if (gs.lastTime === 0) gs.lastTime = timestamp;
      const dt = Math.min((timestamp - gs.lastTime) / 1000, 0.1);
      gs.lastTime = timestamp;

      if (gs.phase === 'playing') {
        gs.dist += gs.speed * dt;
        gs.score = Math.floor(gs.dist / 10);
        gs.speed = Math.min(25, 10 + gs.dist / 100);
        
        // Physics
        gs.chickenVY -= 35 * dt; // gravity
        gs.chickenY += gs.chickenVY * dt;
        if (gs.chickenY <= -1.2) {
          gs.chickenY = -1.2; gs.chickenVY = 0;
          gs.onGround = true; gs.doubleJump = false;
        } else {
          gs.onGround = false;
        }

        // Spawning
        gs.spawnTimer -= dt;
        if (gs.spawnTimer <= 0) {
          gs.spawnTimer = Math.max(0.8, 2.0 - gs.dist / 500) + Math.random() * 0.5;
          const types: Obstacle['type'][] = ['cactus','rock','log'];
          const type = types[Math.floor(Math.random()*3)];
          const h = type === 'log' ? 1.5 : (1.5 + Math.random() * 1.5);
          const w = type === 'log' ? 2.5 : 1.2;
          gs.obstacles.push({ id: gs.nextId++, x: 20, type, h, w });
        }

        gs.coinTimer -= dt;
        if (gs.coinTimer <= 0) {
          gs.coinTimer = 2.0 + Math.random() * 2.0;
          const cy = -0.5 + Math.random() * 3;
          gs.coins.push({ id: gs.nextId++, x: 20, y: cy, collected: false });
        }

        // Movement & collision
        const chickenX = -5;
        const chickenRadius = 0.8;
        
        for (let i = gs.obstacles.length - 1; i >= 0; i--) {
          const ob = gs.obstacles[i];
          ob.x -= gs.speed * dt;
          
          if (ob.x < -15) {
            gs.obstacles.splice(i, 1);
            continue;
          }

          // AABB Collision approx
          if (
            chickenX + chickenRadius > ob.x - ob.w/2 &&
            chickenX - chickenRadius < ob.x + ob.w/2 &&
            gs.chickenY + chickenRadius > -2 &&
            gs.chickenY - chickenRadius < -2 + ob.h
          ) {
            gs.phase = 'dead';
            const newBest = Math.max(gs.score, gs.best);
            gs.best = newBest; localStorage.setItem('cj-best', String(newBest));
            playTone(150, 0.2, 'sawtooth', 0.3); vibrate(150);
            toast.error(`Score: ${gs.score} | Best: ${newBest}`);
          }
        }

        for (let i = gs.coins.length - 1; i >= 0; i--) {
          const c = gs.coins[i];
          c.x -= gs.speed * dt;
          
          if (c.x < -15) {
            gs.coins.splice(i, 1);
            continue;
          }

          if (!c.collected && Math.hypot(chickenX - c.x, gs.chickenY - c.y) < 1.5) {
            c.collected = true;
            gs.score += 10;
            playTone(900, 0.05, 'sine', 0.05);
          }
        }

        setDisp(d => ({ ...d, score: gs.score, phase: gs.phase, best: gs.best }));
        setRenderTrigger(v => v + 1); // trigger re-render for objects
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 w-full h-[600px] relative">
      <div 
        className="w-full h-full rounded-2xl overflow-hidden cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-cyan-900"
        onClick={jump}
        onTouchStart={e => { e.preventDefault(); jump(); }}
      >
        <GameEngine3D 
          enablePhysics={disp.phase === 'dead'} 
          cameraPosition={[0, 2, 14]} 
          enablePostProcessing={true}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
          
          <Chicken3D y={s.current.chickenY} dead={disp.phase === 'dead'} />
          
          {s.current.obstacles.map(ob => <Obstacle3D key={ob.id} ob={ob} />)}
          {s.current.coins.filter(c => !c.collected).map(c => <Coin3D key={c.id} coin={c} />)}
          
          {/* Ground */}
          <mesh receiveShadow position={[0, -2.5, 0]}>
            <boxGeometry args={[40, 1, 10]} />
            <meshStandardMaterial color="#33691e" roughness={0.9} />
          </mesh>

          {disp.phase === 'idle' && (
            <Html center position={[0, 4, 0]} className="pointer-events-none">
              <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl border border-yellow-500/30 text-center w-[300px]">
                <h2 className="text-3xl font-black text-yellow-400 mb-2">CHICKEN JUMP 3D</h2>
                <p className="text-white text-sm">Tap / Space to jump<br/><span className="text-cyan-300 font-bold">Double Jump available!</span></p>
                <p className="text-slate-400 mt-3 font-mono">Best: {disp.best}</p>
              </div>
            </Html>
          )}

        </GameEngine3D>
      </div>

      <div className="absolute top-4 left-6 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 pointer-events-none">
        <p className="text-xl font-bold text-white font-mono">🏃 {disp.score}</p>
      </div>
      <div className="absolute top-4 right-6 bg-slate-900/80 backdrop-blur px-4 py-2 rounded-xl border border-slate-700 pointer-events-none">
        <p className="text-xl font-bold text-yellow-400 font-mono">⭐ {disp.best}</p>
      </div>

      <div className="flex gap-3 mt-2 w-full justify-center">
        {disp.phase === 'dead' && (
          <Button variant="neon" onClick={restart} size="lg" className="w-64 font-bold rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20 z-10">
            ▶ Play Again
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onClose} className="z-10">Exit</Button>
      </div>
    </div>
  );
}
