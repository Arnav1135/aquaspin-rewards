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
import { PerformanceManager } from '../systems/PerformanceManager';
import { ThemeManager } from '../systems/ThemeManager';

export class GameApp {
  public app: PIXI.Application;
  public isInitialized = false;
  private container: HTMLDivElement;
  private tubes: PIXI.Container[] = [];
  private liquids: LiquidGraphics[] = [];
  private tubeGraphics: TubeGraphics[] = [];
  private stateData: number[][] = [];
  private moveHistory: { src: number, dest: number, amount: number, color: number }[] = [];
  private redoHistory: { src: number, dest: number, amount: number, color: number }[] = [];
  private performanceManager!: PerformanceManager;
  private interactionLock: boolean = false;
  
  // Layout metrics
  private tubeWidth = 60;
  private tubeHeight = 220;
  private gap = 30;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.app = new PIXI.Application();
  }

  private handleResize = () => {
    // Debounce resize to prevent too many redraws
    if ((this as any)._resizeTimeout) {
      clearTimeout((this as any)._resizeTimeout);
    }
    (this as any)._resizeTimeout = setTimeout(() => {
      if (this.isInitialized && this.stateData.length > 0) {
        this.drawScene();
      }
    }, 100);
  };

  async init() {
    await this.app.init({
      backgroundAlpha: 1, // Opaque to use PixiJS dynamic theme background
      resizeTo: this.container,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2), // Clamp DPR for performance
      autoDensity: true
    });
    this.container.appendChild(this.app.canvas);
    this.isInitialized = true;
    
    // Start Performance Manager
    this.performanceManager = new PerformanceManager(this.app);
    
    // Background interaction to deselect
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = new PIXI.Rectangle(0, 0, 10000, 10000);
    this.app.stage.on('pointerdown', () => this.handleBackgroundClick());
    
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('VFX_SPLASH', (e: any) => this.renderSplashVFX(e.detail.x, e.detail.y));
    
    // Initialize Theme
    ThemeManager.setTheme(useGameState.getState().theme, this.app);
    this.app.ticker.add((ticker) => {
      ThemeManager.updateTransition(this.app, ticker.deltaTime);
    });
  }
  
  private renderSplashVFX(x: number, y: number) {
    const splashCount = useGameState.getState().quality === 'Ultra' ? 15 : 5;
    for (let i = 0; i < splashCount; i++) {
      const p = new PIXI.Graphics();
      p.circle(0, 0, Math.random() * 3 + 1);
      p.fill({ color: 0xFFFFFF, alpha: 0.6 });
      p.x = x + (Math.random() - 0.5) * 20;
      p.y = y;
      
      this.app.stage.addChild(p);
      
      const vx = (Math.random() - 0.5) * 60;
      const vy = -(Math.random() * 40 + 20);
      
      // We don't have GSAP imported in this file directly, so we can use a quick ticker
      let life = 1.0;
      const animate = () => {
        p.x += vx * 0.016;
        p.y += vy * 0.016 + 2; // gravity
        p.alpha = life;
        life -= 0.05;
        if (life <= 0) {
          this.app.ticker.remove(animate);
          p.destroy();
        }
      };
      this.app.ticker.add(animate);
    }
  }

  private boardContainer = new PIXI.Container();

  public updateTheme(level: number) {
    const theme = ThemeManager.getThemeForLevel(level);
    ThemeManager.setTheme(theme.id, this.app);
    useGameState.getState().setTheme(theme.id);
  }

  public loadLevel(levelData: number[][]) {
    this.stateData = levelData.map(t => [...t]); // Deep copy
    this.moveHistory = [];
    this.redoHistory = [];
    
    // Slide off existing board, then draw and slide in new board
    // In a real seamless transition, we'd swap containers, but for now
    // we fade the current board out and back in
    if (this.boardContainer.children.length > 0) {
      import('gsap').then(gsap => {
        gsap.default.to(this.boardContainer, { x: -1000, alpha: 0, duration: 0.3, ease: 'power2.in', onComplete: () => {
          this.drawScene();
          this.boardContainer.x = 1000;
          
          const { width, height } = this.app.screen;
          const numTubes = this.stateData.length;
          let columns, rows;
          if (numTubes <= 5) {
            columns = numTubes;
            rows = 1;
          } else if (numTubes <= 10) {
            columns = Math.ceil(numTubes / 2);
            rows = 2;
          } else {
            columns = Math.ceil(Math.sqrt(numTubes));
            rows = Math.ceil(numTubes / columns);
          }
          const gridW = columns * this.tubeWidth + (columns - 1) * this.gap;
          const scale = this.boardContainer.scale.x;
          
          const targetX = (width - gridW * scale) / 2;
          gsap.default.to(this.boardContainer, { x: targetX, alpha: 1, duration: 0.4, ease: 'power3.out' });
        }});
      });
    } else {
      this.drawScene();
    }
  }

  private drawScene() {
    // We do NOT remove children from app.stage anymore. We only update boardContainer.
    if (!this.boardContainer.parent) {
      this.app.stage.addChild(this.boardContainer);
    }
    
    // Background and seasonal particles can remain active globally
    try {
      ParticleSystem.applyPostProcessing(this.app);
    } catch (err) {
      console.warn("Post-processing failed, falling back to basic rendering", err);
    }
    
    try {
      ParticleSystem.createSeasonalParticles(this.app, useGameState.getState().theme);
    } catch (err) {
      console.warn("Particle system failed, disabling particles", err);
    }

    const numTubes = this.stateData.length;
    // Fallback if data is malformed
    if (numTubes === 0) return;

    let columns, rows;
    if (numTubes <= 5) {
      columns = numTubes;
      rows = 1;
    } else if (numTubes <= 10) {
      columns = Math.ceil(numTubes / 2);
      rows = 2;
    } else {
      columns = Math.ceil(Math.sqrt(numTubes));
      rows = Math.ceil(numTubes / columns);
    }
    
    const { width, height } = this.app.screen;
    const gridW = columns * this.tubeWidth + (columns - 1) * this.gap;
    const gridH = rows * this.tubeHeight + (rows - 1) * this.gap * 2;
    
    // Responsive scaling
    const marginX = 40;
    const marginY = 120; // Leave room for UI
    const scaleX = (width - marginX) / gridW;
    const scaleY = Math.max(0.1, (height - marginY) / gridH);
    const scale = Math.max(0.2, Math.min(1, scaleX, scaleY)); // Ensure scale is always positive and not zero
    
    this.boardContainer.scale.set(scale);
    
    // Center the scaled board (Only if not animating)
    if (this.boardContainer.alpha === 1 || this.boardContainer.alpha === undefined) {
       this.boardContainer.x = (width - gridW * scale) / 2;
    }
    this.boardContainer.y = (height - gridH * scale) / 2 + 20;

    // Object Pooling
    // Hide all tubes initially
    this.tubes.forEach(t => t.visible = false);

    this.stateData.forEach((colors, i) => {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = col * (this.tubeWidth + this.gap);
      const y = row * (this.tubeHeight + this.gap * 2);

      let tubeContainer;
      let liquidGraphic;
      let tubeGraphic;

      if (i < this.tubes.length) {
        // Reuse existing
        tubeContainer = this.tubes[i];
        liquidGraphic = this.liquids[i];
        tubeGraphic = this.tubeGraphics[i];
        tubeContainer.visible = true;
      } else {
        // Create new
        tubeContainer = new PIXI.Container();
        tubeGraphic = new TubeGraphics(this.tubeWidth, this.tubeHeight);
        liquidGraphic = new LiquidGraphics(this.tubeWidth, this.tubeHeight, 4);
        
        try {
          LiquidPhysics.applyWaveEffect(liquidGraphic, this.app.ticker);
        } catch (err) {
          console.warn("Liquid physics failed", err);
        }

        tubeContainer.addChild(liquidGraphic, tubeGraphic);
        tubeContainer.eventMode = 'static';
        tubeContainer.cursor = 'pointer';
        tubeContainer.on('pointerdown', (e) => {
          e.stopPropagation();
          this.handleTubeClick(i);
        });

        this.boardContainer.addChild(tubeContainer);
        this.tubes.push(tubeContainer);
        this.liquids.push(liquidGraphic);
        this.tubeGraphics.push(tubeGraphic);
      }

      tubeContainer.x = x;
      tubeContainer.y = y;
      
      // Reset logic state for the tube
      AnimationSystem.resetSelection(tubeContainer, y);
      tubeGraphic.setHighlight(false);
      liquidGraphic.updateLiquids(colors);
    });
  }

  public forceRedraw() {
    this.drawScene();
  }

  private handleTubeClick(index: number) {
    if (this.interactionLock) return;
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon) return;

    audioMixer.init();
    
    // Calculate simple stereo pan (-1 to 1) based on tube X position relative to screen center
    const width = this.app.screen.width;
    const getPan = (i: number) => {
      if (!this.tubes[i]) return 0;
      return ((this.tubes[i].x + this.tubeWidth/2) / width) * 2 - 1;
    };

    if (s.selectedTube === -1) {
      if (this.stateData[index].length > 0) {
        s.setSelectedTube(index);
        audioMixer.playSelect(getPan(index));
        AnimationSystem.bounceSelection(this.tubes[index], this.tubes[index].y);
        
        const srcColor = this.stateData[index][this.stateData[index].length - 1];
        const activeTheme = ThemeManager.getTheme(s.theme);
        const hexColor = activeTheme.liquidPalette[srcColor % activeTheme.liquidPalette.length];
        this.tubeGraphics[index].setHighlight(true, hexColor);
      }
    } else {
      if (s.selectedTube === index) {
        s.setSelectedTube(-1);
        audioMixer.playSelect(getPan(index));
        AnimationSystem.resetSelection(this.tubes[index], this.tubes[index].y);
        this.tubeGraphics[index].setHighlight(false);
      } else {
        this.attemptPour(s.selectedTube, index, getPan(s.selectedTube), getPan(index));
      }
    }
  }

  private handleBackgroundClick() {
    const s = useGameState.getState();
    if (s.selectedTube !== -1 && !s.isAnimating) {
      AnimationSystem.resetSelection(this.tubes[s.selectedTube], this.tubes[s.selectedTube].y);
      this.tubeGraphics[s.selectedTube].setHighlight(false);
      s.setSelectedTube(-1);
    }
  }

  private attemptPour(srcIdx: number, destIdx: number, sourcePan: number, destPan: number) {
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
      // Calculate target fullness ratio (final fullness)
      const targetFullnessRatio = Math.min(4, dest.length + amount) / 4;
      audioMixer.playPour(sourcePan, destPan, targetFullnessRatio);
      
      const sourceContainer = this.tubes[srcIdx];
      const destContainer = this.tubes[destIdx];
      
      const activeTheme = ThemeManager.getTheme(s.theme);
      const hexColor = activeTheme.liquidPalette[srcColor % activeTheme.liquidPalette.length];
      
      const srcLenBefore = src.length;
      const destLenBefore = dest.length;
      const srcColorsBefore = [...src];
      
      // Pre-calculate logic update for destination array colors
      for (let i = 0; i < amount; i++) {
        src.pop();
        dest.push(srcColor);
      }
      
      const destColorsFinal = [...dest];
      
      const numTubes = this.stateData.length;
      let cols;
      if (numTubes <= 5) cols = numTubes;
      else if (numTubes <= 10) cols = Math.ceil(numTubes / 2);
      else cols = Math.ceil(Math.sqrt(numTubes));
      
      const srcCol = srcIdx % cols;
      const srcRow = Math.floor(srcIdx / cols);
      const startX = srcCol * (this.tubeWidth + this.gap);
      const startY = srcRow * (this.tubeHeight + this.gap * 2);

      this.interactionLock = true;
      AnimationSystem.animatePour(
        sourceContainer, 
        destContainer,
        hexColor,
        this.liquids[srcIdx],
        this.liquids[destIdx],
        amount,
        srcLenBefore,
        destLenBefore,
        srcColorsBefore,
        destColorsFinal,
        startX,
        startY,
        () => {
          this.interactionLock = false;
        this.moveHistory.push({ src: srcIdx, dest: destIdx, amount, color: srcColor });
        this.redoHistory = []; // Clear redo history on new move
        s.setMoves(s.moves + 1);
        
        this.liquids[srcIdx].updateLiquids(src);
        this.liquids[destIdx].updateLiquids(dest);

        // Check if destination tube was just completed
        if (dest.length === 4 && dest.every(c => c === dest[0])) {
          AnimationSystem.triggerLevelComplete([this.tubes[destIdx]]);
          audioMixer.playToneWithPan(600, 'sine', 0.2, 0.1, destPan);
        }
        
        s.setSelectedTube(-1);
        s.setAnimating(false);
        this.checkWinCondition();
      },
      () => {
        audioMixer.playDrop(destPan, targetFullnessRatio);
      });
    } else {
      // Invalid Pour (full or color mismatch)
      audioMixer.playInvalidMove();
      this.interactionLock = true;
      AnimationSystem.animateShake(this.tubes[srcIdx], this.tubes[srcIdx].x, this.tubes[srcIdx].y, () => {
        this.interactionLock = false;
      });
      this.tubeGraphics[srcIdx].setHighlight(false);
      s.setSelectedTube(-1);
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
    
    const width = this.app.screen.width;
    const getPan = (i: number) => {
      if (!this.tubes[i]) return 0;
      return ((this.tubes[i].x + this.tubeWidth/2) / width) * 2 - 1;
    };
    
    this.attemptPour(nextMove.src, nextMove.dest, getPan(nextMove.src), getPan(nextMove.dest));
  }

  public showHint() {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon) return;
    
    // Lazy-import HintEngine to avoid circular dependency issues at boot
    import('../core/HintEngine').then(({ HintEngine }) => {
      // Build dummy GameState for the hint engine
      const dummyState = {
        levelId: 'dummy',
        generatorVersion: '1',
        seed: '1',
        tubes: this.stateData.map(t => [...t]),
        tubeCapacity: 4,
        selectedTube: null,
        moveHistory: [],
        undoStack: [],
        redoStack: [],
        moveCount: 0,
        elapsedTime: 0,
        hintsUsed: 0,
        undosUsed: 0,
        status: 'IDLE' as any
      };
      
      const hint = HintEngine.getHint(dummyState, 3); // Level 3 hint (explanation)
      
      if (hint.recommendedMove) {
        // Highlight the tubes momentarily
        AnimationSystem.bounceSelection(this.tubes[hint.recommendedMove.source], this.tubes[hint.recommendedMove.source].y);
        setTimeout(() => {
          AnimationSystem.bounceSelection(this.tubes[hint.recommendedMove!.destination], this.tubes[hint.recommendedMove!.destination].y);
        }, 300);
        
        // Auto-reset them if not selected by player
        setTimeout(() => {
          if (s.selectedTube !== hint.recommendedMove!.source) AnimationSystem.resetSelection(this.tubes[hint.recommendedMove!.source], this.tubes[hint.recommendedMove!.source].y);
          if (s.selectedTube !== hint.recommendedMove!.destination) AnimationSystem.resetSelection(this.tubes[hint.recommendedMove!.destination], this.tubes[hint.recommendedMove!.destination].y);
        }, 1000);
        
        // Push explanation to UI
        if (hint.explanation) {
          s.setActiveHint({
            message: hint.explanation,
            source: hint.recommendedMove.source,
            dest: hint.recommendedMove.destination
          });
          
          // Clear hint after 5 seconds
          setTimeout(() => {
            if (useGameState.getState().activeHint?.message === hint.explanation) {
              useGameState.getState().setActiveHint(null);
            }
          }, 5000);
        }
      } else {
        audioMixer.playSelect(); // Play an error/dud sound
      }
    });
  }

  public addExtraTube() {
    const s = useGameState.getState();
    if (s.isAnimating || s.isWon) return;
    
    // Check if we already have too many empty tubes (optional limit, e.g. max 3 empty tubes)
    const emptyTubes = this.stateData.filter(t => t.length === 0).length;
    if (emptyTubes >= 3) return; 

    // Add an empty array to stateData
    this.stateData.push([]);
    this.drawScene(); // Redraw the whole grid to fit the new tube
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
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('VFX_SPLASH', this.renderSplashVFX as any);
    
    if ((this as any)._resizeTimeout) {
      clearTimeout((this as any)._resizeTimeout);
    }
    
    if (this.app) {
      this.app.destroy({ removeView: true }, { children: true, texture: true });
    }
  }
}
