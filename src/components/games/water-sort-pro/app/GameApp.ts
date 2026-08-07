import * as PIXI from 'pixi.js';
import { TubeGraphics } from '../graphics/TubeGraphics';
import { LiquidGraphics } from '../graphics/LiquidGraphics';
import { AnimationSystem } from '../systems/AnimationSystem';
import { audioMixer } from '../audio/AudioMixer';
import { useGameState } from '../state/useGameState';
import { LiquidPhysics } from '../physics/LiquidPhysics';
import { ParticleSystem } from '../systems/ParticleSystem';
import { saveManager } from '../services/SaveManager';
import { LiquidFilter } from '../shaders/LiquidFilter';
import { Solver } from '../levels/Solver';

export class GameApp {
  public app: PIXI.Application;
  public isInitialized = false;
  private container: HTMLDivElement;
  private tubes: PIXI.Container[] = [];
  private liquids: LiquidGraphics[] = [];
  private stateData: number[][] = [];
  private moveHistory: { src: number, dest: number, amount: number, color: number }[] = [];
  private redoHistory: { src: number, dest: number, amount: number, color: number }[] = [];
  
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
    
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public loadLevel(levelData: number[][]) {
    this.stateData = levelData.map(t => [...t]); // Deep copy
    this.moveHistory = [];
    this.redoHistory = [];
    this.drawScene();
  }

  private drawScene() {
    this.app.stage.removeChildren();
    
    // Re-apply post processing and seasonal theme
    ParticleSystem.applyPostProcessing(this.app);
    ParticleSystem.createSeasonalParticles(this.app, useGameState.getState().theme);

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

      const liquidFilter = new LiquidFilter();
      tubeContainer.filters = [liquidFilter];
      this.app.ticker.add((ticker) => liquidFilter.updateTime(ticker.deltaTime));

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

  public forceRedraw() {
    this.drawScene();
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
        
        this.moveHistory.push({ src: srcIdx, dest: destIdx, amount, color: srcColor });
        this.redoHistory = []; // Clear redo history on new move
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

  public undoLastMove() {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon || this.moveHistory.length === 0) return;
    
    const lastMove = this.moveHistory.pop()!;
    const src = this.stateData[lastMove.src];
    const dest = this.stateData[lastMove.dest];
    
    // Reverse the logic
    for (let i = 0; i < lastMove.amount; i++) {
      dest.pop();
      src.push(lastMove.color);
    }
    
    s.setMoves(s.moves - 1);
    this.liquids[lastMove.src].updateLiquids(src);
    this.liquids[lastMove.dest].updateLiquids(dest);
    
    if (s.selectedTube !== -1) {
      AnimationSystem.resetSelection(this.tubes[s.selectedTube], this.tubes[s.selectedTube].y);
      s.setSelectedTube(-1);
    }
    
    this.redoHistory.push(lastMove);
  }

  public redoLastMove() {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon || this.redoHistory.length === 0) return;
    
    const nextMove = this.redoHistory.pop()!;
    this.attemptPour(nextMove.src, nextMove.dest);
  }

  public showHint() {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon) return;
    
    const hint = Solver.getHint(this.stateData);
    if (hint) {
      // Highlight the tubes momentarily
      AnimationSystem.bounceSelection(this.tubes[hint.src], this.tubes[hint.src].y);
      setTimeout(() => {
        AnimationSystem.bounceSelection(this.tubes[hint.dest], this.tubes[hint.dest].y);
      }, 300);
      
      // Auto-reset them if not selected by player
      setTimeout(() => {
        if (s.selectedTube !== hint.src) {
           AnimationSystem.resetSelection(this.tubes[hint.src], this.tubes[hint.src].y);
        }
        if (s.selectedTube !== hint.dest) {
           AnimationSystem.resetSelection(this.tubes[hint.dest], this.tubes[hint.dest].y);
        }
      }, 1500);
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
      saveManager.save({ level: s.level + 1, score: s.score + 100 });
    }
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 1-9 to select tubes
    if (e.key >= '1' && e.key <= '9') {
      const index = parseInt(e.key) - 1;
      if (index < this.tubes.length) {
        this.handleTubeClick(index);
      }
    }
    
    // U for Undo, R for Redo, H for Hint
    if (e.key.toLowerCase() === 'u' || (e.ctrlKey && e.key === 'z')) {
      this.undoLastMove();
    }
    if (e.key.toLowerCase() === 'r' || (e.ctrlKey && e.key === 'y')) {
      this.redoLastMove();
    }
    if (e.key.toLowerCase() === 'h') {
      this.showHint();
    }
  };

  destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    if (this.app) {
      this.app.destroy({ removeView: true }, { children: true, texture: true });
    }
  }
}
