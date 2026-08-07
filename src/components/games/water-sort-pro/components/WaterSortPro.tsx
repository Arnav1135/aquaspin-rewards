import React, { useEffect, useRef } from 'react';
import { GameApp } from '../app/GameApp';
import { useGameState } from '../state/useGameState';
import { LevelGenerator } from '../levels/LevelGenerator';

interface Props {
  onClose: () => void;
}

export function WaterSortPro({ onClose }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<GameApp | null>(null);
  
  const level = useGameState(state => state.level);
  const setWon = useGameState(state => state.setWon);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Initialize the AAA Engine
    const app = new GameApp(containerRef.current);
    appRef.current = app;
    
    app.init().then(() => {
      // Start Level
      const levelData = LevelGenerator.generate(level);
      app.loadLevel(levelData);
    });

    return () => {
      app.destroy();
    };
  }, []); // Only init once, handle level changes internally

  // Listen for level changes
  useEffect(() => {
    if (appRef.current && appRef.current.isInitialized) {
      const levelData = LevelGenerator.generate(level);
      appRef.current.loadLevel(levelData);
      setWon(false);
    }
  }, [level]);

  return (
    <div className="w-full h-full relative bg-[#050510] overflow-hidden">
      {/* PixiJS Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 pointer-events-auto" />
      
      {/* UI Overlay will go here */}
      <div className="absolute top-4 left-4 text-white z-10 font-bold text-xl drop-shadow-md">
        Level {level}
      </div>
      
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full backdrop-blur-sm z-10 text-white transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </button>
    </div>
  );
}
