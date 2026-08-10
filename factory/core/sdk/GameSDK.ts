export class GameSDK {
  /**
   * Scaffolds the standard Game SDK wrapper for a new game component.
   * This provides the unified `startGame`, `pauseGame`, `resumeGame`, `getStatistics` API 
   * required by the React host website.
   */
  public generateSDKWrapper(gameId: string): string {
    return `
import React, { useEffect, useImperativeHandle, forwardRef } from 'react';
import { Application } from 'pixi.js';

export interface GameSDKRef {
  startGame: () => void;
  pauseGame: () => void;
  resumeGame: () => void;
  restartGame: () => void;
  destroyGame: () => void;
  getStatistics: () => any;
}

export const ${gameId}Wrapper = forwardRef<GameSDKRef, any>((props, ref) => {
  useImperativeHandle(ref, () => ({
    startGame: () => console.log('Game Started'),
    pauseGame: () => console.log('Game Paused'),
    resumeGame: () => console.log('Game Resumed'),
    restartGame: () => console.log('Game Restarted'),
    destroyGame: () => console.log('Game Destroyed'),
    getStatistics: () => ({ score: 0 })
  }));

  return <div id="${gameId}-container" style={{ width: '100%', height: '100%' }} />;
});
`;
  }
}
