// src/components/games/GameFrame.tsx
// ═══════════════════════════════════════════════════════════════════════════
// UNIVERSAL GAME VISIBILITY PROTECTION FRAME - NOW IN FULL 3D!
// ═══════════════════════════════════════════════════════════════════════════

import { type ReactNode, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Pause, Play, Volume2, VolumeX, RotateCcw,
  Maximize2, Minimize2, Trophy, MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { Html, Environment, PresentationControls, ContactShadows } from '@react-three/drei';

interface GameFrameProps {
  children: ReactNode;
  title: string;
  onClose: () => void;
  score?: number | string;
  lives?: number;
  level?: number | string;
  onRestart?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  showTopScrim?: boolean;
  showBottomScrim?: boolean;
  className?: string;
  canvasClassName?: string;
  isWarping?: boolean;
}

function ArcadeCabinet({ children, fullscreen }: { children: ReactNode, fullscreen: boolean }) {
  const group = useRef<THREE.Group>(null);
  
  // A gentle breathing/floating effect if not in fullscreen
  useFrame((state) => {
    if (group.current && !fullscreen) {
      group.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else if (group.current && fullscreen) {
      group.current.position.y = 0;
      group.current.rotation.set(0, 0, 0);
    }
  });

  return (
    <PresentationControls 
      global={!fullscreen} 
      config={{ mass: 2, tension: 500 }} 
      snap={{ mass: 4, tension: 1500 }} 
      rotation={[0, 0, 0]} 
      polar={fullscreen ? [0,0] : [-Math.PI / 12, Math.PI / 12]} 
      azimuth={fullscreen ? [0,0] : [-Math.PI / 6, Math.PI / 6]}
    >
      <group ref={group}>
        
        {/* Floating Screen Bezel */}
        <mesh position={[0, 0, -0.05]} castShadow receiveShadow>
          <boxGeometry args={[fullscreen ? 0 : 3.8, fullscreen ? 0 : 4.8, 0.1]} />
          <meshStandardMaterial color="#0A1428" metalness={0.8} roughness={0.2} />
        </mesh>
        
        {/* Glowing Rim */}
        {!fullscreen && (
          <mesh position={[0, 0, -0.06]}>
            <boxGeometry args={[3.85, 4.85, 0.05]} />
            <meshBasicMaterial color="#66bdf2" />
          </mesh>
        )}

        {/* HTML Projection (The actual game) */}
        <Html 
          transform 
          occlude 
          distanceFactor={fullscreen ? 1.05 : 1.45}
          position={[0, 0, 0]}
          style={{
            width: fullscreen ? '100vw' : '360px',
            height: fullscreen ? '100vh' : '460px',
            background: '#0D1B36',
            borderRadius: fullscreen ? '0px' : '16px',
            overflow: 'hidden',
            boxShadow: fullscreen ? 'none' : 'inset 0 0 20px rgba(0,0,0,0.8)'
          }}
        >
          {children}
        </Html>
      </group>
    </PresentationControls>
  );
}

export function GameFrame({
  children,
  title,
  onClose,
  score,
  lives,
  level,
  onRestart,
  soundEnabled = true,
  onToggleSound,
  showTopScrim = true,
  showBottomScrim = false,
  className,
  canvasClassName,
  isWarping = false,
}: GameFrameProps) {
  const [paused, setPaused] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const handlePause = () => setPaused(p => !p);

  // The 2D DOM Content that will be projected into the 3D Html block
  const TwoDimensionalGameContent = (
    <div
      className={cn(
        'relative w-full h-full flex flex-col',
        isWarping && 'level-warp-active warp-lines',
        className
      )}
    >
      {/* ── Top Scrim Bar ── */}
      {showTopScrim && (
        <div className="game-scrim-bar game-scrim-bar-top z-50 absolute top-0 left-0 right-0">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xs font-semibold tracking-wide truncate" style={{ color: 'rgba(245,248,252,0.90)' }}>
              {title}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: 'rgba(245,248,252,0.75)' }}>
            {score !== undefined && (
              <span className="flex items-center gap-1">
                <Trophy size={11} style={{ color: '#66bdf2' }} />
                <span style={{ color: '#66bdf2', fontWeight: 700 }}>{score}</span>
              </span>
            )}
            {level !== undefined && (
              <span className="opacity-80">Lv {level}</span>
            )}
            {lives !== undefined && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: Math.min(lives, 5) }).map((_, i) => (
                  <span key={i} style={{ color: '#7b8bc1', fontSize: '10px' }}>♥</span>
                ))}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            {onToggleSound && (
              <button className="game-control-btn" onClick={onToggleSound}>
                {soundEnabled ? <Volume2 size={14} strokeWidth={2} /> : <VolumeX size={14} strokeWidth={2} />}
              </button>
            )}
            {onRestart && (
              <button className="game-control-btn" onClick={onRestart}>
                <RotateCcw size={14} strokeWidth={2} />
              </button>
            )}
            <button className="game-control-btn" onClick={handlePause}>
              {paused ? <Play size={14} strokeWidth={2} /> : <Pause size={14} strokeWidth={2} />}
            </button>
            <button className="game-control-btn" onClick={() => setFullscreen(f => !f)}>
              {fullscreen ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
            </button>
            <button className="game-control-btn" onClick={onClose} style={{ background: 'rgba(247,108,108,0.25)', borderColor: 'rgba(247,108,108,0.35)' }}>
              <X size={14} strokeWidth={2} style={{ color: '#7b8bc1' }} />
            </button>
          </div>
        </div>
      )}

      {/* ── Game Canvas Area ── */}
      <div
        className={cn(
          'flex-1 relative w-full h-full',
          showTopScrim && 'pt-[44px]',
          showBottomScrim && 'pb-[44px]',
          canvasClassName
        )}
      >
        {children}

        {/* ── Pause Overlay ── */}
        <AnimatePresence>
          {paused && (
            <motion.div
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            >
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center" style={{ background: 'rgba(245,248,252,0.12)', border: '2px solid rgba(245,248,252,0.25)' }}>
                  <Pause size={28} style={{ color: '#FFFFFF' }} />
                </div>
                <p style={{ color: '#FFFFFF', fontWeight: 700, fontSize: '1.1rem' }}>Game Paused</p>
                <button className="game-control-btn mx-auto" onClick={handlePause} style={{ width: 44, height: 44 }}>
                  <Play size={18} strokeWidth={2} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* ── Optional Bottom Scrim ── */}
      {showBottomScrim && (
        <div className="game-scrim-bar game-scrim-bar-bottom absolute bottom-0 left-0 right-0 z-50">
          <div className="flex items-center justify-center w-full gap-2 text-xs" style={{ color: 'rgba(245,248,252,0.60)' }}>
            <MoreHorizontal size={14} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={cn(
      "w-full flex items-center justify-center overflow-hidden",
      fullscreen ? "fixed inset-0 z-[9999] bg-navy-900" : "relative h-[550px]"
    )}>
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} castShadow />
        <Environment preset="city" />
        
        <ArcadeCabinet fullscreen={fullscreen}>
          {TwoDimensionalGameContent}
        </ArcadeCabinet>

        {!fullscreen && <ContactShadows position={[0, -2.5, 0]} opacity={0.6} scale={10} blur={2} far={4} color="#000000" />}
      </Canvas>
    </div>
  );
}
