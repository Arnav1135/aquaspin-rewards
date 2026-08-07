import * as PIXI from 'pixi.js';

export class GameApp {
  public app: PIXI.Application;
  public isInitialized = false;

  constructor(container: HTMLDivElement) {
    this.app = new PIXI.Application();
  }

  async init() {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: window,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    this.isInitialized = true;
  }

  loadLevel(levelData: number[][]) {
    // Scaffold
  }

  destroy() {
    if (this.app) {
      this.app.destroy({ removeView: true }, { children: true, texture: true });
    }
  }
}
