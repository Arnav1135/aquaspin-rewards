import { useState, useEffect, useRef } from 'react';
import { GameFrame } from './GameFrame';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { motion } from 'framer-motion';
import * as THREE from 'three';
import { CandyEngine, Candy } from './candycrush/CandyEngine';
import { Orchestrator, GameEvent, CandyColor } from './candycrush/Orchestrator';
import { useGameStore, UIEngine } from './candycrush/UIEngine';
import { AnimationEngine } from './candycrush/AnimationEngine';
import { SoundEngine } from './candycrush/SoundEngine';

// Ensure engines are initialized
void UIEngine;
void AnimationEngine;
void SoundEngine;

const SphereGeo = new THREE.SphereGeometry(0.4, 32, 32);
const OvalGeo = new THREE.CapsuleGeometry(0.25, 0.4, 4, 16);
const DiamondGeo = new THREE.OctahedronGeometry(0.4, 0);
const DiscGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
const GumdropGeo = new THREE.CylinderGeometry(0.2, 0.4, 0.5, 32);
const ConeGeo = new THREE.ConeGeometry(0.35, 0.7, 16);

const colorMap: Record<CandyColor, string> = {
  red: '#ba090f',
  orange: '#f5811f',
  yellow: '#facc15',
  green: '#4ade80',
  blue: '#005ea3',
  purple: '#a855f7'
};

function CandyMesh({ candy, position, onClick }: { candy: Candy, position: [number, number, number], onClick: () => void }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = new THREE.Vector3(...position);
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      // Spring physics simulation
      const diff = targetPos.clone().sub(meshRef.current.position);
      const springForce = diff.multiplyScalar(400); // Spring stiffness
      const dampingForce = velocity.current.clone().multiplyScalar(20); // Damping
      
      const acceleration = springForce.sub(dampingForce);
      velocity.current.add(acceleration.multiplyScalar(delta));
      meshRef.current.position.add(velocity.current.clone().multiplyScalar(delta));
      
      // Squash and stretch based on velocity
      const speed = velocity.current.length();
      const squashY = Math.max(0.6, 1 - speed * 0.05);
      const stretchXZ = Math.min(1.2, 1 + speed * 0.025);
      meshRef.current.scale.lerp(new THREE.Vector3(stretchXZ, squashY, stretchXZ), delta * 15);
    }
  });

  const getGeometry = (color: CandyColor) => {
    switch(color) {
      case 'red': return SphereGeo;
      case 'orange': return OvalGeo;
      case 'yellow': return ConeGeo;
      case 'green': return DiamondGeo;
      case 'blue': return DiscGeo;
      case 'purple': return GumdropGeo;
      default: return SphereGeo;
    }
  };

  const getRotation = (color: CandyColor): [number, number, number] => {
    switch(color) {
      case 'orange': return [0, 0, Math.PI / 2];
      case 'blue': return [Math.PI / 2, 0, 0];
      default: return [0, 0, 0];
    }
  };

  const isColorBomb = candy.special === 'color_bomb';
  const isSoft = !isColorBomb && candy.color === 'purple';
  const roughness = isSoft ? 0.4 : (isColorBomb ? 0.7 : 0.05);
  const transmission = isSoft || isColorBomb ? 0 : 0.3;
  const thickness = isSoft || isColorBomb ? 0 : 0.5;
  const clearcoat = isSoft ? 0 : 1;
  const clearcoatRoughness = isSoft ? 0 : 0.1;
  
  const actualColor = isColorBomb ? '#3d1c02' : colorMap[candy.color]; // Dark chocolate for color bomb
  const actualGeometry = isColorBomb ? SphereGeo : getGeometry(candy.color);

  return (
    <group 
      ref={meshRef}
      position={[position[0], position[1] + 10, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <mesh 
        geometry={actualGeometry}
        rotation={getRotation(candy.color)}
      >
        <meshPhysicalMaterial 
          color={actualColor} 
          roughness={roughness} 
          metalness={0.1}
          clearcoat={clearcoat}
          clearcoatRoughness={clearcoatRoughness}
          transmission={transmission}
          thickness={thickness}
          ior={1.5}
        />
      </mesh>

      {/* Special Candy Indicators */}
      {candy.special === 'striped_h' && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.05, 16, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      )}
      {candy.special === 'striped_v' && (
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.42, 0.05, 16, 32]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.5} />
        </mesh>
      )}
      {candy.special === 'wrapped' && (
        <mesh>
          <boxGeometry args={[0.9, 0.9, 0.9]} />
          <meshPhysicalMaterial color="#ffffff" transmission={0.9} opacity={0.5} transparent roughness={0.1} />
        </mesh>
      )}
      {isColorBomb && (
        <mesh>
          <icosahedronGeometry args={[0.45, 0]} />
          <meshStandardMaterial color="#ff00ff" wireframe opacity={0.3} transparent />
        </mesh>
      )}
    </group>
  );
}

export interface LevelConfig {
  level: number;
  targetScore: number;
  maxMoves: number;
}

export default function CandyCrushGame({ 
  onBack, 
  levelConfig = { level: 1, targetScore: 1000, maxMoves: 30 },
  onWin,
  onLose
}: { 
  onBack: () => void, 
  balance?: number,
  levelConfig?: LevelConfig,
  onWin?: () => void,
  onLose?: () => void
}) {
  const [engine] = useState(() => new CandyEngine(8, 8));
  const [board, setBoard] = useState<(Candy | null)[][]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [activeEffects, setActiveEffects] = useState<{id: string, r: number, c: number, type: 'pop' | 'score', text?: string}[]>([]);
  
  const score = useGameStore(s => s.score);
  const moves = useGameStore(s => s.moves);
  const resetGameStats = useGameStore(s => s.resetGameStats);

  // Initialize stats on mount
  useEffect(() => {
    resetGameStats(levelConfig.maxMoves);
  }, [levelConfig.maxMoves, resetGameStats]);

  // Win/Loss Detection
  useEffect(() => {
    if (!isProcessing && !gameOver) {
      if (score >= levelConfig.targetScore) {
        setGameOver(true);
        setTimeout(() => onWin?.(), 1500);
      } else if (moves <= 0) {
        setGameOver(true);
        setTimeout(() => onLose?.(), 1500);
      }
    }
  }, [score, moves, isProcessing, gameOver, levelConfig.targetScore, onWin, onLose]);

  useEffect(() => {
    const unsub = Orchestrator.subscribe("game_event", (e: GameEvent) => {
      if (e.type === "board_settled" || e.type === "cascade_step" || e.type === "swap_valid" || e.type === "swap_invalid") {
        setBoard([...e.payload.board.map((row: any) => [...row])]);
      }
      if (e.type === "board_settled") {
        setIsProcessing(false);
      }
      if (e.type === "match_found" && e.payload.matches && e.payload.matches.length > 0) {
        const center = e.payload.matches[Math.floor(e.payload.matches.length / 2)];
        const newFx: {id: string, r: number, c: number, type: 'pop' | 'score', text?: string}[] = [];
        
        // Add pop effects for each candy
        e.payload.matches.forEach((m: any) => {
          newFx.push({ id: Math.random().toString(), r: m.r, c: m.c, type: 'pop' });
        });
        
        // Add score floater at the center of the match
        if (e.payload.score > 0) {
          newFx.push({ id: Math.random().toString(), r: center.r, c: center.c, type: 'score', text: `+${e.payload.score}` });
        }
        
        setActiveEffects(prev => [...prev, ...newFx]);
        
        // Cleanup effects after animation completes
        setTimeout(() => {
          setActiveEffects(prev => prev.filter(fx => !newFx.find(nf => nf.id === fx.id)));
        }, 1000);
      }
    });

    engine.fillBoard();
    return () => unsub();
  }, [engine]);

  const handleCandyClick = (r: number, c: number) => {
    if (isProcessing) return;
    
    if (!selected) {
      setSelected({r, c});
      return;
    }

    const {r: r1, c: c1} = selected;
    const isAdjacent = Math.abs(r1 - r) + Math.abs(c1 - c) === 1;
    
    if (!isAdjacent) {
      setSelected({r, c});
      return;
    }

    setIsProcessing(true);
    setSelected(null);
    engine.attemptSwap(r1, c1, r, c);
  };

  return (
    <GameFrame title="Candy Crunch Saga" onClose={onBack}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#fef7ff] to-[#eaddff] flex flex-col items-center overflow-hidden">
        {/* Glassmorphism UI */}
        <div className="w-full max-w-md p-4 flex justify-between items-center z-10 bg-white/40 backdrop-blur-xl shadow-lg border-b border-white/50">
          <div className="text-[#372857] font-bold text-xl drop-shadow-sm">Score: {score}</div>
          <div className="text-[#be0e11] font-bold drop-shadow-sm">Moves: {moves}</div>
        </div>
        
        <div className="flex-1 w-full max-w-md relative">
          <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 45 }}>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <pointLight position={[-5, -5, 5]} intensity={1} />
            
            <group position={[-3.5, 3.5, 0]}>
              {board.map((row, r) => 
                row.map((candy, c) => {
                  if (!candy) return null;
                  const isSelected = selected?.r === r && selected?.c === c;
                  return (
                    <group key={candy.id} position={[c, -r, 0]}>
                      <mesh position={[0, 0, -0.5]}>
                        <boxGeometry args={[0.95, 0.95, 0.1]} />
                        <meshStandardMaterial color={isSelected ? "#ffffff" : "#f4eaff"} roughness={0.8} />
                      </mesh>
                      <CandyMesh 
                        candy={candy} 
                        position={[0, 0, 0]} 
                        onClick={() => handleCandyClick(r, c)} 
                      />
                    </group>
                  );
                })
              )}
              
              {/* Transient Visual Effects */}
              {activeEffects.map(fx => (
                <Html key={fx.id} position={[fx.c, -fx.r, 0]} center className="pointer-events-none">
                  {fx.type === 'pop' ? (
                    <motion.div
                      initial={{ scale: 0, opacity: 1 }}
                      animate={{ scale: 2.5, opacity: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="w-16 h-16 rounded-full border-4 border-white shadow-[0_0_15px_rgba(255,255,255,0.8)]"
                    />
                  ) : (
                    <motion.div
                      initial={{ y: 0, opacity: 1, scale: 0.5 }}
                      animate={{ y: -40, opacity: 0, scale: 1.2 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="text-2xl font-black text-yellow-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]"
                      style={{ WebkitTextStroke: '1px #b45309' }}
                    >
                      {fx.text}
                    </motion.div>
                  )}
                </Html>
              ))}
            </group>
          </Canvas>
        </div>
      </div>
    </GameFrame>
  );
}
