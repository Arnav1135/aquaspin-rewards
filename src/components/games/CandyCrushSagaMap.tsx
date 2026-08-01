import { useState, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, ScrollControls, useScroll, Float } from '@react-three/drei';
import * as THREE from 'three';
import { GameFrame } from './GameFrame';
import CandyCrushGame, { LevelConfig } from './CandyCrushGame';
import { useGameStore } from './candycrush/UIEngine';
import { Trophy, Lock } from 'lucide-react';

const LEVELS: LevelConfig[] = [
  { level: 1, targetScore: 1000, maxMoves: 15 },
  { level: 2, targetScore: 2500, maxMoves: 20 },
  { level: 3, targetScore: 4000, maxMoves: 25 },
  { level: 4, targetScore: 6000, maxMoves: 30 },
  { level: 5, targetScore: 10000, maxMoves: 35 },
  { level: 6, targetScore: 15000, maxMoves: 40 },
  { level: 7, targetScore: 22000, maxMoves: 45 },
  { level: 8, targetScore: 30000, maxMoves: 50 },
  { level: 9, targetScore: 45000, maxMoves: 55 },
  { level: 10, targetScore: 60000, maxMoves: 60 },
];

function PathLine() {
  const points = LEVELS.map((_, i) => new THREE.Vector3(
    Math.sin(i * 1.5) * 2,
    -i * 3,
    0
  ));
  
  const curve = new THREE.CatmullRomCurve3(points);
  const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.2, 8, false);

  return (
    <mesh geometry={tubeGeo}>
      <meshStandardMaterial color="#fcd34d" emissive="#f59e0b" emissiveIntensity={0.2} />
    </mesh>
  );
}

function LevelNode({ 
  config, 
  index, 
  isUnlocked, 
  onClick 
}: { 
  config: LevelConfig, 
  index: number, 
  isUnlocked: boolean,
  onClick: () => void 
}) {
  const x = Math.sin(index * 1.5) * 2;
  const y = -index * 3;
  
  return (
    <group position={[x, y, 0]}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh onClick={(e) => { e.stopPropagation(); if (isUnlocked) onClick(); }}>
          <sphereGeometry args={[isUnlocked ? 0.8 : 0.6, 32, 32]} />
          <meshPhysicalMaterial 
            color={isUnlocked ? "#ec4899" : "#94a3b8"} 
            roughness={0.2}
            clearcoat={1}
            transmission={0.2}
            thickness={1}
          />
        </mesh>
      </Float>
      
      <Html position={[0, 0, 1]} center zIndexRange={[100, 0]} distanceFactor={10}>
        <div className={`
          flex flex-col items-center justify-center pointer-events-none
          ${isUnlocked ? 'text-white' : 'text-slate-400'}
          font-extrabold text-2xl drop-shadow-md
        `}>
          {isUnlocked ? config.level : <Lock size={24} />}
        </div>
      </Html>
    </group>
  );
}

function MapScene({ onSelectLevel, highestUnlocked }: { onSelectLevel: (lvl: LevelConfig) => void, highestUnlocked: number }) {
  const scroll = useScroll();
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      // scroll.offset goes from 0 to 1
      const maxY = (LEVELS.length - 1) * 3;
      groupRef.current.position.y = scroll.offset * maxY;
    }
  });

  return (
    <group ref={groupRef}>
      <PathLine />
      {LEVELS.map((level, i) => (
        <LevelNode 
          key={level.level}
          index={i}
          config={level}
          isUnlocked={level.level <= highestUnlocked}
          onClick={() => onSelectLevel(level)}
        />
      ))}
    </group>
  );
}

export default function CandyCrushSagaMap({ onBack, balance }: { onBack: () => void, balance?: number }) {
  const [activeLevel, setActiveLevel] = useState<LevelConfig | null>(null);
  const highestUnlockedLevel = useGameStore(s => s.highestUnlockedLevel);
  const setHighestUnlockedLevel = useGameStore(s => s.setHighestUnlockedLevel);

  if (activeLevel) {
    return (
      <CandyCrushGame 
        onBack={() => setActiveLevel(null)} 
        balance={balance}
        levelConfig={activeLevel}
        onWin={() => {
          setHighestUnlockedLevel(activeLevel.level + 1);
          setActiveLevel(null);
        }}
        onLose={() => {
          setActiveLevel(null);
        }}
      />
    );
  }

  return (
    <GameFrame title="Candy Crunch Saga" onClose={onBack}>
      <div className="absolute inset-0 bg-gradient-to-b from-[#2e1065] to-[#db2777] overflow-hidden">
        <Canvas camera={{ position: [0, 2, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          
          <ScrollControls pages={LEVELS.length * 0.5} damping={0.2}>
            <MapScene onSelectLevel={setActiveLevel} highestUnlocked={highestUnlockedLevel} />
          </ScrollControls>
        </Canvas>
        
        {/* Overlay HUD */}
        <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center pointer-events-none">
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold border border-white/30 flex items-center gap-2 shadow-lg">
            <Trophy size={18} className="text-yellow-400" />
            Max Level: {highestUnlockedLevel}
          </div>
          <div className="bg-white/20 backdrop-blur-md px-4 py-2 rounded-xl text-white font-bold border border-white/30 shadow-lg text-sm text-center">
            Scroll Down<br/>to progress
          </div>
        </div>
      </div>
    </GameFrame>
  );
}
