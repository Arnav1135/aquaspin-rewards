
import { CandyRenderer } from './visuals/CandyRenderer.js';
import { GameController } from './GameController.js';

const init = async () => {
  // Initialize PixiJS WebGL App
  const pixiApp = new PIXI.Application({
    width: 900,
    height: 900,
    backgroundAlpha: 0,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  window._pixiApp = pixiApp;

  // Insert Pixi canvas directly into the board so it renders over the background but under DOM overlays
  const boardEl = document.getElementById('board');
  pixiApp.view.id = 'pixi-board';
  pixiApp.view.style.position = 'absolute';
  pixiApp.view.style.top = '0';
  pixiApp.view.style.left = '0';
  pixiApp.view.style.zIndex = '5';
  pixiApp.view.style.width = '100%';
  pixiApp.view.style.height = '100%';
  pixiApp.view.style.pointerEvents = 'none';
  boardEl.appendChild(pixiApp.view);

  try {
    await CandyRenderer.preload();
    window._game = new GameController();
  } catch (err) {
    console.error('Preload failed, starting fallback engine:', err);
    window._game = new GameController();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
