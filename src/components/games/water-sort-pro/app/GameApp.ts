import * as PIXI from 'pixi.js';
import { TubeGraphics } from '../graphics/TubeGraphics';
import { LiquidGraphics } from '../graphics/LiquidGraphics';
import { AnimationSystem } from '../systems/AnimationSystem';
import { audioMixer } from '../audio/AudioMixer';
import { useGameState } from '../state/useGameState';
import { LiquidPhysics } from '../physics/LiquidPhysics';
import { ParticleSystem } from '../systems/ParticleSystem';
import { saveManager } from '../services/SaveManager';

export class GameApp {
  public app: PIXI.Application;
  public isInitialized = false;
  private container: HTMLDivElement;
  private tubes: PIXI.Container[] = [];
  private liquids: LiquidGraphics[] = [];
  private stateData: number[][] = [];
  
  // Layout metrics
  private tubeWidth = 60;
  private tubeHeight = 220;
  private gap = 30;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.app = new PIXI.Application();
  }

  async init() {
    await this.app.init({
      backgroundAlpha: 0,
      resizeTo: this.container,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });
    this.container.appendChild(this.app.canvas);
    this.isInitialized = true;
    
    // Background interaction to deselect
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
    this.app.stage.on('pointerdown', () => this.handleBackgroundClick());
  }

  public loadLevel(levelData: number[][]) {
    this.stateData = levelData.map(t => [...t]); // Deep copy
    this.drawScene();
  }

  private drawScene() {
    this.app.stage.removeChildren();
    this.tubes = [];
    this.liquids = [];

    const numTubes = this.stateData.length;
    const columns = Math.ceil(Math.sqrt(numTubes));
    const rows = Math.ceil(numTubes / columns);
    
    const { width, height } = this.app.screen;
    const gridW = columns * this.tubeWidth + (columns - 1) * this.gap;
    const gridH = rows * this.tubeHeight + (rows - 1) * this.gap * 2;
    
    const startX = (width - gridW) / 2;
    const startY = (height - gridH) / 2 + 30;

    this.stateData.forEach((colors, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = startX + col * (this.tubeWidth + this.gap);
      const y = startY + row * (this.tubeHeight + this.gap * 2);

      const tubeContainer = new PIXI.Container();
      tubeContainer.x = x;
      tubeContainer.y = y;
      
      const tubeGraphic = new TubeGraphics(this.tubeWidth, this.tubeHeight);
      const liquidGraphic = new LiquidGraphics(this.tubeWidth, this.tubeHeight, 4);
      liquidGraphic.updateLiquids(colors);
      
      LiquidPhysics.applyWaveEffect(liquidGraphic, this.app.ticker);

      tubeContainer.addChild(liquidGraphic, tubeGraphic);
      tubeContainer.eventMode = 'static';
      tubeContainer.cursor = 'pointer';
      tubeContainer.on('pointerdown', (e) => {
        e.stopPropagation();
        this.handleTubeClick(i);
      });

      this.app.stage.addChild(tubeContainer);
      this.tubes.push(tubeContainer);
      this.liquids.push(liquidGraphic);
    });
  }

  private handleTubeClick(index: number) {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon) return;

    audioMixer.init();

    if (s.selectedTube === -1) {
      if (this.stateData[index].length > 0) {
        s.setSelectedTube(index);
        audioMixer.playSelect();
        AnimationSystem.bounceSelection(this.tubes[index], this.tubes[index].y);
      }
    } else {
      if (s.selectedTube === index) {
        s.setSelectedTube(-1);
        audioMixer.playSelect();
        AnimationSystem.resetSelection(this.tubes[index], this.tubes[index].y);
      } else {
        this.attemptPour(s.selectedTube, index);
      }
    }
  }

  private handleBackgroundClick() {
    const s = useGameState.getState();
    if (s.selectedTube !== -1 && !s.isAnimating) {
      AnimationSystem.resetSelection(this.tubes[s.selectedTube], this.tubes[s.selectedTube].y);
      s.setSelectedTube(-1);
    }
  }

  private attemptPour(srcIdx: number, destIdx: number) {
    const s = useGameState.getState();
    const src = this.stateData[srcIdx];
    const dest = this.stateData[destIdx];
    
    const srcColor = src[src.length - 1];
    
    // Validate Pour
    if (dest.length < 4 && (dest.length === 0 || dest[dest.length - 1] === srcColor)) {
      let amount = 0;
      for (let i = src.length - 1; i >= 0; i--) {
        if (src[i] === srcColor) amount++;
        else break;
      }
      amount = Math.min(amount, 4 - dest.length);
      
      s.setAnimating(true);
      audioMixer.playPour();
      
      const sourceContainer = this.tubes[srcIdx];
      const destContainer = this.tubes[destIdx];
      
      AnimationSystem.animatePour(sourceContainer, destContainer, () => {
        // Logic Update
        for (let i = 0; i < amount; i++) {
          src.pop();
          dest.push(srcColor);
        }
        
        s.setMoves(s.moves + 1);
        this.liquids[srcIdx].updateLiquids(src);
        this.liquids[destIdx].updateLiquids(dest);
        
        s.setSelectedTube(-1);
        s.setAnimating(false);
        this.checkWinCondition();
      });
    } else {
      // Invalid, just swap selection
      AnimationSystem.resetSelection(this.tubes[srcIdx], this.tubes[srcIdx].y);
      if (dest.length > 0) {
        s.setSelectedTube(destIdx);
        audioMixer.playSelect();
        AnimationSystem.bounceSelection(this.tubes[destIdx], this.tubes[destIdx].y);
      } else {
        s.setSelectedTube(-1);
      }
    }
  }

  private checkWinCondition() {
    const won = this.stateData.every(t => t.length === 0 || (t.length === 4 && t.every(c => c === t[0])));
    if (won) {
      const s = useGameState.getState();
      s.setWon(true);
      s.setLevel(s.level + 1);
      audioMixer.playWin();
      ParticleSystem.createVictoryConfetti(this.app);
      saveManager.save(s.level + 1, s.score + 100);
    }
  }

  destroy() {
    if (this.app) {
      this.app.destroy({ removeView: true }, { children: true, texture: true });
    }
  }
}
