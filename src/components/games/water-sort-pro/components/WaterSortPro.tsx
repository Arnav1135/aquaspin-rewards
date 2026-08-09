import React, { useEffect, useRef } from 'react';
import { GameApp } from '../app/GameApp';
import { useGameState } from '../state/useGameState';
import { LevelGenerator } from '../levels/LevelGenerator';
import { saveManager } from '../services/SaveManager';
import { GameModeManager, GameMode } from '../core/GameModeManager';

import { WaterSortUI } from './WaterSortUI';
import { RegistryBootstrapper } from '../registries/RegistryBootstrapper';

RegistryBootstrapper.bootstrap();
interface Props {
  onClose: () => void;
}

export function WaterSortPro({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<GameApp | null>(null);
  const generationRequestRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const {
    level, setLevel, setScore, setWon, setDefeat, theme, colorBlindMode, quality,
    gameMode, timeRemaining, setTimeRemaining, isWon, isDefeat, isPaused
  } = useGameState();

  const SAFE_FALLBACK_LEVEL = [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [],
    []
  ];

  const clearGameTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startSpeedTimer = () => {
    clearGameTimer();
    if (GameModeManager.getCurrentMode() === GameMode.SPEED) {
      setTimeRemaining(GameModeManager.getStartingTime());
      
      timerRef.current = window.setInterval(() => {
        const state = useGameState.getState();
        if (state.isPaused || state.isWon || state.isDefeat) return;

        if (state.timeRemaining <= 1) {
          clearGameTimer();
          state.setTimeRemaining(0);
          state.setDefeat(true); // TIME UP!
        } else {
          state.setTimeRemaining(state.timeRemaining - 1);
        }
      }, 1000);
    }
  };

  const generateAndLoadLevel = (levelNumber: number, app: GameApp) => {
    const requestId = ++generationRequestRef.current;
    const mode = GameModeManager.getCurrentMode();
    const diff = GameModeManager.calculateDifficulty();
    const seed = mode === GameMode.DAILY ? GameModeManager.getDailySeed() : undefined;

    // Reset defeat and clear old timer before generation
    setDefeat(false);
    clearGameTimer();

    LevelGenerator.generateAsync(levelNumber, diff, seed)
      .then(levelData => {
        if (requestId === generationRequestRef.current && appRef.current === app) {
          app.loadLevel(levelData);
          startSpeedTimer();
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
      generationRequestRef.current += 1;
      clearGameTimer();
      app.destroy();
      if (appRef.current === app) appRef.current = null;
    };
  }, []);

  // When Level or Game Mode changes
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
  }, [level, gameMode]);

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
      setDefeat(false);
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
