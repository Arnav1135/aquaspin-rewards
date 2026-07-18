import { CandyRenderer } from './visuals/CandyRenderer.js';
import { GameController } from './GameController.js';

document.addEventListener('DOMContentLoaded', () => {
  CandyRenderer.preload()
    .then(() => {
      window._game = new GameController();
    })
    .catch((err) => {
      console.error('Preload failed, starting fallback engine:', err);
      window._game = new GameController();
    });
});
