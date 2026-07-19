import * as PIXI from 'pixi.js';
import { CandyRenderer } from './visuals/CandyRenderer.js';
import { GameController } from './GameController.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Initialize PixiJS WebGL App
  const pixiApp = new PIXI.Application({
    width: 900,
    height: 900,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  window._pixiApp = pixiApp;

  // Insert Pixi canvas into the board-wrap alongside the old DOM board for smooth transition
  const boardWrap = document.getElementById('board-wrap');
  pixiApp.view.id = 'pixi-board';
  pixiApp.view.style.position = 'absolute';
  pixiApp.view.style.zIndex = '0';
  boardWrap.insertBefore(pixiApp.view, boardWrap.firstChild);

  try {
    await CandyRenderer.preload();
    window._game = new GameController();
  } catch (err) {
    console.error('Preload failed, starting fallback engine:', err);
    window._game = new GameController();
  }
});
