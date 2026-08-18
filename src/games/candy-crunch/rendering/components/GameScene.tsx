import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, SoftShadows } from '@react-three/drei';
import * as THREE from 'three';
import { TileData } from '../../types';
import { CandyMesh } from './CandyMesh';
import { CandyExplosion } from './CandyExplosion';
import { useSpring, a } from '@react-spring/three';
import { useGameStore } from '../../engine/GameStore';
import { CameraController } from './CameraController';
import { WorldEnvironmentSystem } from './WorldEnvironmentSystem';

interface BoardTileProps {
  tile: TileData;
  x: number;
  y: number;
  isSelected: boolean;
  isAiSuggested: boolean;
  onClick: () => void;
}

const BoardTile: React.FC<BoardTileProps> = ({ tile, x, y, isSelected, isAiSuggested, onClick }) => {
  // Spring animation for smooth dropping and swapping
  const { position, scale } = useSpring({
    position: [x, y, 0],
    scale: isSelected ? [1.25, 1.25, 1.25] : isAiSuggested ? [1.15, 1.15, 1.15] : [1, 1, 1],
    config: { mass: 1, tension: 280, friction: 20 }
  });

  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + position.get()[0]) * 0.05;
      meshRef.current.rotation.y = Math.cos(state.clock.elapsedTime * 1.5 + position.get()[1]) * 0.08;
    }
  });

  return (
    <a.group ref={meshRef} position={position as any} scale={scale as any} onClick={(e) => { e.stopPropagation(); onClick(); }}>
      <CandyMesh tile={tile} />
    </a.group>
  );
};

interface GameSceneProps {
  board: TileData[][];
  selectedCell: { row: number; col: number } | null;
  aiSuggestedSwap: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  onTileClick: (row: number, col: number) => void;
  onTileDragSwap: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  isProcessing: boolean;
}

export const GameScene: React.FC<GameSceneProps> = ({ board, selectedCell, aiSuggestedSwap, onTileClick, onTileDragSwap, isProcessing }) => {
  const explosions = useGameStore(state => state.explosions);
  const removeExplosion = useGameStore(state => state.removeExplosion);

  const rows = board.length;
  const cols = board[0]?.length || 8;
  const maxDim = Math.max(rows, cols);
  const cameraZ = 10.5 + Math.max(0, maxDim - 8) * 1.35;

  const dragStart = useRef<{ row: number; col: number } | null>(null);

  const getPos = (r: number, c: number) => {
    const x = (c - (cols - 1) / 2) * 1.1;
    const y = ((rows - 1) / 2 - r) * 1.1;
    return { x, y };
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    if (isProcessing) return;
    if (e.object && e.object.userData && e.object.userData.row !== undefined) {
      dragStart.current = { row: e.object.userData.row, col: e.object.userData.col };
      onTileClick(e.object.userData.row, e.object.userData.col);
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    if (isProcessing || !dragStart.current) return;
    
    if (e.object && e.object.userData && e.object.userData.row !== undefined) {
      const endRow = e.object.userData.row;
      const endCol = e.object.userData.col;
      const start = dragStart.current;
      dragStart.current = null;
      if (start.row !== endRow || start.col !== endCol) {
        onTileDragSwap(start.row, start.col, endRow, endCol);
      }
    } else {
      dragStart.current = null;
    }
  };

  return (
    <div className="relative w-full max-w-[540px] aspect-square rounded-3xl overflow-hidden shadow-2xl border-4 border-amber-300/60 bg-gradient-to-b from-sky-900/80 via-indigo-900/90 to-purple-950/95 cursor-pointer touch-none select-none backdrop-blur-md">
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
      >
        <CameraController 
          boardCenter={[0, 0, 0]} 
          boardWidth={cols * 1.1} 
          boardHeight={rows * 1.1} 
          cameraShake={explosions.length > 2 ? 0.2 : 0} 
        />
        <WorldEnvironmentSystem theme="Candy Garden" isNight={false} />

        {/* Board Background */}
        <group>
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((_, c) => {
              const { x, y } = getPos(r, c);
              return (
                <mesh 
                  key={`bg-${r}-${c}`} 
                  position={[x, y, -0.3]} 
                  receiveShadow 
                  userData={{ row: r, col: c }}
                  onPointerDown={handlePointerDown}
                  onPointerUp={handlePointerUp}
                >
                  <planeGeometry args={[1.02, 1.02]} />
                  <meshStandardMaterial color={(r + c) % 2 === 0 ? 0xffffff : 0xf1f5f9} roughness={0.5} side={THREE.DoubleSide} />
                </mesh>
              );
            })
          )}
        </group>

        {/* Candies */}
        {board.map((rowArr, r) =>
          rowArr.map((tile, c) => {
            const { x, y } = getPos(r, c);
            const isSelected = selectedCell?.row === r && selectedCell?.col === c;
            const isAiSuggested = !!aiSuggestedSwap &&
              ((aiSuggestedSwap.fromRow === r && aiSuggestedSwap.fromCol === c) ||
                (aiSuggestedSwap.toRow === r && aiSuggestedSwap.toCol === c));

            return (
              <BoardTile
                key={tile.id}
                tile={tile}
                x={x}
                y={y}
                isSelected={isSelected}
                isAiSuggested={isAiSuggested}
                onClick={() => onTileClick(r, c)}
              />
            );
          })
        )}

        {/* Explosions */}
        {explosions.map((exp) => {
          const { x, y } = getPos(exp.row, exp.col);
          return (
            <CandyExplosion
              key={exp.id}
              position={[x, y, 0]}
              color={exp.colorHex}
              onComplete={() => removeExplosion(exp.id)}
            />
          );
        })}
      </Canvas>
      {aiSuggestedSwap && (
        <div className="absolute top-3 left-3 bg-amber-400/90 text-amber-950 font-bold px-3 py-1 rounded-full text-xs shadow-lg animate-pulse flex items-center gap-1.5 z-10">
          <span>✨ AI Hint Active</span>
        </div>
      )}
    </div>
  );
};
