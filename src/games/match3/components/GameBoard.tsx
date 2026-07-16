// Main Game Board Component - Match-3 Game UI
import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useMatch3Store } from '@/games/match3/engine/gameState';
import { CandyType, Position } from '@/games/match3/types';
import './GameBoard.css';

const CANDY_COLORS: Record<CandyType, string> = {
  [CandyType.EMPTY]: 'transparent',
  [CandyType.RED]: '#FF6B6B',
  [CandyType.BLUE]: '#4A90E2',
  [CandyType.GREEN]: '#5FBB6F',
  [CandyType.YELLOW]: '#FFD93D',
  [CandyType.PURPLE]: '#B565D8',
  [CandyType.ORANGE]: '#FF9500',
};

const CANDY_EMOJIS: Record<CandyType, string> = {
  [CandyType.EMPTY]: '',
  [CandyType.RED]: '🍎',
  [CandyType.BLUE]: '🧊',
  [CandyType.GREEN]: '🍏',
  [CandyType.YELLOW]: '⭐',
  [CandyType.PURPLE]: '🍇',
  [CandyType.ORANGE]: '🧡',
};

interface CandyProps {
  row: number;
  col: number;
  candyType: CandyType;
  onSwap: (pos1: Position, pos2: Position) => void;
}

const Candy: React.FC<CandyProps> = ({ row, col, candyType, onSwap }) => {
  const [isSelected, setIsSelected] = useState(false);
  const { canSwap } = useMatch3Store();

  const handleClick = () => {
    // Drag/swap logic will be handled by parent, but for now just visual feedback
    setIsSelected(!isSelected);
  };

  return (
    <motion.div
      className="candy"
      style={{
        backgroundColor: CANDY_COLORS[candyType],
        opacity: candyType === CandyType.EMPTY ? 0 : 1,
      }}
      onClick={handleClick}
      initial={{ scale: 0.5, y: -20 }}
      animate={{ scale: isSelected ? 1.1 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="candy-emoji">{CANDY_EMOJIS[candyType]}</span>
      {isSelected && <div className="candy-selection-ring" />}
    </motion.div>
  );
};

interface GameBoardProps {
  onLevelComplete?: () => void;
  onLevelFailed?: () => void;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  onLevelComplete,
  onLevelFailed,
}) => {
  const {
    board,
    score,
    movesRemaining,
    gameStatus,
    cascadeCount,
    swapCandies,
    canSwap,
    loadLevel,
    levelId,
  } = useMatch3Store();

  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number }>>([]);

  useEffect(() => {
    // Load first level on mount
    if (board.length === 0) {
      loadLevel(1);
    }
  }, []);

  useEffect(() => {
    if (gameStatus === 'levelComplete' && onLevelComplete) {
      onLevelComplete();
    } else if (gameStatus === 'levelFailed' && onLevelFailed) {
      onLevelFailed();
    }
  }, [gameStatus]);

  const handleCandyClick = (row: number, col: number) => {
    if (selectedPos) {
      // Attempt swap
      if (
        canSwap(selectedPos, { row, col })
      ) {
        swapCandies(selectedPos, { row, col });
        setSelectedPos(null);

        // Spawn particles on swap
        setParticles([
          {
            id: `particle-${Date.now()}`,
            x: col * 50,
            y: row * 50,
          },
        ]);
      } else {
        setSelectedPos({ row, col });
      }
    } else {
      setSelectedPos({ row, col });
    }
  };

  if (board.length === 0) {
    return <div className="game-board loading">Loading level...</div>;
  }

  return (
    <div className="game-board-container">
      {/* HUD */}
      <div className="game-hud">
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <motion.span
            className="hud-value"
            key={score}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            {score}
          </motion.span>
        </div>
        <div className="hud-item">
          <span className="hud-label">Moves</span>
          <span className={`hud-value ${movesRemaining < 5 ? 'warning' : ''}`}>
            {movesRemaining}
          </span>
        </div>
        {cascadeCount > 0 && (
          <motion.div
            className="hud-item combo-indicator"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <span className="combo-text">Combo ×{cascadeCount}</span>
          </motion.div>
        )}
      </div>

      {/* Game Board Grid */}
      <div className="game-board">
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => (
            <div
              key={`${rowIdx}-${colIdx}`}
              className={`board-cell ${
                selectedPos?.row === rowIdx && selectedPos?.col === colIdx
                  ? 'selected'
                  : ''
              }`}
              onClick={() => handleCandyClick(rowIdx, colIdx)}
            >
              <Candy
                row={rowIdx}
                col={colIdx}
                candyType={cell.candyType}
                onSwap={() => {}}
              />
            </div>
          ))
        )}
      </div>

      {/* Status Overlay */}
      {gameStatus !== 'playing' && (
        <motion.div
          className="game-status-overlay"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {gameStatus === 'levelComplete' && (
            <div className="status-content success">
              <h2>Level Complete! 🎉</h2>
              <p>Score: {score}</p>
              <button onClick={() => loadLevel(levelId + 1)}>Next Level</button>
            </div>
          )}
          {gameStatus === 'levelFailed' && (
            <div className="status-content fail">
              <h2>Level Failed</h2>
              <p>Score: {score}</p>
              <button onClick={() => loadLevel(levelId)}>Retry</button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};
