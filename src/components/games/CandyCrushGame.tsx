import { useState, useEffect, useRef } from 'react';
import { GameFrame } from './GameFrame';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CandyEngine, Candy, CandyType } from './candycrush/CandyEngine';

// Candy Geometries
const SphereGeo = new THREE.SphereGeometry(0.4, 32, 32);
const OvalGeo = new THREE.CapsuleGeometry(0.25, 0.4, 4, 16);
const DiamondGeo = new THREE.OctahedronGeometry(0.4, 0);
const DiscGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 32);
const GumdropGeo = new THREE.CylinderGeometry(0.2, 0.4, 0.5, 32);
// Simple teardrop using cone
const ConeGeo = new THREE.ConeGeometry(0.35, 0.7, 16);

const colors = [
  '#ba090f', // Red
  '#f5811f', // Orange
  '#facc15', // Yellow
  '#4ade80', // Green
  '#005ea3', // Blue
  '#a855f7', // Purple
];

function CandyMesh({ candy, position, onClick }: { candy: Candy, position: [number, number, number], onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const targetPos = new THREE.Vector3(...position);
  
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.position.lerp(targetPos, delta * 10);
    }
  });

  const getGeometry = (type: CandyType) => {
    switch(type) {
      case 0: return SphereGeo;
      case 1: return OvalGeo;
      case 2: return ConeGeo;
      case 3: return DiamondGeo;
      case 4: return DiscGeo;
      case 5: return GumdropGeo;
      default: return SphereGeo;
    }
  };

  const getRotation = (type: CandyType): [number, number, number] => {
    switch(type) {
      case 1: return [0, 0, Math.PI / 2]; // Horizontal oval
      case 4: return [Math.PI / 2, 0, 0]; // Disc facing front
      default: return [0, 0, 0];
    }
  };

  return (
    <mesh 
      ref={meshRef} 
      position={[position[0], position[1] + 10, position[2]]} // start from top
      geometry={getGeometry(candy.type)}
      rotation={getRotation(candy.type)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <meshPhysicalMaterial 
        color={colors[candy.type]} 
        roughness={0.1} 
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </mesh>
  );
}

export default function CandyCrushGame({ onBack, balance }: { onBack: () => void, balance?: number }) {
  const [engine] = useState(() => new CandyEngine(8, 8));
  const [board, setBoard] = useState<(Candy | null)[][]>([]);
  const [selected, setSelected] = useState<{r: number, c: number} | null>(null);
  const [score, setScore] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    engine.fillBoard();
    setBoard([...engine.board.map(row => [...row])]);
  }, [engine]);

  const processMatches = async () => {
    let matches = engine.findMatches();
    let currentScore = score;
    
    while (matches.length > 0) {
      currentScore += matches.length * 10;
      setScore(currentScore);
      
      engine.resolveMatches(matches);
      setBoard([...engine.board.map(row => [...row])]);
      await new Promise(r => setTimeout(r, 300));
      
      engine.applyGravity();
      setBoard([...engine.board.map(row => [...row])]);
      await new Promise(r => setTimeout(r, 400));
      
      matches = engine.findMatches();
    }
    
    setIsProcessing(false);
  };

  const handleCandyClick = async (r: number, c: number) => {
    if (isProcessing) return;
    
    if (!selected) {
      setSelected({r, c});
      return;
    }

    const {r: r1, c: c1} = selected;
    const r2 = r;
    const c2 = c;

    const isAdjacent = Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    
    if (!isAdjacent) {
      setSelected({r, c});
      return;
    }

    setIsProcessing(true);
    setSelected(null);

    const success = engine.swap(r1, c1, r2, c2);
    setBoard([...engine.board.map(row => [...row])]);
    
    if (!success) {
      // Swap back animation wait
      await new Promise(resolve => setTimeout(resolve, 300));
      setBoard([...engine.board.map(row => [...row])]);
      setIsProcessing(false);
    } else {
      await new Promise(resolve => setTimeout(resolve, 300));
      await processMatches();
    }
  };

  return (
    <GameFrame title="Candy Crunch Saga" onClose={onBack}>
      <div className="absolute inset-0 bg-[#fef7ff] flex flex-col items-center overflow-hidden">
        {/* HUD */}
        <div className="w-full max-w-md p-4 flex justify-between items-center z-10 bg-white/80 backdrop-blur-md shadow-sm">
          <div className="text-[#372857] font-bold text-xl">Score: {score}</div>
          <div className="text-[#be0e11] font-bold">Moves: 30</div>
        </div>
        
        {/* Board */}
        <div className="flex-1 w-full max-w-md relative">
          <Canvas orthographic camera={{ position: [0, 0, 10], zoom: 45 }}>
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 10, 5]} intensity={1.5} />
            <pointLight position={[-5, -5, 5]} intensity={0.5} />
            
            <group position={[-3.5, 3.5, 0]}>
              {board.map((row, r) => 
                row.map((candy, c) => {
                  if (!candy) return null;
                  const isSelected = selected?.r === r && selected?.c === c;
                  return (
                    <group key={candy.id} position={[c, -r, 0]}>
                      {/* Background Tile */}
                      <mesh position={[0, 0, -0.5]}>
                        <boxGeometry args={[0.95, 0.95, 0.1]} />
                        <meshStandardMaterial color={isSelected ? "#eaddff" : "#f4eaff"} />
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
          </Canvas>
        </div>
      </div>
    </GameFrame>
  );
}
