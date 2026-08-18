import React, { useEffect, useRef } from 'react';
import { GameRenderer } from '../GameRenderer';
import { TileData } from '../../types';

interface AdvancedCandyRendererProps {
  board: TileData[][];
  selectedCell: { row: number; col: number } | null;
  aiSuggestedSwap: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  onTileClick: (row: number, col: number) => void;
  onTileDragSwap: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  isProcessing: boolean;
}

export const AdvancedCandyRenderer = React.memo(({
  board,
  selectedCell,
  aiSuggestedSwap,
  onTileClick,
  onTileDragSwap,
  isProcessing,
}: AdvancedCandyRendererProps) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const dragStartCell = useRef<{ row: number; col: number } | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const renderer = new GameRenderer(mountRef.current, 'AUTO');
    rendererRef.current = renderer;

    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    // We only call this when selectedCell or aiSuggestedSwap change.
    // The EventBus inside GameRenderer handles 'board' updates autonomously!
    if (rendererRef.current && board.length > 0) {
      rendererRef.current.renderBoard(board);
    }
  }, [selectedCell, aiSuggestedSwap]); 
  // Deliberately removed 'board' from deps so React doesn't force a Three.js re-sync on every cascade frame.


  // Input Handling Layer
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isProcessing) return;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const col = Math.floor((x / rect.width) * cols);
    const row = Math.floor((y / rect.height) * rows);

    if (row >= 0 && row < rows && col >= 0 && col < cols) {
      dragStartCell.current = { row, col };
      onTileClick(row, col);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragStartCell.current || isProcessing) return;
    
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const currentCol = Math.floor((x / rect.width) * cols);
    const currentRow = Math.floor((y / rect.height) * rows);

    const start = dragStartCell.current;
    const dr = Math.abs(currentRow - start.row);
    const dc = Math.abs(currentCol - start.col);

    if ((dr === 1 && dc === 0) || (dr === 0 && dc === 1)) {
      onTileDragSwap(start.row, start.col, currentRow, currentCol);
      dragStartCell.current = null; 
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!dragStartCell.current || isProcessing) return;
    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cols = board[0].length;
    const rows = board.length;

    const endCol = Math.floor((x / rect.width) * cols);
    const endRow = Math.floor((y / rect.height) * rows);

    const start = dragStartCell.current;
    dragStartCell.current = null;

    if (
      (start.row !== endRow || start.col !== endCol) &&
      endRow >= 0 && endRow < rows &&
      endCol >= 0 && endCol < cols
    ) {
      onTileDragSwap(start.row, start.col, endRow, endCol);
    }
  };

  return (
    <div
      ref={mountRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className="relative w-full max-w-[540px] aspect-square rounded-3xl overflow-hidden shadow-2xl cursor-pointer touch-none select-none"
    >
      {/* 2D/3D Overlay sparkles & AI suggestion indicator */}
      {aiSuggestedSwap && (
        <div className="absolute top-3 left-3 bg-amber-400/90 text-amber-950 font-bold px-3 py-1 rounded-full text-xs shadow-lg animate-pulse flex items-center gap-1.5 z-10">
          <span>✨ AI Hint Active</span>
        </div>
      )}
    </div>
  );
});
