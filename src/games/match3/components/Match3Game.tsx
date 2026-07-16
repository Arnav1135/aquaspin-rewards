// Main Match-3 Game Component
import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameBoard } from '@/games/match3/components/GameBoard';
import { useMatch3Store } from '@/games/match3/engine/gameState';
import './Match3Game.css';

interface Match3GameProps {
  onClose?: () => void;
}

export const Match3Game: React.FC<Match3GameProps> = ({ onClose }) => {
  const { levelId, gameStatus } = useMatch3Store();

  const handleLevelComplete = () => {
    // Handle level complete - move to next level after delay
    setTimeout(() => {
      // Next level will be loaded in GameBoard
    }, 2000);
  };

  const handleLevelFailed = () => {
    // Handle level failed
  };

  return (
    <motion.div
      className="match3-game-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header */}
      <div className="match3-header">
        <div className="match3-title">
          <h1>🍬 Candy Crush</h1>
          <p>Level {levelId}</p>
        </div>
        {onClose && (
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        )}
      </div>

      {/* Game Board */}
      <GameBoard
        onLevelComplete={handleLevelComplete}
        onLevelFailed={handleLevelFailed}
      />

      {/* Footer */}
      <div className="match3-footer">
        <p className="footer-text">Match 3+ candies to clear them</p>
      </div>
    </motion.div>
  );
};

export default Match3Game;
