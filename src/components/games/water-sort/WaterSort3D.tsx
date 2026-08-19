import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Sparkles, Html, PerspectiveCamera } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { audio } from './audioManager';
import confetti from 'canvas-confetti';

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

import { liquidVisualEngine } from '../../../engine/rendering/shaders/LiquidVisualEngine';
import { WaterSortLiquidProfile } from './WaterSortLiquidProfile';
import { VisualStreamController } from './VisualStreamController';

import { LevelGenerator } from '../water-sort-pro/levels/LevelGenerator';
import { HintEngine } from '../water-sort-pro/core/HintEngine';
import { GameState } from '../water-sort-pro/core/PuzzleEngine';

// Phase 14: Procedural Condensation Texture Generator
function useCondensationTexture() {
  return useMemo(() => {
    if (typeof document === 'undefined') return null;
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    // Background: Smooth baseline
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, size, size);
    
    // Droplets
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2 + 0.2;
      ctx.globalAlpha = Math.random() * 0.8 + 0.2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Streaks
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const length = Math.random() * 60 + 20;
      const width = Math.random() * 1.5 + 0.5;
      ctx.globalAlpha = Math.random() * 0.6 + 0.1;
      ctx.fillRect(x, y, width, length);
      ctx.beginPath();
      ctx.arc(x + width/2, y + length, width * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    return tex;
  }, []);
}

function LiquidSegment({ color, position, height, isTopLayer, slosh }: { color: string, position: [number, number, number], height: number, isTopLayer?: boolean, slosh?: any }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const profile = useMemo(() => WaterSortLiquidProfile.getProfileForColor(color), [color]);
  const material = useMemo(() => {
    // Clone so uniforms are unique per segment
    return liquidVisualEngine.getLiquidMaterial(profile).clone();
  }, [profile]);
  
  const { scaleY, posY } = useSpring({
    scaleY: height,
    posY: position[1],
    config: { mass: 1, tension: 200, friction: 20 }
  });

  // Phase 4 & 19: Drive shader uniforms dynamically
  useFrame((state) => {
    if (meshRef.current && (material as any).userData?.shader) {
      const uniforms = (material as any).userData.shader.uniforms;
      if (uniforms) {
        uniforms.uIsTopLayer.value = isTopLayer ? 1.0 : 0.0;
        uniforms.uHeight.value = height;
        
        // Read the spring value dynamically
        const currentSlosh = slosh ? slosh.get() : 0;
        
        // Phase 4: Sloshing displacement
        uniforms.uSloshX.value = currentSlosh * 0.15; 
        uniforms.uSloshZ.value = 0.0;
        
        // Phase 1-3: Deformation and Waves
        if (uniforms.uTime) {
          uniforms.uTime.value = state.clock.elapsedTime;
          // Calculate wave amplitude based on slosh intensity. 
          // If currentSlosh is non-zero, amplitude spikes, then decays.
          const sloshIntensity = Math.abs(currentSlosh);
          uniforms.uWaveAmplitude.value = sloshIntensity * 0.05; // Ripple amplitude proportional to slosh
        }
      }
    }
  });

  return (
    <a.mesh ref={meshRef} position-y={posY} position-x={position[0]} position-z={position[2]} scale-y={scaleY} castShadow>
      <cylinderGeometry args={[TUBE_RADIUS - 0.02, TUBE_RADIUS - 0.02, 1, 32, 16]} />
      <primitive object={material} attach="material" />
    </a.mesh>
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
  positionZ,
  isHinted
}: {
  index: number;
  data: TubeData;
  isSelected: boolean;
  isPouring: boolean;
  onClick: () => void;
  positionX: number;
  positionZ: number;
  isHinted?: boolean;
}) {
  // Idle breathing animation
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current && !isPouring && !isSelected) {
      groupRef.current.position.y = (isSelected ? 1.5 : 0) + Math.sin(clock.elapsedTime * 2 + index) * 0.05;
    }
  });

  // Animation springs
  const { pos, rot, slosh, glow } = useSpring({
    pos: [positionX, isSelected ? 1.5 : 0, positionZ] as [number, number, number],
    rot: [0, 0, isPouring ? -Math.PI / 2.5 : 0] as [number, number, number],
    slosh: isSelected ? 1 : (isPouring ? -1 : 0),
    glow: isSelected ? 1 : 0,
    config: { mass: 1, tension: 170, friction: 14 }
  });

  // Phase 18: Liquid Diffusion (Consolidate contiguous colors into unified segments)
  const segments: { colorId: number; height: number; startY: number }[] = [];
  if (data.length > 0) {
    let currentColor = data[0];
    let currentCount = 1;
    for (let i = 1; i <= data.length; i++) {
      if (i < data.length && data[i] === currentColor) {
        currentCount++;
      } else {
        const startY = segments.reduce((sum, s) => sum + s.height, 0);
        segments.push({ colorId: currentColor, height: currentCount * LIQUID_HEIGHT, startY });
        if (i < data.length) {
          currentColor = data[i];
          currentCount = 1;
        }
      }
    }
  }

  // Phase 20: Tube Selection Feedback
  const envIntensity = glow.to((g: number) => 2.0 + g * 1.5);
  const rimIntensity = glow.to((g: number) => 2.5 + g * 2.0);

  // Phase 14: Condensation
  const condensationMap = useCondensationTexture();

  return (
    <a.group ref={groupRef} position={pos as any} rotation={rot as any} onClick={(e: any) => { e.stopPropagation(); onClick(); }}>
      {/* Phase 13 & 14: Hyper-realistic Glass System with Wall Thickness */}
      <mesh position={[0, TUBE_HEIGHT / 2 - 0.2, 0]}>
        {/* Using a tube geometry for the walls instead of double sided cylinder to create actual thickness */}
        <tubeGeometry args={[
          new THREE.LineCurve3(new THREE.Vector3(0, -TUBE_HEIGHT/2, 0), new THREE.Vector3(0, TUBE_HEIGHT/2, 0)),
          1, TUBE_RADIUS, 32, false
        ]} />
        <a.meshPhysicalMaterial 
          transmission={1.0} 
          thickness={0.2} 
          roughness={0.05} 
          ior={1.52} 
          clearcoat={1.0}
          clearcoatRoughness={0.0} 
          transparent
          side={THREE.DoubleSide}
          envMapIntensity={envIntensity as any}
          roughnessMap={condensationMap as any}
          bumpMap={condensationMap as any}
          bumpScale={0.005}
        />
      </mesh>
      
      {/* Base of Tube (Thick glass base) */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[TUBE_RADIUS, TUBE_RADIUS, 0.4, 32]} />
        <a.meshPhysicalMaterial 
          transmission={1.0} 
          thickness={0.5} 
          roughness={0.05} 
          ior={1.52}
          clearcoat={1.0}
          envMapIntensity={envIntensity as any}
        />
      </mesh>
      
      {/* Phase 14 & 20: Glass Edge Detail (Rim Highlight) */}
      <mesh position={[0, TUBE_HEIGHT - 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[TUBE_RADIUS, 0.04, 16, 64]} />
        <a.meshPhysicalMaterial 
          transmission={1.0}
          thickness={0.1}
          ior={1.52}
          roughness={0.02}
          clearcoat={1.0}
          envMapIntensity={rimIntensity as any}
          emissive={"#ffffff"}
          emissiveIntensity={glow.to((g: number) => g * 0.2) as any}
        />
      </mesh>

      {/* Liquids */}
      {segments.map((seg, i) => (
        <LiquidSegment 
          key={i} 
          color={COLORS[seg.colorId % COLORS.length]} 
          position={[0, seg.startY + seg.height / 2, 0]} 
          height={seg.height} 
          isTopLayer={i === segments.length - 1}
          slosh={slosh}
        />
      ))}
      
      {/* Hint Highlight */}
      {isHinted && (
        <Sparkles count={30} scale={2} size={3} speed={2} color="#ffffff" opacity={1} position-y={TUBE_HEIGHT/2} />
      )}
    </a.group>
  );
}

// Phase 26 & 31: Camera Modes and Intro Cinematic
function CameraController({ isPouring }: { isPouring: boolean }) {
  const { pos } = useSpring({
    pos: isPouring ? [0, 6, 10] : [0, 8, 12],
    config: { mass: 1, tension: 80, friction: 20 }
  });
  
  const introState = useRef({ elapsed: 0 });
  useFrame((state, delta) => {
    const currentPos = pos.get() as number[];
    if (introState.current.elapsed < 2.0) {
      introState.current.elapsed += delta;
      const progress = Math.min(1.0, introState.current.elapsed / 1.5);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      state.camera.position.set(
        currentPos[0],
        THREE.MathUtils.lerp(20, currentPos[1], ease),
        THREE.MathUtils.lerp(20, currentPos[2], ease)
      );
      state.camera.lookAt(0, 0, 0);
    } else {
      state.camera.position.set(currentPos[0], currentPos[1], currentPos[2]);
      state.camera.lookAt(0, 0, 0);
    }
  });

  return <PerspectiveCamera makeDefault fov={45} />;
}

// ─── MAIN GAME COMPONENT ─────────────────────────────────────────────────────
export default function WaterSort3D({ level = 1, onWin }: { level: number, onWin: () => void }) {
  const [tubes, setTubes] = useState<TubeData[]>([]);
  const [history, setHistory] = useState<TubeData[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pouringInto, setPouringInto] = useState<number | null>(null);
  const [hint, setHint] = useState<{from: number, to: number} | null>(null);

  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [nextLevelCache, setNextLevelCache] = useState<TubeData[] | null>(null);
  
  // Cinematic states
  const [showWinScreen, setShowWinScreen] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [endTime, setEndTime] = useState<number | null>(null);

  // Phase 40+: Endless Level Engine - Async initialization and pre-generation
  useEffect(() => {
    let active = true;

    const initLevel = async () => {
      setIsGenerating(true);
      
      // If we have a cached level ready for the current request, use it!
      if (nextLevelCache) {
        setTubes(nextLevelCache);
        setHistory([]);
        setSelected(null);
        setHint(null);
        setNextLevelCache(null); // consume cache
        setIsGenerating(false);
      } else {
        // First load or cache miss (e.g. user skipped levels too fast)
        const tubesConfig = await LevelGenerator.generateAsync(level);
        if (!active) return;
        setTubes(tubesConfig);
        setHistory([]);
        setSelected(null);
        setHint(null);
        setIsGenerating(false);
        setStartTime(Date.now());
        setEndTime(null);
        setShowWinScreen(false);
      }

      // Automatically pre-generate the next level in the background
      LevelGenerator.generateAsync(level + 1).then(config => {
        if (active) setNextLevelCache(config);
      }).catch(err => console.error("Failed to pre-generate next level:", err));
    };

    initLevel();

    return () => { active = false; };
  }, [level]);

  // Check Win Condition
  useEffect(() => {
    if (tubes.length === 0) return;
    const isWon = tubes.length > 0 && tubes.every(tube => 
      tube.length === 0 || (tube.length === TUBE_CAPACITY && tube.every(c => c === tube[0]))
    );
    if (isWon && !showWinScreen) {
      audio.playWin();
      setEndTime(Date.now());
      setShowWinScreen(true);
      
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#00ffcc', '#ff00cc', '#ffff00']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#00ffcc', '#ff00cc', '#ffff00']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [tubes, showWinScreen]);

  const handleNextLevel = () => {
    onWin();
  };

  const getTubePos = (idx: number) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    return new THREE.Vector3(
      startX + col * TUBE_SPACING,
      0,
      startZ + row * TUBE_SPACING * 1.5
    );
  };

  const handleTubeClick = (index: number) => {
    if (pouringInto !== null) return;
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
        // Calculate exactly how many blocks will move
        let movedCount = 0;
        let s = [...source];
        let t = [...target];
        while (
          s.length > 0 && 
          t.length < TUBE_CAPACITY && 
          (t.length === 0 || t[t.length - 1] === s[s.length - 1])
        ) {
          const color = s.pop()!;
          t.push(color);
          movedCount++;
          if (s.length > 0 && s[s.length - 1] !== color) break;
        }

        if (movedCount === 0) return; // Should not happen given outer condition, but safe

        // Phase 5 & 18: Dynamic Pour Flow Rate based on amount and viscosity
        const colorHex = COLORS[sourceTop % COLORS.length];
        // For demonstration, map color IDs to LiquidType if we want. Default WATER is viscosity 0.2
        const profile = WaterSortLiquidProfile.getProfileForColor(colorHex); 
        // Base pour is 600ms + 200ms per block, scaled by viscosity
        const pourDuration = (600 + movedCount * 200) * (1 + profile.viscosity);

        // Capture state before modifying for undo history
        setHistory(h => [...h, tubes.map(t => [...t])]);
        
        // Valid pour
        setPouringInto(index);
        audio.playPour(target.length / TUBE_CAPACITY); // Note: Audio engine handles its own timing, could pass duration
        
        // Execute pour logic after realistic delay for animation (Phase 5 & 6)
        setTimeout(() => {
          setTubes(prev => {
            const next = [...prev.map(t => [...t])];
            let moved = 0;
            while (
              next[selected].length > 0 && 
              next[index].length < TUBE_CAPACITY && 
              (next[index].length === 0 || next[index][next[index].length - 1] === next[selected][next[selected].length - 1])
            ) {
              const color = next[selected].pop()!;
              next[index].push(color);
              moved++;
              if (next[selected].length > 0 && next[selected][next[selected].length - 1] !== color) break;
            }
            return next;
          });
          setSelected(null);
          setPouringInto(null);
        }, pourDuration);
      } else {
        // Invalid pour, just switch selection
        if (tubes[index].length > 0) setSelected(index);
        else setSelected(null);
      }
    }
  };

  const handleUndo = () => {
    if (history.length > 0) {
      const prevTubes = history[history.length - 1];
      setTubes(prevTubes);
      setHistory(h => h.slice(0, -1));
      setSelected(null);
      setPouringInto(null);
      setHint(null);
    }
  };

  const handleHint = () => {
    // Construct mock GameState for HintEngine
    const mockState: GameState = {
      levelId: 'current',
      generatorVersion: '2.0',
      seed: 'current',
      tubes: tubes,
      tubeCapacity: TUBE_CAPACITY,
      selectedTube: null,
      moveHistory: [],
      undoStack: [],
      redoStack: [],
      moveCount: 0,
      elapsedTime: 0,
      hintsUsed: 0,
      undosUsed: 0,
      status: 'IDLE'
    };
    
    const hints = HintEngine.getRankedMoves(mockState);
    if (hints.length > 0) {
      // Pick best hint
      const bestHint = hints.sort((a, b) => b.score - a.score)[0];
      setHint({ from: bestHint.move.source, to: bestHint.move.destination });
      setTimeout(() => setHint(null), 3000);
    }
  };

  // Layout calculations
  const totalTubes = tubes.length;
  const cols = Math.ceil(totalTubes / 2);
  const rows = totalTubes > cols ? 2 : 1;
  const startX = -((cols - 1) * TUBE_SPACING) / 2;
  const startZ = -((rows - 1) * TUBE_SPACING) / 2;

  // Extracted Lighting component to fix useFrame error
  const Lighting = () => {
    const lightRef = useRef<THREE.DirectionalLight>(null);
    useFrame(({ clock }) => {
      if (lightRef.current) {
        const t = clock.elapsedTime * 0.2;
        lightRef.current.position.set(Math.cos(t) * 10, 10, Math.sin(t) * 10);
      }
    });
    return (
      <>
        <ambientLight intensity={0.5} />
        <directionalLight 
          ref={lightRef}
          position={[10, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />
      </>
    );
  };

  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 1.5]} onPointerDown={() => audio.init()}>
        <CameraController isPouring={pouringInto !== null} />
        <color attach="background" args={['#050510']} />
        
        <Lighting />

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
              isHinted={hint?.from === i || hint?.to === i}
              onClick={() => handleTubeClick(i)}
              positionX={startX + col * TUBE_SPACING}
              positionZ={startZ + row * TUBE_SPACING * 1.5}
            />
          );
        })}

        {/* Phase 6: Pour Stream Solver (Visual Interpolation) */}
        {selected !== null && pouringInto !== null && tubes[selected].length > 0 && (
          <VisualStreamController 
            active={true}
            sourcePos={getTubePos(selected).add(new THREE.Vector3(0, TUBE_HEIGHT - 0.5, 0))}
            targetPos={getTubePos(pouringInto).add(new THREE.Vector3(0, TUBE_HEIGHT / 2, 0))}
            color={COLORS[tubes[selected][tubes[selected].length - 1] % COLORS.length]}
          />
        )}

        {/* UI Overlay via Html */}
        <Html position={[0, -2.5, startZ + rows * TUBE_SPACING * 1.5]} center zIndexRange={[100, 0]}>
          <div className="flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <button 
              onClick={handleUndo} 
              disabled={history.length === 0}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white/20 disabled:opacity-50 transition-all"
            >
              Undo
            </button>
            <button 
              onClick={handleHint}
              className="bg-white/10 backdrop-blur-md border border-white/20 text-[#5ab8ea] px-8 py-3 rounded-full font-bold shadow-lg hover:bg-white/20 transition-all"
            >
              Hint
            </button>
          </div>
        </Html>

        {/* Phase 23 & 24: PBR Environment / Lab Table */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshPhysicalMaterial 
            color="#1a1a24" 
            roughness={0.15} 
            metalness={0.8} 
            clearcoat={1.0} 
            clearcoatRoughness={0.2} 
            envMapIntensity={1.0} 
          />
        </mesh>
        
        {/* Subtle grid on the table to give it a laboratory feel */}
        <gridHelper args={[100, 100, 0x444455, 0x222233]} position={[0, -0.49, 0]} />
        
        <ContactShadows position={[0, -0.48, 0]} opacity={0.8} scale={20} blur={2.5} far={10} color="#000000" />
        
        {/* Phase 31: VFX Pooling (Atmospheric) */}
        <Sparkles count={150} scale={20} size={1.5} speed={0.2} opacity={0.3} color="#ffffff" />
        <Sparkles count={50} scale={15} size={2.5} speed={0.5} opacity={0.6} color="#00ffcc" position-y={2} />
      </group>

      {isGenerating && (
        <Html center>
          <div className="flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md rounded-2xl border border-cyan-500/30">
            <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mb-4"></div>
            <p className="text-cyan-400 font-bold tracking-widest text-sm uppercase">Synthesizing Level</p>
          </div>
        </Html>
      )}

      <OrbitControls 
        enablePan={false} 
        minPolarAngle={Math.PI / 6} 
        maxPolarAngle={Math.PI / 2 - 0.05}
        minDistance={5}
        maxDistance={30}
        autoRotate={false} /* Disabled autoRotate for better player focus during pours */
      />
      </Canvas>

      {/* Level Completion Cinematic Overlay */}
      {showWinScreen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-all duration-1000 animate-in fade-in zoom-in-95">
          <div className="bg-slate-900/90 border border-cyan-500/50 rounded-3xl p-8 max-w-sm w-full mx-4 shadow-[0_0_50px_-12px_rgba(0,255,204,0.5)] flex flex-col items-center">
            
            <div className="w-24 h-24 mb-6 rounded-full bg-cyan-500/20 flex items-center justify-center animate-bounce">
              <span className="text-5xl">🏆</span>
            </div>

            <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500 mb-2 text-center">
              LEVEL {level} CLEARED
            </h2>
            <p className="text-cyan-200/60 font-medium mb-8 text-center text-sm uppercase tracking-widest">
              Brilliant Synthesis
            </p>

            <div className="w-full space-y-3 mb-8">
              <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 font-medium">Moves</span>
                <span className="text-cyan-400 font-bold text-xl">{history.length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 font-medium">Time</span>
                <span className="text-fuchsia-400 font-bold text-xl">
                  {endTime ? Math.round((endTime - startTime) / 1000) : 0}s
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                <span className="text-slate-400 font-medium">Liquid Score</span>
                <span className="text-yellow-400 font-bold text-xl">
                  +{level * 100}
                </span>
              </div>
            </div>

            <button
              onClick={handleNextLevel}
              className="w-full py-4 rounded-xl font-black text-lg text-slate-900 bg-gradient-to-r from-cyan-400 to-cyan-300 hover:from-cyan-300 hover:to-cyan-200 shadow-[0_0_20px_rgba(0,255,204,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              NEXT LEVEL
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
