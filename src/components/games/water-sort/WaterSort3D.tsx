import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, MeshTransmissionMaterial, Sparkles } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import { EffectComposer, Bloom, DepthOfField, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { audio } from './audioManager';

// ─── TYPES ──────────────────────────────────────────────────────────────────
type ColorId = number;
type TubeData = ColorId[];

// ─── CONSTANTS & PALETTE ────────────────────────────────────────────────────
const TUBE_CAPACITY = 4;
const LIQUID_HEIGHT = 1.2;
const TUBE_HEIGHT = TUBE_CAPACITY * LIQUID_HEIGHT + 0.5;
const TUBE_RADIUS = 0.6;
const TUBE_SPACING = 2.5;

const COLORS = [
  '#ff003c', // Ruby Red
  '#00ff66', // Emerald Green
  '#00ccff', // Ocean Blue
  '#ffcc00', // Golden Yellow
  '#9900ff', // Purple
  '#ff66cc', // Pink
  '#ff9900', // Orange
  '#00ffff', // Cyan
  '#66ff99', // Mint
  '#ffffff', // Pearl
  '#8B4513', // Bronze
  '#00fa9a', // Spring Green
  '#dc143c', // Crimson
  '#4169e1', // Royal Blue
];

// ─── PROCEDURAL GENERATOR (GUARANTEED SOLVABLE) ──────────────────────────────
function generateLevel(colorCount: number, emptyCount: number, shuffleMoves: number): TubeData[] {
  // Start with a solved state
  let tubes: TubeData[] = [];
  for (let i = 0; i < colorCount; i++) {
    tubes.push(Array(TUBE_CAPACITY).fill(i));
  }
  for (let i = 0; i < emptyCount; i++) {
    tubes.push([]);
  }

  // Shuffle by doing reverse legal moves
  let moves = 0;
  while (moves < shuffleMoves) {
    // Pick a random non-empty tube to pull color FROM
    const nonEmptyTubes = tubes.map((t, idx) => ({ t, idx })).filter(x => x.t.length > 0);
    if (nonEmptyTubes.length === 0) break;
    const fromSource = nonEmptyTubes[Math.floor(Math.random() * nonEmptyTubes.length)];
    
    // Pick a random tube to push color TO (must not be full, must be different tube)
    const notFullTubes = tubes.map((t, idx) => ({ t, idx })).filter(x => x.t.length < TUBE_CAPACITY && x.idx !== fromSource.idx);
    
    if (notFullTubes.length > 0) {
      const toTarget = notFullTubes[Math.floor(Math.random() * notFullTubes.length)];
      // Pop from source, push to target
      const color = fromSource.t.pop()!;
      toTarget.t.push(color);
      moves++;
    }
  }

  return tubes;
}

// ─── LIQUID SEGMENT COMPONENT ────────────────────────────────────────────────
function LiquidSegment({ color, position, height }: { color: string, position: [number, number, number], height: number }) {
  const { scaleY, posY } = useSpring({
    scaleY: height,
    posY: position[1],
    config: { mass: 1, tension: 200, friction: 20 }
  });

  return (
    <a.group position-y={posY}>
      <a.mesh scale-y={scaleY}>
        <cylinderGeometry args={[TUBE_RADIUS - 0.05, TUBE_RADIUS - 0.05, 1, 32]} />
        <meshPhysicalMaterial 
          color={color} 
          transmission={0.8}
          opacity={1}
          transparent
          roughness={0.1}
          ior={1.33}
          thickness={1}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </a.mesh>
    </a.group>
  );
}

// ─── TUBE COMPONENT ──────────────────────────────────────────────────────────
function Tube({
  index,
  data,
  isSelected,
  isPouring,
  onClick,
  positionX,
  positionZ
}: {
  index: number;
  data: TubeData;
  isSelected: boolean;
  isPouring: boolean;
  onClick: () => void;
  positionX: number;
  positionZ: number;
}) {
  // Idle breathing animation
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current && !isPouring && !isSelected) {
      // Subtle sine wave breathing based on tube index so they breathe out of phase
      groupRef.current.position.y = pos.y.get() + Math.sin(clock.elapsedTime * 2 + index) * 0.05;
    }
  });

  // Animation springs
  const { pos, rot } = useSpring({
    pos: [positionX, isSelected ? 1.5 : 0, positionZ] as [number, number, number],
    rot: [0, 0, isPouring ? -Math.PI / 2.5 : 0] as [number, number, number],
    config: { mass: 1, tension: 170, friction: 14 }
  });

  return (
    <a.group ref={groupRef} position={pos as any} rotation={rot as any} onClick={(e: any) => { e.stopPropagation(); onClick(); }}>
      {/* Glass Tube */}
      <mesh position={[0, TUBE_HEIGHT / 2 - 0.2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, TUBE_HEIGHT, 32, 1, true]} />
        <MeshTransmissionMaterial 
          transmission={1} 
          thickness={1.5} 
          roughness={0.05} 
          ior={1.5} 
          clearcoat={1} 
          chromaticAberration={0.05}
          anisotropicBlur={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Base of Tube */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.1, 32]} />
        <meshPhysicalMaterial 
          transmission={1} 
          thickness={0.5} 
          roughness={0.05} 
          ior={1.5}
        />
      </mesh>
      
      {/* Gold Trim at Top of Tube */}
      <mesh position={[0, TUBE_HEIGHT - 0.25, 0]}>
        <torusGeometry args={[TUBE_RADIUS + 0.05, 0.05, 16, 100]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.1} />
      </mesh>

      {/* Liquids */}
      {data.map((colorId, i) => (
        <LiquidSegment 
          key={i} 
          color={COLORS[colorId % COLORS.length]} 
          position={[0, i * LIQUID_HEIGHT + LIQUID_HEIGHT / 2, 0]} 
          height={LIQUID_HEIGHT} 
        />
      ))}
    </a.group>
  );
}

// ─── MAIN GAME COMPONENT ─────────────────────────────────────────────────────
export default function WaterSort3D({ level = 1, onWin }: { level: number, onWin: () => void }) {
  const [tubes, setTubes] = useState<TubeData[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pouringInto, setPouringInto] = useState<number | null>(null);

  // Initialize Level
  useEffect(() => {
    const colorCount = Math.min(3 + Math.floor(level / 1.5), 14);
    const emptyCount = 2;
    const shuffleMoves = 30 + level * 10;
    setTubes(generateLevel(colorCount, emptyCount, shuffleMoves));
    setSelected(null);
  }, [level]);

  // Check Win Condition
  useEffect(() => {
    if (tubes.length === 0) return;
    const isWon = tubes.every(tube => 
      tube.length === 0 || (tube.length === TUBE_CAPACITY && tube.every(c => c === tube[0]))
    );
    if (isWon) {
      audio.playWin();
      setTimeout(() => onWin(), 1000);
    }
  }, [tubes, onWin]);

  const handleTubeClick = (index: number) => {
    if (selected === null) {
      // Select if not empty
      if (tubes[index].length > 0) setSelected(index);
    } else if (selected === index) {
      // Deselect
      setSelected(null);
    } else {
      // Try to pour
      const source = tubes[selected];
      const target = tubes[index];
      
      const sourceTop = source[source.length - 1];
      const targetTop = target[target.length - 1];

      if (target.length < TUBE_CAPACITY && (target.length === 0 || targetTop === sourceTop)) {
        // Valid pour
        setPouringInto(index);
        audio.playPour(target.length / TUBE_CAPACITY);
        
        // Execute pour logic after short delay for animation
        setTimeout(() => {
          setTubes(prev => {
            const next = [...prev.map(t => [...t])];
            
            // Move as many as possible
            let moved = 0;
            while (
              next[selected].length > 0 && 
              next[index].length < TUBE_CAPACITY && 
              (next[index].length === 0 || next[index][next[index].length - 1] === next[selected][next[selected].length - 1])
            ) {
              const color = next[selected].pop()!;
              next[index].push(color);
              moved++;
              // For simplicity, move all contiguous blocks of same color in one go
              if (next[selected].length > 0 && next[selected][next[selected].length - 1] !== color) break;
            }
            return next;
          });
          setSelected(null);
          setPouringInto(null);
        }, 300);
      } else {
        // Invalid pour, just switch selection
        if (tubes[index].length > 0) setSelected(index);
        else setSelected(null);
      }
    }
  };

  // Layout calculations
  const totalTubes = tubes.length;
  const cols = Math.ceil(totalTubes / 2);
  const rows = totalTubes > cols ? 2 : 1;
  const startX = -((cols - 1) * TUBE_SPACING) / 2;
  const startZ = -((rows - 1) * TUBE_SPACING) / 2;

  // Dynamic lighting animation
  const lightRef = useRef<THREE.DirectionalLight>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      const t = clock.elapsedTime * 0.2;
      lightRef.current.position.set(Math.cos(t) * 10, 10, Math.sin(t) * 10);
    }
  });

  return (
    <Canvas shadows camera={{ position: [0, 8, 12], fov: 45 }} onPointerDown={() => audio.init()}>
      <color attach="background" args={['#050510']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight 
        ref={lightRef}
        position={[10, 10, 5]} 
        intensity={2} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      <spotLight position={[-10, 10, -5]} intensity={1} color="#5ab8ea" />

      <Environment preset="studio" />

      <group position={[0, -2, 0]}>
        {tubes.map((tube, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          return (
            <Tube
              key={i}
              index={i}
              data={tube}
              isSelected={selected === i}
              isPouring={selected === i && pouringInto !== null}
              onClick={() => handleTubeClick(i)}
              positionX={startX + col * TUBE_SPACING}
              positionZ={startZ + row * TUBE_SPACING * 1.5}
            />
          );
        })}

        {/* Premium Mahogany Wood Table */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#3e1d04" roughness={0.7} metalness={0.1} />
        </mesh>
        
        <ContactShadows position={[0, -0.49, 0]} opacity={0.5} scale={20} blur={2} far={10} />
        
        {/* Floating atmospheric dust & bubbles */}
        <Sparkles count={100} scale={15} size={2} speed={0.4} opacity={0.2} color="#ffffff" />
        <Sparkles count={50} scale={10} size={1} speed={0.8} opacity={0.5} color="#5ab8ea" position-y={2} />
      </group>

      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 6} 
        maxPolarAngle={Math.PI / 2 - 0.1}
        minDistance={5}
        maxDistance={25}
        autoRotate
        autoRotateSpeed={0.5}
      />

      <EffectComposer>
        <DepthOfField focusDistance={0.01} focalLength={0.05} bokehScale={2} />
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.5} mipmapBlur />
        <Vignette eskil={false} offset={0.1} darkness={1.1} />
      </EffectComposer>
    </Canvas>
  );
}
