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
    switch (theme) {
      case 'Neon': return 'radial-gradient(circle at 50% 120%, #290a3a 0%, #05010a 60%)';
      case 'Ocean': return 'radial-gradient(circle at 50% 120%, #0c325c 0%, #020b17 60%)';
      case 'Sunset': return 'radial-gradient(circle at 50% 120%, #521815 0%, #170504 60%)';
      case 'Minimal Dark': return 'radial-gradient(circle at 50% 120%, #202020 0%, #0a0a0a 60%)';
      case 'Minimal Light': return 'radial-gradient(circle at 50% 120%, #e0e0e0 0%, #f5f5f5 60%)';
      case 'Snow':
      case 'Winter': return 'radial-gradient(circle at 50% 120%, #2a3b4c 0%, #0f171e 60%)';
      case 'Autumn':
      case 'Forest': return 'radial-gradient(circle at 50% 120%, #2d1f11 0%, #0c0905 60%)';
      case 'Aurora': return 'radial-gradient(circle at 50% 120%, #0b3d36 0%, #020c1b 60%)';
      case 'Galaxy': return 'radial-gradient(circle at 50% 120%, #300c42 0%, #000000 70%)';
      case 'Candy': return 'radial-gradient(circle at 50% 120%, #ff85a2 0%, #ffc8dd 60%)';
      case 'Spring': return 'radial-gradient(circle at 50% 120%, #234f1e 0%, #0a1f0d 60%)';
      case 'Summer': return 'radial-gradient(circle at 50% 120%, #b58900 0%, #362900 60%)';
      case 'Holiday': return 'radial-gradient(circle at 50% 120%, #173b22 0%, #0d120e 60%)';
      case 'Festival': return 'radial-gradient(circle at 50% 120%, #470e0a 0%, #1a0503 60%)';
      case 'Crystal':
      default: return 'radial-gradient(circle at 50% 120%, #1a1b4b 0%, #050510 60%)';
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden transition-colors duration-1000"
      style={{
        background: getThemeBg()
      }}
    >
      {/* Background Parallax Stars/Bubbles */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#ffffff 2px, transparent 2px)', backgroundSize: '80px 80px', transform: 'translateY(-20px)' }} />

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
