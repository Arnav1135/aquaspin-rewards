import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows, OrbitControls, Sparkles, Html, PerspectiveCamera, MeshReflectorMaterial } from '@react-three/drei';
import { useSpring, a } from '@react-spring/three';
import * as THREE from 'three';
import { EffectComposer, DepthOfField, Bloom, Vignette } from '@react-three/postprocessing';
import { audio } from './audioManager';
import confetti from 'canvas-confetti';

// ─── TYPES ──────────────────────────────────────────────────────────────────
type ColorId = number;
type TubeData = ColorId[];

import { TUBE_CAPACITY, TUBE_RADIUS, TUBE_HEIGHT, LIQUID_HEIGHT, TUBE_SPACING, COLORS } from './constants';

import { liquidVisualEngine } from '../../../engine/rendering/shaders/LiquidVisualEngine';
import { WaterSortLiquidProfile } from './WaterSortLiquidProfile';
import { VisualStreamController } from './VisualStreamController';
import { Tube } from './Tube3D';

import { LevelGenerator } from '../water-sort-pro/levels/LevelGenerator';
import { WaterSortRulesEngine, TubeMetadata } from './WaterSortRulesEngine';
import { HintEngine } from '../water-sort-pro/core/HintEngine';
import { GameState } from '../water-sort-pro/core/PuzzleEngine';

// Phase 14: Procedural Condensation Texture Generator

// Phase 26 & 31: Camera Modes, Intro Cinematic & Procedural Parallax
function CameraController({ isPouring }: { isPouring: boolean }) {
  const { pos } = useSpring({
    pos: isPouring ? [0, 6, 10] : [0, 8, 12],
    config: { mass: 1, tension: 80, friction: 20 }
  });
  
  const introState = useRef({ elapsed: 0 });
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  
  useFrame((state, delta) => {
    const currentPos = pos.get() as number[];
    
    // Phase 24: Ambient World Animation & Procedural Parallax
    const parallaxX = state.pointer.x * 2.0;
    const parallaxY = state.pointer.y * 1.5;
    const sway = Math.sin(state.clock.elapsedTime * 0.5) * 0.5;

    if (introState.current.elapsed < 2.0) {
      introState.current.elapsed += delta;
      const progress = Math.min(1.0, introState.current.elapsed / 1.5);
      const ease = 1 - Math.pow(1 - progress, 3);
      
      state.camera.position.set(
        currentPos[0] + parallaxX,
        THREE.MathUtils.lerp(20, currentPos[1] + parallaxY, ease),
        THREE.MathUtils.lerp(20, currentPos[2], ease)
      );
      state.camera.lookAt(targetLookAt.current);
    } else {
      // Smoothly interpolate to new parallax positions
      state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, currentPos[0] + parallaxX + sway, delta * 3);
      state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, currentPos[1] + parallaxY, delta * 3);
      state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, currentPos[2], delta * 3);
      
      // Look slightly offset based on pointer for deeper parallax effect
      targetLookAt.current.x = THREE.MathUtils.lerp(targetLookAt.current.x, parallaxX * 0.2, delta * 5);
      targetLookAt.current.y = THREE.MathUtils.lerp(targetLookAt.current.y, parallaxY * 0.2, delta * 5);
      state.camera.lookAt(targetLookAt.current);
    }
  });

  return <PerspectiveCamera makeDefault fov={45} />;
}

// ─── MAIN GAME COMPONENT ─────────────────────────────────────────────────────
export default function WaterSort3D({ level = 1, onWin }: { level: number, onWin: () => void }) {
  const [tubes, setTubes] = useState<TubeData[]>([]);
  const [tubeMetadata, setTubeMetadata] = useState<TubeMetadata[]>([]);
  const [history, setHistory] = useState<TubeData[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [pouringInto, setPouringInto] = useState<number | null>(null);
  const [streamData, setStreamData] = useState<{ source: number; target: number; color: string; active: boolean } | null>(null);
  const [hint, setHint] = useState<{from: number, to: number} | null>(null);
  const [invalidShakeIndex, setInvalidShakeIndex] = useState<number | null>(null);

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
        
        // Setup metadata features for testing mechanics
        const metadata = nextLevelCache.map((_, i) => ({
          isLocked: level > 5 && i === 0, // Mock: first tube locked on level > 5
          frozenLayers: level > 10 && i === 1 ? 1 : 0, // Mock: second tube frozen on level > 10
          portalTarget: null
        }));
        setTubeMetadata(metadata);
        
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
        
        const metadata = tubesConfig.map((_, i) => ({
          isLocked: level > 5 && i === 0,
          frozenLayers: level > 10 && i === 1 ? 1 : 0,
          portalTarget: null
        }));
        setTubeMetadata(metadata);

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
    const isWon = WaterSortRulesEngine.isSolved(tubes, TUBE_CAPACITY);
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
      // Select if not empty and not frozen/locked
      if (tubes[index].length > 0 && (!tubeMetadata[index] || (!tubeMetadata[index].isLocked && tubeMetadata[index].frozenLayers === 0))) {
        setSelected(index);
      } else {
        setInvalidShakeIndex(index);
        setTimeout(() => setInvalidShakeIndex(null), 300);
      }
    } else if (selected === index) {
      // Deselect
      setSelected(null);
    } else {
      // Try to pour using RulesEngine
      if (WaterSortRulesEngine.canPour(tubes, selected, index, TUBE_CAPACITY, tubeMetadata)) {
        const amount = WaterSortRulesEngine.getPourAmount(tubes, selected, index, TUBE_CAPACITY, tubeMetadata);
        if (amount > 0) {
          const resolvedTarget = WaterSortRulesEngine.resolveTarget(index, tubeMetadata);
          const sourceTop = tubes[selected][tubes[selected].length - 1];
          const colorHex = COLORS[sourceTop % COLORS.length];
          const profile = WaterSortLiquidProfile.getProfileForColor(colorHex); 

          setPouringInto(resolvedTarget);
          setStreamData({
            source: selected,
            target: resolvedTarget,
            color: colorHex,
            active: true
          });
          audio.playPour(tubes[resolvedTarget].length / TUBE_CAPACITY);

          // Base pour is 600ms + 200ms per block, scaled by viscosity
          const pourDuration = (600 + amount * 200) * (1 + profile.viscosity);

          // Capture state before modifying for undo history
          setHistory(h => [...h, tubes.map(t => [...t])]);

          // Execute pour logic after realistic delay for animation
          setTimeout(() => {
            const { nextTubes, nextMetadata } = WaterSortRulesEngine.applyPour(tubes, selected, index, TUBE_CAPACITY, tubeMetadata);
            setTubes(nextTubes);
            if (nextMetadata) setTubeMetadata(nextMetadata);
            setSelected(null);
            setPouringInto(null);
            setStreamData(prev => prev ? { ...prev, active: false } : null);
          }, pourDuration);
        } else {
          // Valid logically but 0 amount? (Edge case)
          setInvalidShakeIndex(index);
          setTimeout(() => setInvalidShakeIndex(null), 300);
        }
      } else {
        // Invalid pour, trigger feedback
        setInvalidShakeIndex(index);
        setTimeout(() => setInvalidShakeIndex(null), 300);
      }
    }
  };

  const isValidTarget = (index: number) => {
    if (selected === null || selected === index) return false;
    const source = tubes[selected];
    const target = tubes[index];
    if (source.length === 0) return false;
    
    const sourceTop = source[source.length - 1];
    const targetTop = target[target.length - 1];
    return target.length < TUBE_CAPACITY && (target.length === 0 || targetTop === sourceTop);
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

  // Phase 27 & 28: Procedural World Themes deterministic selection
  const WORLD_THEMES = [
    { name: 'LABORATORY', floor: '#ffffff', lightInt: 1.5, bg: '#f0f0f0', ambient: 0.8 },
    { name: 'NEON', floor: '#101015', lightInt: 0.8, bg: '#050510', ambient: 0.3 },
    { name: 'AQUARIUM', floor: '#001a33', lightInt: 1.0, bg: '#000510', ambient: 0.5 },
    { name: 'LUXURY', floor: '#4a3500', lightInt: 1.2, bg: '#100a00', ambient: 0.6 },
    { name: 'ALCHEMY', floor: '#1a0033', lightInt: 0.9, bg: '#050010', ambient: 0.4 },
    { name: 'SPACE', floor: '#000000', lightInt: 0.6, bg: '#000000', ambient: 0.2 },
  ];
  const activeTheme = WORLD_THEMES[(level - 1) % WORLD_THEMES.length];

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
        <ambientLight intensity={activeTheme.ambient} />
        <directionalLight 
          ref={lightRef}
          position={[10, 10, 5]} 
          intensity={activeTheme.lightInt} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <pointLight position={[-10, -10, -10]} intensity={activeTheme.ambient} color="#00ffff" />
      </>
    );
  };

  return (
    <div className="w-full h-full relative">
      <Canvas shadows dpr={[1, 1.5]} onPointerDown={() => audio.init()}>
        <CameraController isPouring={pouringInto !== null} />
        <color attach="background" args={[activeTheme.bg]} />
        
        <Lighting />

      <Environment preset="warehouse" />

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
              isValidTarget={isValidTarget(i)}
              isInvalidShake={invalidShakeIndex === i}
              onClick={() => handleTubeClick(i)}
              positionX={startX + col * TUBE_SPACING}
              positionZ={startZ + row * TUBE_SPACING * 1.5}
            />
          );
        })}

        {/* Phase 6 & 9: Pour Stream Solver (Decoupled Lifecycle for Splash Decay) */}
        {streamData && (
          <VisualStreamController 
            active={streamData.active}
            sourcePos={getTubePos(streamData.source).add(new THREE.Vector3(0, TUBE_HEIGHT - 0.5, 0))}
            targetPos={getTubePos(streamData.target).add(new THREE.Vector3(0, TUBE_HEIGHT / 2, 0))}
            color={streamData.color}
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

        {/* Phase 23, 24 & 31: Mirror Floor & PBR Environment */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <MeshReflectorMaterial
            blur={[300, 100]}
            resolution={2048}
            mixBlur={1}
            mixStrength={80}
            roughness={0.2}
            depthScale={1.2}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.4}
            color={activeTheme.floor}
            metalness={0.6}
            mirror={0.8}
          />
        </mesh>
        
        {/* Subtle grid on the table to give it a laboratory feel */}
        <gridHelper args={[100, 100, 0x444455, 0x222233]} position={[0, -0.49, 0]} />
        
        <ContactShadows position={[0, -0.48, 0]} opacity={0.8} scale={20} blur={2.5} far={10} color="#000000" />
        
        {/* Phase 31: VFX Pooling (Atmospheric) */}
        <Sparkles count={150} scale={20} size={1.5} speed={0.2} opacity={0.3} color="#ffffff" />
        <Sparkles count={50} scale={15} size={2.5} speed={0.5} opacity={0.6} color="#00ffcc" position-y={2} />
      </group>

      {/* Phase 31: Cinematic Post-Processing */}
      <EffectComposer>
        <DepthOfField focusDistance={0.015} focalLength={0.05} bokehScale={3} height={480} />
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={1.5} />
        <Vignette eskil={false} offset={0.1} darkness={0.8} />
      </EffectComposer>

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
