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
  const generationRequestRef = useRef(0);
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

  const generateAndLoadLevel = (levelNumber: number, app: GameApp) => {
    const requestId = ++generationRequestRef.current;
    const mode = GameModeManager.getCurrentMode();
    const diff = GameModeManager.calculateDifficulty();
    const seed = mode === GameMode.DAILY ? GameModeManager.getDailySeed() : undefined;

    LevelGenerator.generateAsync(levelNumber, diff, seed)
      .then(levelData => {
        // Ignore stale asynchronous results. This prevents a slower previous
        // level generation request from overwriting the newly selected level.
        if (requestId === generationRequestRef.current && appRef.current === app) {
          app.loadLevel(levelData);
        }
      })
      .catch(err => {
        console.error('Core Engine Failure: Level Generation Error', err);
        if (requestId === generationRequestRef.current && appRef.current === app) {
          app.loadLevel(SAFE_FALLBACK_LEVEL);
        }
      });
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new GameApp(containerRef.current);
    appRef.current = app;

    app.init().then(async () => {
      const saved = await saveManager.load();
      setLevel(saved.level);
      setScore(saved.score);

      try {
        generateAndLoadLevel(saved.level, app);
      } catch (err) {
        console.error('Core Engine Failure: Level Generation Request Error', err);
        if (appRef.current === app) app.loadLevel(SAFE_FALLBACK_LEVEL);
      }
    }).catch(err => {
      console.error('Core Engine Failure: GameApp initialization failed', err);
    });

    return () => {
      // Invalidate all pending generation promises before destroying the app.
      generationRequestRef.current += 1;
      app.destroy();
      if (appRef.current === app) appRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (appRef.current && appRef.current.isInitialized) {
      try {
        appRef.current.updateTheme(level);
        generateAndLoadLevel(level, appRef.current);
      } catch (err) {
        console.error('Level Generation Request Error during transition', err);
        appRef.current.loadLevel(SAFE_FALLBACK_LEVEL);
      }
      setWon(false);
    }
  }, [level]);

  useEffect(() => {
    if (appRef.current && appRef.current.isInitialized) {
      appRef.current.forceRedraw();
    }
  }, [colorBlindMode, quality, theme]);

  const handleUndo = () => {
    if (appRef.current) appRef.current.undoLastMove();
  };

  const handleRedo = () => {
    if (appRef.current) appRef.current.redoLastMove();
  };

  const handleHint = () => {
    if (appRef.current) appRef.current.showHint();
  };

  const handleAddTube = () => {
    if (appRef.current) appRef.current.addExtraTube();
  };

  const handleRestart = () => {
    if (appRef.current && appRef.current.isInitialized) {
      useGameState.getState().handleRestart();
      generateAndLoadLevel(level, appRef.current);
      setWon(false);
    }
  };

  const handleNextLevel = () => {
    setLevel(level + 1);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-transparent">
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      <WaterSortUI
        onUndo={handleUndo}
        onRedo={handleRedo}
        onHint={handleHint}
        onAddTube={handleAddTube}
        onRestart={handleRestart}
        onNextLevel={handleNextLevel}
        onCloseGame={onClose}
      />
    </div>
  );
}
