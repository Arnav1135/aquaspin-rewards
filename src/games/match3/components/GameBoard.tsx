// Enhanced Game Board Component with Premium Animations
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMatch3Store } from '@/games/match3/engine/gameState';
import { CandyType, Position } from '@/games/match3/types';
import { ParticleSystem } from '@/games/match3/components/ParticleSystem';
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

const CANDY_SHADOWS: Record<CandyType, string> = {
  [CandyType.EMPTY]: 'none',
  [CandyType.RED]: '0 8px 16px rgba(255, 107, 107, 0.4)',
  [CandyType.BLUE]: '0 8px 16px rgba(74, 144, 226, 0.4)',
  [CandyType.GREEN]: '0 8px 16px rgba(95, 187, 111, 0.4)',
  [CandyType.YELLOW]: '0 8px 16px rgba(255, 217, 61, 0.4)',
  [CandyType.PURPLE]: '0 8px 16px rgba(181, 101, 216, 0.4)',
  [CandyType.ORANGE]: '0 8px 16px rgba(255, 149, 0, 0.4)',
};

interface CandyProps {
  row: number;
  col: number;
  candyType: CandyType;
  isSelected: boolean;
  isMatched: boolean;
  onSwap: (pos1: Position, pos2: Position) => void;
  onSelect: (pos: Position) => void;
}

const Candy: React.FC<CandyProps> = ({
  row,
  col,
  candyType,
  isSelected,
  isMatched,
  onSwap,
  onSelect,
}) => {
  const candyRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onSelect({ row, col });
  };

  return (
    <motion.div
      ref={candyRef}
      className={`candy ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        backgroundColor: CANDY_COLORS[candyType],
        boxShadow: isSelected ? `0 0 20px ${CANDY_COLORS[candyType]}, ${CANDY_SHADOWS[candyType]}` : CANDY_SHADOWS[candyType],
        opacity: candyType === CandyType.EMPTY ? 0 : 1,
      }}
      initial={candyType !== CandyType.EMPTY ? { scale: 0.5, y: -30, opacity: 0 } : {}}
      animate={candyType !== CandyType.EMPTY ? { scale: 1, y: 0, opacity: 1 } : {}}
      exit={isMatched ? { scale: 0, opacity: 0 } : {}}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
        duration: 0.4,
      }}
      whileHover={candyType !== CandyType.EMPTY ? { scale: 1.08, y: -3 } : {}}
      whileTap={candyType !== CandyType.EMPTY ? { scale: 0.95 } : {}}
    >
      <div className="candy-inner">
        <span className="candy-emoji">{CANDY_EMOJIS[candyType]}</span>
        <div
          className="candy-shine"
          style={{
            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,${isHovered ? 0.4 : 0.2}), transparent)`,
          }}
        />
      </div>
      {isSelected && (
        <motion.div
          className="candy-selection-ring"
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
      )}
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
    currentLevel,
    swapCandies,
    canSwap,
    loadLevel,
    levelId,
  } = useMatch3Store();

  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [matchedPositions, setMatchedPositions] = useState<Set<string>>(new Set());
  const [particles, setParticles] = useState<Array<{ id: string; x: number; y: number; color: string }>>([]);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastScoreRef = useRef(score);

  useEffect(() => {
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

  // Spawn particles on score change
  useEffect(() => {
    if (score > lastScoreRef.current) {
      const diff = score - lastScoreRef.current;
      const newParticles = Array(Math.min(5, Math.floor(diff / 100)))
        .fill(null)
        .map((_, i) => ({
          id: `particle-${Date.now()}-${i}`,
          x: Math.random() * 100 - 50,
          y: Math.random() * 100 - 50,
          color: ['#FF6B6B', '#4A90E2', '#5FBB6F', '#FFD93D', '#B565D8'][Math.floor(Math.random() * 5)],
        }));
      setParticles(prev => [...prev, ...newParticles]);
      setTimeout(() => {
        setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
      }, 800);
      lastScoreRef.current = score;
    }
  }, [score]);

  const handleCandyClick = (row: number, col: number) => {
    if (gameStatus !== 'playing' || !board[row]?.[col]) return;

    if (selectedPos) {
      const distance = Math.abs(selectedPos.row - row) + Math.abs(selectedPos.col - col);
      
      if (distance === 1) {
        // Adjacent tile - attempt swap
        if (canSwap(selectedPos, { row, col })) {
          swapCandies(selectedPos, { row, col });
          
          // Create swap animation particles
          const centerX = (selectedPos.col + col) / 2 * 50 + 25;
          const centerY = (selectedPos.row + row) / 2 * 50 + 25;
          spawnMatchParticles(centerX, centerY, CANDY_COLORS[board[row][col].candyType]);
          
          setSelectedPos(null);
        } else {
          // Invalid swap - shake animation
          if (boardRef.current) {
            boardRef.current.style.animation = 'shake 0.4s';
            setTimeout(() => {
              if (boardRef.current) boardRef.current.style.animation = '';
            }, 400);
          }
          setSelectedPos({ row, col });
        }
      } else {
        // Different tile - just select it
        setSelectedPos({ row, col });
      }
    } else {
      setSelectedPos({ row, col });
    }
  };

  const spawnMatchParticles = (x: number, y: number, color: string) => {
    const newParticles = Array(8)
      .fill(null)
      .map((_, i) => ({
        id: `match-${Date.now()}-${i}`,
        x: Math.cos((i / 8) * Math.PI * 2) * 30,
        y: Math.sin((i / 8) * Math.PI * 2) * 30,
        color,
      }));
    
    setParticles(prev => [...prev, ...newParticles]);
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 600);
  };

  if (board.length === 0) {
    return (
      <div className="game-board loading">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          🍬
        </motion.div>
        <p>Loading level {levelId}...</p>
      </div>
    );
  }

  return (
    <div className="game-board-container">
      {/* Animated HUD */}
      <motion.div
        className="game-hud"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="hud-item">
          <span className="hud-label">Score</span>
          <motion.span
            className="hud-value"
            key={score}
            initial={{ scale: 1.3, y: -10 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            {score.toLocaleString()}
          </motion.span>
        </div>

        <div className="hud-item">
          <span className="hud-label">Moves</span>
          <motion.span
            className={`hud-value ${movesRemaining < 5 ? 'warning' : ''}`}
            key={movesRemaining}
            animate={movesRemaining < 5 ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: movesRemaining < 5 ? Infinity : 0, duration: 0.8 }}
          >
            {movesRemaining}
          </motion.span>
        </div>

        {currentLevel && (
          <div className="hud-item">
            <span className="hud-label">Objective</span>
            <span className="hud-objective">
              {currentLevel.objectiveType === 'score' && `${currentLevel.objectiveTarget} pts`}
              {currentLevel.objectiveType === 'jelly' && `${currentLevel.objectiveTarget} jelly`}
              {currentLevel.objectiveType === 'collect' && `${currentLevel.objectiveTarget} candies`}
            </span>
          </div>
        )}

        <AnimatePresence>
          {cascadeCount > 0 && (
            <motion.div
              className="hud-item combo-indicator"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <span className="combo-text">
                Combo ×{cascadeCount}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Game Board Grid */}
      <motion.div
        ref={boardRef}
        className="game-board"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
      >
        {board.map((row, rowIdx) =>
          row.map((cell, colIdx) => {
            const pos = `${rowIdx}-${colIdx}`;
            const isMatched = matchedPositions.has(pos);
            const isSelected =
              selectedPos?.row === rowIdx && selectedPos?.col === colIdx;

            return (
              <div
                key={pos}
                className={`board-cell ${isSelected ? 'selected' : ''}`}
                onClick={() => handleCandyClick(rowIdx, colIdx)}
              >
                {/* Cell background with gradient */}
                <div className="cell-bg" />

                {/* Obstacle rendering */}
                {cell.obstacle && (
                  <div
                    className={`obstacle obstacle-${cell.obstacle}`}
                    style={{
                      opacity: 0.9,
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    {cell.obstacle === 1 && '🍮'}
                    {cell.obstacle === 2 && '🍫'}
                    {cell.obstacle === 3 && '🖤'}
                    {cell.obstacle === 4 && '❄️'}
                  </div>
                )}

                {/* Candy rendering */}
                <Candy
                  row={rowIdx}
                  col={colIdx}
                  candyType={cell.candyType}
                  isSelected={isSelected}
                  isMatched={isMatched}
                  onSwap={() => {}}
                  onSelect={handleCandyClick}
                />

                {/* Match explosion effect */}
                <AnimatePresence>
                  {isMatched && (
                    <motion.div
                      className="match-explosion"
                      initial={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      ✨
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}

        {/* Particle System */}
        <ParticleSystem particles={particles} />
      </motion.div>

      {/* Game Status Overlay */}
      <AnimatePresence>
        {gameStatus !== 'playing' && (
          <motion.div
            className="game-status-overlay"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0 }}
          >
            {gameStatus === 'levelComplete' && (
              <motion.div
                className="status-content success"
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  className="status-emoji"
                  animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  🎉
                </motion.div>
                <h2>Level Complete!</h2>
                <p className="final-score">Score: {score.toLocaleString()}</p>
                <div className="star-rating">
                  {[1, 2, 3].map(i => (
                    <motion.span
                      key={i}
                      className="star"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: i * 0.2, type: 'spring' }}
                    >
                      ⭐
                    </motion.span>
                  ))}
                </div>
                <button
                  className="btn-next"
                  onClick={() => levelId < 60 ? loadLevel(levelId + 1) : null}
                >
                  {levelId < 60 ? 'Next Level' : 'Game Complete!'}
                </button>
              </motion.div>
            )}

            {gameStatus === 'levelFailed' && (
              <motion.div
                className="status-content fail"
                initial={{ scale: 0.5, y: 50 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <motion.div
                  className="status-emoji"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  😢
                </motion.div>
                <h2>Level Failed</h2>
                <p className="final-score">Score: {score.toLocaleString()}</p>
                <div className="button-group">
                  <button
                    className="btn-retry"
                    onClick={() => loadLevel(levelId)}
                  >
                    Retry
                  </button>
                  <button
                    className="btn-exit"
                    onClick={() => loadLevel(1)}
                  >
                    Exit
                  </button>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
