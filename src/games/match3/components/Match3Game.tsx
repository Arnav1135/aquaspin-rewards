// Enhanced Match-3 Game Wrapper Component
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { GameBoard } from '@/games/match3/components/GameBoard';
import { useMatch3Store } from '@/games/match3/engine/gameState';
import './Match3Game.css';

interface Match3GameProps {
  onClose?: () => void;
}

export const Match3Game: React.FC<Match3GameProps> = ({ onClose }) => {
  const { levelId, gameStatus, loadLevel, resetLevel } = useMatch3Store();
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);

  useEffect(() => {
    // Initialize first level
    loadLevel(1);
  }, []);

  const handleLevelComplete = () => {
    // Auto-move to next level after 2 seconds
    setTimeout(() => {
      if (levelId < 60) {
        loadLevel(levelId + 1);
      }
    }, 2000);
  };

  const handleLevelFailed = () => {
    // Show retry prompt (handled in GameBoard)
  };

  return (
    <motion.div
      className="match3-game-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <motion.div
        className="match3-header"
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <div className="header-content">
          <div className="title-group">
            <motion.div
              className="game-logo"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              🍬
            </motion.div>
            <div className="title-text">
              <h1>Sweet Match</h1>
              <p>Level {levelId} of 60</p>
            </div>
          </div>

          <motion.div
            className="level-progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="progress-bar">
              <motion.div
                className="progress-fill"
                animate={{ width: `${(levelId / 60) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="progress-text">{Math.round((levelId / 60) * 100)}%</span>
          </motion.div>
        </div>

        <div className="header-controls">
          <motion.button
            className="control-btn settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings size={20} />
          </motion.button>

          <motion.button
            className="control-btn reset-btn"
            onClick={() => resetLevel()}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Restart level"
          >
            <RotateCcw size={20} />
          </motion.button>

          {onClose && (
            <motion.button
              className="control-btn close-btn"
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.95 }}
            >
              <X size={20} />
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="settings-panel"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h3>Settings</h3>
            <div className="setting-item">
              <label>Sound Effects</label>
              <motion.button
                className={`toggle-btn ${soundEnabled ? 'active' : ''}`}
                onClick={() => setSoundEnabled(!soundEnabled)}
                whileTap={{ scale: 0.95 }}
              >
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </motion.button>
            </div>
            <div className="setting-item">
              <label>Background Music</label>
              <motion.button
                className={`toggle-btn ${musicEnabled ? 'active' : ''}`}
                onClick={() => setMusicEnabled(!musicEnabled)}
                whileTap={{ scale: 0.95 }}
              >
                {musicEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Board */}
      <motion.div
        className="game-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
      >
        <GameBoard
          onLevelComplete={handleLevelComplete}
          onLevelFailed={handleLevelFailed}
        />
      </motion.div>

      {/* Footer */}
      <motion.div
        className="match3-footer"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ type: 'spring', stiffness: 300 }}
      >
        <p className="footer-text">💡 Tip: Match 4+ for special candies • Combine specials for mega effects!</p>
        <div className="footer-badges">
          <span className="badge">🎮 Play</span>
          <span className="badge">🏆 Challenge</span>
          <span className="badge">⭐ Earn Stars</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Match3Game;
