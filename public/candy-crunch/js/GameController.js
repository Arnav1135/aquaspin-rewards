import { Board } from './core/Board.js';
import { MatchDetector } from './core/MatchDetector.js';
import { GravityEngine } from './core/GravityEngine.js';
import { BlockerSystem } from './core/BlockerSystem.js';
import { Spawner } from './ai/Spawner.js';
import { LevelGen } from './ai/LevelGen.js';
import { SolvabilityValidator } from './ai/Solvability.js';
import { FishAI } from './ai/FishAI.js';
import { HintSystem } from './ai/HintSystem.js';
import { EventQueue, CascadePredictor } from './core/EventQueue.js';
import { ParticleSystem, VisualEffects } from './visuals/AnimationEngine.js';
import * as PIXI from 'pixi.js';
import gsap from 'gsap';
import { idbStore } from './core/idbStore.js';
import { COLORS, COLOR_PALETTE, CELL_TYPES, CANDY_TYPES, BLOCKER_TYPES, LAYER_TYPES, ANIM } from './core/Constants.js';

const STATE = {
  IDLE: 'IDLE',
  SWAP: 'SWAP',
  MATCH: 'MATCH',
  CASCADE: 'CASCADE',
  WIN: 'WIN',
  FAIL: 'FAIL'
};

export class GameController {
  constructor() {
    this.boardEl = document.getElementById('board');
    this.scoreEl = document.getElementById('display-score');
    this.levelEl = document.getElementById('display-level');
    this.targetEl = document.getElementById('display-target');
    this.movesEl = document.getElementById('display-moves');
    this.progressEl = document.getElementById('progress-fill');
    this.objText = document.getElementById('obj-text');
    this.modalEl = document.getElementById('game-modal');
    this.modalTitle = document.getElementById('modal-title');
    this.modalBody = document.getElementById('modal-body');
    this.modalBtn = document.getElementById('modal-btn');
    this.modalScore = document.getElementById('modal-score');
    this.modalStars = document.getElementById('modal-stars');
    
    // Pixi setup
    this.pixiApp = window._pixiApp;
    this.boardContainer = new PIXI.Container();
    this.pixiApp.stage.addChild(this.boardContainer);

    this.levelGen = new LevelGen();
    this.eventQueue = new EventQueue(this);

    this.gameState = STATE.IDLE;
    this.snapshots = []; // For Undo system

    this.levelNum = 1;
    this.score = 0;
    this.moves = 0;
    this.config = null;
    this.board = null;
    this.cellSize = 0;
    this.isLocked = false;
    this.cascadeDepth = 0;
    this.levelStartTime = Date.now();

    // Drag state
    this._drag = { active: false, cell: null, startX: 0, startY: 0 };
    this._hintTimeout = null;

    this.modalBtn.addEventListener('click', () => this._onModalBtn());

    // Pixi interaction
    this.boardContainer.interactive = true;
    this.boardContainer.on('pointerdown', (e) => this._onPointerDown(e));
    this.boardContainer.on('pointermove', (e) => this._onPointerMove(e));
    this.boardContainer.on('pointerup', (e) => this._onPointerUp(e));
    this.boardContainer.on('pointerupoutside', (e) => this._onPointerUp(e));

    // Pixi Ticker Loop
    this.pixiApp.ticker.add((delta) => this._tick(delta));

    this._startLevel(1);
    this._loadProgress();
  }

  async _loadProgress() {
    try {
      const savedLevel = await idbStore.get('current_level');
      if (savedLevel) {
        this._startLevel(savedLevel);
      }
    } catch (e) {
      console.warn('Could not load progress from IDB', e);
    }
  }

  async _saveProgress() {
    try {
      await idbStore.set('current_level', this.levelNum);
    } catch (e) {
      console.warn('Could not save progress to IDB', e);
    }
  }

  _saveSnapshot() {
    // Deep copy board cells for undo
    const snapshot = this.board.cells.map(c => ({
      type: c.type,
      candyColor: c.candyColor,
      candyType: c.candyType,
      layers: { ...c.layers },
      blocker: { ...c.blocker }
    }));
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 5) this.snapshots.shift(); // keep last 5
  }

  undo() {
    if (this.gameState !== STATE.IDLE || this.snapshots.length === 0) return;
    const snapshot = this.snapshots.pop();
    snapshot.forEach((snapCell, idx) => {
      const c = this.board.cells[idx];
      c.type = snapCell.type;
      c.candyColor = snapCell.candyColor;
      c.candyType = snapCell.candyType;
      c.layers = { ...snapCell.layers };
      c.blocker = { ...snapCell.blocker };
      // Note: would need to call _renderCell for Pixi updates here
    });
    this.moves++;
    this._updateScoreDisplay();
  }

  _tick(delta) {
    // Variable timestep state machine tick
    if (this.gameState === STATE.MATCH) {
      // Process matches
    } else if (this.gameState === STATE.CASCADE) {
      // Process gravity
    }
  }

  _startLevel(n) {
    this.levelNum = n;
    this.config = this.levelGen.generate(n);
    const cfg = this.config;

    this.board = new Board(cfg.gridW, cfg.gridH);
    this.score = 0;
    this.moves = cfg.moves;
    this.cascadeDepth = 0;
    this.isLocked = false;
    this.levelStartTime = Date.now();

    // Responsive grid sizing
    const maxPx = Math.min(window.innerWidth * 0.96, window.innerHeight * 0.62, 540);
    this.cellSize = Math.floor(maxPx / this.board.W);
    const boardPx = this.cellSize * this.board.W;
    this.boardEl.style.width = boardPx + 'px';
    this.boardEl.style.height = boardPx + 'px';

    // HUD Update
    this.levelEl.textContent = n;
    this.scoreEl.textContent = 0;
    this.targetEl.textContent = cfg.target;
    this.movesEl.textContent = this.moves;
    this.progressEl.style.width = '0%';

    const objLabels = {
      score: 'Reach the Target!',
      jelly: 'Clear all Jelly!',
      blocker: 'Clear all Blockers!'
    };
    this.objText.textContent = objLabels[cfg.objective] || 'Play!';
    this.modalEl.classList.add('modal-hidden');

    this._buildBoardUI();
    this._resetHintTimer();
  }

  _buildBoardUI() {
    this.boardEl.innerHTML = '';
    const cfg = this.config;
    const colors = COLORS.slice(0, cfg.colourCount);

    // Initial placement with Solvability validation
    let validBoard = false;
    let attempts = 0;

    while (!validBoard && attempts < 100) {
      attempts++;
      this.board.init();

      for (let r = 0; r < this.board.H; r++) {
        for (let c = 0; c < this.board.W; c++) {
          const idx = r * this.board.W + c;
          const cell = this.board.cells[idx];

          // Determine layers
          if (cfg.jellyRegion.includes(idx)) {
            cell.layers[LAYER_TYPES.JELLY] = 1;
          }

          // Random frosting blockers
          const rnd = Math.random();
          if (rnd < cfg.frostingDensity && r > this.board.H / 3) {
            BlockerSystem.initBlocker(cell, BLOCKER_TYPES.FROSTING, Math.random() < 0.4 ? 2 : 1);
          } else if (rnd < cfg.frostingDensity + cfg.chocolateDensity && r === this.board.H - 1) {
            BlockerSystem.initBlocker(cell, BLOCKER_TYPES.CHOCOLATE);
          } else if (rnd < cfg.frostingDensity + cfg.chocolateDensity + cfg.licoriceDensity) {
            BlockerSystem.initBlocker(cell, BLOCKER_TYPES.LICORICE);
          } else {
            // Normal Candy
            cell.type = CELL_TYPES.NORMAL;
            cell.candyColor = colors[Math.floor(Math.random() * colors.length)];
            cell.candyType = CANDY_TYPES.NORMAL;
          }
        }
      }

      // Check solvability
      const check = SolvabilityValidator.validate(this.board);
      if (check.valid) {
        validBoard = true;
      }
    }

    // Now instantiate DOM elements
    for (let r = 0; r < this.board.H; r++) {
      for (let c = 0; c < this.board.W; c++) {
        const cell = this.board.getCell(r, c);
        
        const el = document.createElement('div');
        el.className = 'cell';
        el.style.cssText = `
          left: ${c * this.cellSize}px;
          top: ${r * this.cellSize}px;
          width: ${this.cellSize}px;
          height: ${this.cellSize}px;
        `;

        const inner = document.createElement('div');
        inner.className = 'cell-inner';

        el.appendChild(inner);
        this.boardEl.appendChild(el);

        // PixiJS Sprite creation
        const sprite = new PIXI.Sprite();
        sprite.x = c * this.cellSize;
        sprite.y = r * this.cellSize;
        sprite.width = this.cellSize;
        sprite.height = this.cellSize;
        sprite.anchor.set(0.5); // Center anchor for scaling animations
        // Offset position to account for anchor
        sprite.x += this.cellSize / 2;
        sprite.y += this.cellSize / 2;
        this.boardContainer.addChild(sprite);

        cell.el = el;
        cell.inner = inner;
        cell.sprite = sprite;

        this._renderCell(cell);

        // Bind events
        el.addEventListener('mousedown', (e) => this._onPointerDown(e, cell));
        el.addEventListener('touchstart', (e) => this._onPointerDown(e, cell), { passive: false });
      }
    }
  }

  _renderCell(cell) {
    if (!cell.el || !cell.inner || !cell.sprite) return;

    cell.inner.innerHTML = '';
    cell.el.className = 'cell';

    // Sync PixiJS Sprite for Candy
    if (cell.hasCandy()) {
      cell.sprite.texture = CandyRenderer.getTexture(cell.candyColor, cell.candyType);
      cell.sprite.visible = true;
      
      // Temporary: Timer text can't easily be a texture in this quick port, 
      // so we use DOM fallback for timer overlays if needed.
      if (cell.candyType === CANDY_TYPES.TIMER) {
         cell.inner.innerHTML += CandyRenderer.renderTimer(cell.candyColor, cell.timerVal);
      }
    } else {
      cell.sprite.visible = false;
    }

    // 1. Render bottom layers (Jelly) - keep in DOM for now
    if (cell.layers[LAYER_TYPES.JELLY] > 0) {
      cell.inner.innerHTML += CandyRenderer.renderLayerOverlay(LAYER_TYPES.JELLY, cell.layers[LAYER_TYPES.JELLY]);
    }

    // 2. Render middle layer Blocker - keep in DOM for now
    if (cell.type === CELL_TYPES.BLOCKER && cell.blocker.type) {
      cell.inner.innerHTML += CandyRenderer.renderBlocker(cell.blocker.type, cell.blocker.health);
    } 

    // 3. Render top layers (Ice, Chains, Locks) - keep in DOM for now
    if (cell.layers[LAYER_TYPES.ICE] > 0) {
      cell.inner.innerHTML += CandyRenderer.renderLayerOverlay(LAYER_TYPES.ICE, cell.layers[LAYER_TYPES.ICE]);
    }
    if (cell.layers[LAYER_TYPES.CHAIN] > 0) {
      cell.inner.innerHTML += CandyRenderer.renderLayerOverlay(LAYER_TYPES.CHAIN, cell.layers[LAYER_TYPES.CHAIN]);
    }
    if (cell.layers[LAYER_TYPES.LOCK] > 0) {
      cell.inner.innerHTML += CandyRenderer.renderLayerOverlay(LAYER_TYPES.LOCK, cell.layers[LAYER_TYPES.LOCK]);
    }
  }

  _clientXY(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  _onPointerDown(e, cell) {
    if (this.isLocked || cell.isLocked()) return;
    e.preventDefault();
    this._drag.active = true;
    this._drag.cell = cell;
    const pos = this._clientXY(e);
    this._drag.startX = pos.x;
    this._drag.startY = pos.y;
    this._clearHints();
  }

  _onPointerMove(e) {
    if (!this._drag.active || !this._drag.cell) return;
    const pos = this._clientXY(e);
    const dx = pos.x - this._drag.startX;
    const dy = pos.y - this._drag.startY;
    const threshold = this.cellSize * 0.35;

    if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
      // Trigger swap direction
      let dir = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        dir = dx > 0 ? 'right' : 'left';
      } else {
        dir = dy > 0 ? 'down' : 'up';
      }

      const targetCell = this.board.getAdjacent(this._drag.cell, dir);
      this._drag.active = false; // complete swipe

      if (targetCell) {
        this._attemptSwap(this._drag.cell, targetCell);
      }
    }
  }

  _onPointerUp() {
    this._drag.active = false;
    this._drag.cell = null;
    this._resetHintTimer();
  }

  _attemptSwap(c1, c2) {
    if (this.isLocked || c1.isLocked() || c2.isLocked()) return;
    this.isLocked = true;

    // Check special combinations
    const hasCombo = this._resolveCombo(c1, c2);
    if (hasCombo) {
      this.moves--;
      this.movesEl.textContent = this.moves;
      this._runCascade();
      return;
    }

    // Standard swap animation
    this._animSwap(c1, c2).then(() => {
      // Check for matches
      const matches = MatchDetector.detect(this.board, c1, c2);
      if (matches.length > 0) {
        this.moves--;
        this.movesEl.textContent = this.moves;
        this._processMatches(matches, c2);
      } else {
        // Revert swap
        this._animSwap(c1, c2).then(() => {
          this.isLocked = false;
        });
      }
    });
  }

  _resolveCombo(c1, c2) {
    return MatchDetector.detect(this.board, c1, c2).length > 0; // combo wrapper handles validations inside SpecialEngine
  }

  _animSwap(c1, c2) {
    // Swap positions in array model
    const tempColor = c1.candyColor;
    const tempType = c1.candyType;
    const tempTimer = c1.timerVal;

    c1.candyColor = c2.candyColor;
    c1.candyType = c2.candyType;
    c1.timerVal = c2.timerVal;

    c2.candyColor = tempColor;
    c2.candyType = tempType;
    c2.timerVal = tempTimer;

    this._renderCell(c1);
    this._renderCell(c2);

    const dx = (c2.col - c1.col) * this.cellSize;
    const dy = (c2.row - c1.row) * this.cellSize;
    
    // PixiJS animation
    const p1 = new Promise(resolve => {
      gsap.fromTo(c1.sprite, 
        { x: c1.sprite.x + dx, y: c1.sprite.y + dy },
        { x: c1.sprite.x, y: c1.sprite.y, duration: ANIM.SWAP / 1000, ease: 'power2.out', onComplete: resolve }
      );
    });

    const p2 = new Promise(resolve => {
      gsap.fromTo(c2.sprite, 
        { x: c2.sprite.x - dx, y: c2.sprite.y - dy },
        { x: c2.sprite.x, y: c2.sprite.y, duration: ANIM.SWAP / 1000, ease: 'power2.out', onComplete: resolve }
      );
    });

    // DOM fallback animation (keep in sync)
    c1.inner.animate([
      { transform: `translate(${dx}px, ${dy}px)` },
      { transform: 'translate(0, 0)' }
    ], { duration: ANIM.SWAP, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

    c2.inner.animate([
      { transform: `translate(${-dx}px, ${-dy}px)` },
      { transform: 'translate(0, 0)' }
    ], { duration: ANIM.SWAP, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });

    return Promise.all([p1, p2]);
  }

  _processMatches(matches, draggedCell) {
    this.cascadeDepth++;
    
    // 1. Screen Shake if combo is large
    if (matches.length > 1 || matches.some(m => m.cells.length >= 4)) {
      VisualEffects.shakeScreen(this.boardEl, 300, 6);
    }

    // 2. Clear matches and award score
    matches.forEach(group => {
      const matchScore = group.cells.length * 60 * this.cascadeDepth;
      this.score += matchScore;

      group.cells.forEach(cell => {
        this._clearCell(cell);
      });

      // Spawn special candy
      if (group.spawnSpecial && group.spawnCell) {
        const sc = group.spawnCell;
        sc.type = CELL_TYPES.NORMAL;
        sc.candyColor = group.color;
        sc.candyType = group.spawnSpecial;
        this._spawnSpecialAnimation(sc);
      }
    });

    this._updateScoreDisplay();

    // Damage blockers adjacent to any cleared candy
    matches.forEach(group => {
      group.cells.forEach(c => {
        this._damageAdjacentBlockers(c.row, c.col);
      });
    });

    // Run gravity fall
    setTimeout(() => {
      this._applyGravity();
    }, ANIM.CLEAR);
  }

  _clearCell(cell, reason = 'match') {
    if (!cell.hasCandy() || cell.clearing) return;
    cell.clearing = true;
    cell.el.classList.add('clearing');

    const rect = cell.el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Burst particles
    this.particles.burst(cx, cy, cell.candyColor, 12);

    // Logical clear immediately to prevent race conditions with GravityEngine
    cell.type = CELL_TYPES.NORMAL;
    cell.candyColor = null;
    cell.candyType = CANDY_TYPES.NORMAL;

    // Fade and shrink (PixiJS)
    gsap.to(cell.sprite.scale, { x: 0, y: 0, duration: ANIM.CLEAR / 1000 });
    gsap.to(cell.sprite, { 
      alpha: 0, 
      duration: ANIM.CLEAR / 1000, 
      onComplete: () => {
        cell.clearing = false;
        cell.el.classList.remove('clearing');
        cell.sprite.scale.set(1);
        cell.sprite.alpha = 1;
        
        // Damage layers underneath
        if (cell.layers[LAYER_TYPES.JELLY] > 0) {
          cell.layers[LAYER_TYPES.JELLY] = 0; // Clear jelly
        }
        
        this._renderCell(cell);
      }
    });

    // Fade DOM elements
    const anim = cell.inner.animate([
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0)', opacity: 0 }
    ], { duration: ANIM.CLEAR, fill: 'forwards' });
    
    anim.onfinish = () => anim.cancel();
  }

  _damageAdjacentBlockers(row, col) {
    const adj = [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ];
    adj.forEach(([r, c]) => {
      const cell = this.board.getCell(r, c);
      if (cell && cell.type === CELL_TYPES.BLOCKER) {
        cell.damageBlocker(1);
        this._renderCell(cell);
      }
    });
  }

  _applyGravity() {
    const colors = COLORS.slice(0, this.config.colourCount);
    
    // Spawner color retrieval using adaptive weights
    const getSpawnColor = (cell) => {
      return Spawner.getSpawnColor(this.board, this.config, this.moves, this.score, this.config.colourCount);
    };

    // Run GravityEngine resolution
    const res = GravityEngine.resolve(this.board, this.config, (cell) => {
      cell.type = CELL_TYPES.NORMAL;
      cell.candyColor = getSpawnColor(cell);
      cell.candyType = CANDY_TYPES.NORMAL;
      this._renderCell(cell);
    });

    // Animate shifts
    res.shifts.forEach(shift => {
      const cell = this.board.cells[shift.toCellIdx];
      this._renderCell(cell);
      const dy = -(cell.row - shift.sourceRow) * this.cellSize;
      const dx = -(cell.col - shift.sourceCol) * this.cellSize;
      
      // PixiJS Sprite Animation
      gsap.fromTo(cell.sprite, 
        { x: cell.sprite.x + dx, y: cell.sprite.y + dy },
        { x: cell.sprite.x, y: cell.sprite.y, duration: ANIM.FALL / 1000, ease: 'power2.inOut' }
      );

      // DOM fallback animation
      cell.inner.animate([
        { transform: `translate(${dx}px, ${dy}px)` },
        { transform: 'translate(0, 0)' }
      ], { duration: ANIM.FALL, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' });
    });

    // Animate spawns
    res.spawns.forEach(spawn => {
      const cell = this.board.cells[spawn.cellIdx];
      this._renderCell(cell);
      const dy = -(cell.row - spawn.sourceRow) * this.cellSize;
      
      // PixiJS Sprite Animation
      gsap.fromTo(cell.sprite, 
        { y: cell.sprite.y + dy, alpha: 0 },
        { y: cell.sprite.y, alpha: 1, duration: ANIM.SPAWN / 1000, ease: 'back.out(1.5)' }
      );

      // DOM fallback animation
      cell.inner.animate([
        { transform: `translateY(${dy}px)`, opacity: 0 },
        { transform: 'translateY(0)', opacity: 1 }
      ], { duration: ANIM.SPAWN, easing: 'cubic-bezier(0.25, 1.5, 0.5, 1)' });
    });

    // Recurse matches check
    setTimeout(() => {
      this._runCascade();
    }, ANIM.FALL + 50);
  }

  _runCascade() {
    const matches = MatchDetector.detect(this.board);
    if (matches.length > 0) {
      this._processMatches(matches, null);
    } else {
      // Stable board state reached
      this.cascadeDepth = 0;
      this.isLocked = false;
      this._checkObjective();
      this._resetHintTimer();
    }
  }

  _spawnSpecialAnimation(cell) {
    const rect = cell.el.getBoundingClientRect();
    this.particles.burst(rect.left + rect.width / 2, rect.top + rect.height / 2, cell.candyColor, 20);
  }

  _updateScoreDisplay() {
    this.scoreEl.textContent = this.score;
    const progress = Math.min(100, (this.score / this.config.target) * 100);
    this.progressEl.style.width = progress + '%';
  }

  _checkObjective() {
    let met = false;
    const cfg = this.config;

    if (cfg.objective === 'score') {
      met = this.score >= cfg.target;
    } else if (cfg.objective === 'jelly') {
      met = !this.board.cells.some(c => c.layers[LAYER_TYPES.JELLY] > 0);
    } else if (cfg.objective === 'blocker') {
      met = !this.board.cells.some(c => c.type === CELL_TYPES.BLOCKER);
    }

    if (met) {
      this._triggerWin();
    } else if (this.moves <= 0) {
      this._triggerGameOver();
    }
  }

  _triggerWin() {
    this.isLocked = true;
    this._clearHints();
    this.particles.confetti(80);

    this.levelGen.recordResult(this.levelNum, true, this.score, this.config.target, this.moves, this.config.moves);

    setTimeout(() => {
      this.modalTitle.textContent = 'LEVEL COMPLETE!';
      this.modalBody.textContent = 'Fantastic swapping skills!';
      this.modalScore.textContent = this.score;
      this.modalStars.textContent = '⭐⭐⭐';
      this.modalBtn.textContent = 'NEXT LEVEL';
      this.modalEl.classList.remove('modal-hidden');
    }, 1200);
  }

  _triggerGameOver() {
    this.isLocked = true;
    this._clearHints();
    this.levelGen.recordResult(this.levelNum, false, this.score, this.config.target, 0, this.config.moves);

    setTimeout(() => {
      this.modalTitle.textContent = 'GAME OVER';
      this.modalBody.textContent = 'Out of moves! Give it another try.';
      this.modalScore.textContent = this.score;
      this.modalStars.textContent = '✩✩✩';
      this.modalBtn.textContent = 'RETRY';
      this.modalEl.classList.remove('modal-hidden');
    }, 1000);
  }

  _onModalBtn() {
    if (this.modalBtn.textContent === 'NEXT LEVEL') {
      this._startLevel(this.levelNum + 1);
    } else {
      this._startLevel(this.levelNum);
    }
  }

  _resetHintTimer() {
    this._clearHints();
    this._hintTimeout = setTimeout(() => {
      this._showHints();
    }, 5000);
  }

  _clearHints() {
    if (this._hintTimeout) clearTimeout(this._hintTimeout);
    this.board.cells.forEach(c => {
      if (c.el) c.el.classList.remove('hint-pulse');
    });
  }

  _showHints() {
    const hint = HintSystem.getBestHint(this.board, this.config);
    if (hint) {
      const cell1 = this.board.cells[hint.fromIdx];
      const cell2 = this.board.cells[hint.toIdx];
      if (cell1 && cell1.el) cell1.el.classList.add('hint-pulse');
      if (cell2 && cell2.el) cell2.el.classList.add('hint-pulse');
    }
  }
}
