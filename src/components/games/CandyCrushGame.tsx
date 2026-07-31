import { useState, useEffect, useRef, Suspense } from 'react';
import { GameFrame } from './GameFrame';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Environment } from '@react-three/drei';
import { EffectComposer, Bloom, DepthOfField } from '@react-three/postprocessing';
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
  const meshRef = useRef<THREE.Mesh>(null);
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

  const isSoft = candy.color === 'purple';
  const roughness = isSoft ? 0.4 : 0.05;
  const transmission = isSoft ? 0 : 0.3;
  const thickness = isSoft ? 0 : 0.5;
  const clearcoat = isSoft ? 0 : 1;
  const clearcoatRoughness = isSoft ? 0 : 0.1;

  return (
    <mesh 
      ref={meshRef} 
      position={[position[0], position[1] + 10, position[2]]}
      geometry={getGeometry(candy.color)}
      rotation={getRotation(candy.color)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshPhysicalMaterial 
        color={colorMap[candy.color]} 
        roughness={roughness} 
        metalness={0.1}
        clearcoat={clearcoat}
        clearcoatRoughness={clearcoatRoughness}
        transmission={transmission}
        thickness={thickness}
        ior={1.5}
      />
    </mesh>
  );
}

export default function CandyCrushGame({ onBack, ...props }: { onBack: () => void, balance?: number }) {
  const [engine] = useState(() => new CandyEngine(8, 8));
  const [board, setBoard] = useState<(Candy | null)[][]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const score = useGameStore(s => s.score);
  const moves = useGameStore(s => s.moves);

  void props.balance;

  useEffect(() => {
    const unsub = Orchestrator.subscribe("game_event", (e: GameEvent) => {
      if (e.type === "board_settled" || e.type === "cascade_step" || e.type === "swap_valid" || e.type === "swap_invalid") {
        setBoard([...e.payload.board.map((row: any) => [...row])]);
      }
      if (e.type === "board_settled") {
        setIsProcessing(false);
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
            <Suspense fallback={null}>
              <Environment preset="studio" />
              <ambientLight intensity={0.4} />
              <directionalLight position={[5, 10, 5]} intensity={1.2} />
              <pointLight position={[-5, -5, 5]} intensity={0.8} />
              
              <EffectComposer>
                <Bloom luminanceThreshold={0.8} luminanceSmoothing={0.1} intensity={0.5} />
                <DepthOfField focusDistance={0} focalLength={0.02} bokehScale={2} height={480} />
              </EffectComposer>

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
              </group>
            </Suspense>
          </Canvas>
        </div>
      </div>
    </GameFrame>
  );
}
