import React, { useEffect, useRef } from 'react';
import { GameApp } from '../app/GameApp';
import { useGameState } from '../state/useGameState';
import { LevelGenerator } from '../levels/LevelGenerator';
import { saveManager } from '../services/SaveManager';
import { GameModeManager, GameMode } from '../core/GameModeManager';

import { WaterSortUI } from './WaterSortUI';

interface Props {
  onClose: () => void;
}

export function WaterSortPro({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<GameApp | null>(null);
  const level = useGameState(state => state.level);
  const setLevel = useGameState(state => state.setLevel);
  const setScore = useGameState(state => state.setScore);
  const setWon = useGameState(state => state.setWon);
  const theme = useGameState(state => state.theme);
  const colorBlindMode = useGameState(state => state.colorBlindMode);
  const quality = useGameState(state => state.quality);

  const SAFE_FALLBACK_LEVEL = [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [],
    []
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize the AAA Engine
    const app = new GameApp(containerRef.current);
    appRef.current = app;
    
    app.init().then(async () => {
      // Load save data
      const saved = await saveManager.load();
      setLevel(saved.level);
      setScore(saved.score);

      try {
        // Start Level using GameMode logic
        const mode = GameModeManager.getCurrentMode();
        const diff = GameModeManager.calculateDifficulty();
        const seed = mode === GameMode.DAILY ? GameModeManager.getDailySeed() : undefined;
        
        const levelData = LevelGenerator.generate(saved.level, diff, seed);
        app.loadLevel(levelData);
      } catch (err) {
        console.error("Core Engine Failure: Level Generation Error", err);
        app.loadLevel(SAFE_FALLBACK_LEVEL); // Graceful degradation
      }
    }).catch(err => {
      console.error("Core Engine Failure: GameApp initialization failed", err);
    });

    return () => {
      app.destroy();
    };
  }, []); // Only init once, handle level changes internally

  // Listen for level changes
  useEffect(() => {
    if (appRef.current && appRef.current.isInitialized) {
      try {
        const mode = GameModeManager.getCurrentMode();
        const diff = GameModeManager.calculateDifficulty();
        const seed = mode === GameMode.DAILY ? GameModeManager.getDailySeed() : undefined;
        
        const levelData = LevelGenerator.generate(level, diff, seed);
        appRef.current.loadLevel(levelData);
      } catch (err) {
        console.error("Level Generation Error during transition", err);
        appRef.current.loadLevel(SAFE_FALLBACK_LEVEL);
      }
      setWon(false);
    }
  }, [level]);

  // Listen for visual setting changes
  useEffect(() => {
    if (appRef.current && appRef.current.isInitialized) {
      appRef.current.forceRedraw();
    }
  }, [colorBlindMode, quality, theme]);
  
  const handleUndo = () => {
    if (appRef.current) {
      appRef.current.undoLastMove();
    }
  };
  
  const handleRedo = () => {
    if (appRef.current) {
      appRef.current.redoLastMove();
    }
  };
  
  const handleHint = () => {
    if (appRef.current) {
      appRef.current.showHint();
    }
  };
  
  const handleAddTube = () => {
    if (appRef.current) {
      appRef.current.addExtraTube();
    }
  };
  
  const handleRestart = () => {
    if (appRef.current && appRef.current.isInitialized) {
      useGameState.getState().handleRestart(); // Penalize ELO and reset streak
      
      const mode = GameModeManager.getCurrentMode();
      const diff = GameModeManager.calculateDifficulty();
      const seed = mode === GameMode.DAILY ? GameModeManager.getDailySeed() : undefined;
      
      const levelData = LevelGenerator.generate(level, diff, seed);
      appRef.current.loadLevel(levelData);
      setWon(false);
    }
  };

  // Get background color based on theme
  const getThemeBg = () => {
    // User requested strictly off-white, light background permanently.
    return 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)';
  };

  return (
    <div className="w-full h-full relative overflow-hidden transition-colors duration-1000"
      style={{
        background: getThemeBg()
      }}
    >
      {/* PixiJS Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
      
      {/* High-Quality UI Overlay */}
      <WaterSortUI 
        onUndo={handleUndo}
        onRedo={handleRedo}
        onHint={handleHint}
        onAddTube={handleAddTube}
        onRestart={handleRestart}
        onCloseGame={onClose}
      />
    </div>
  );
}
