const fs = require('fs');
const path = require('path');

const files = {
  'public/candy-crunch/src/styles/main.css': `
    :root {
      --bg-color: #2b1a38;
      --primary: #ff4081;
      --text: #ffffff;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      background: var(--bg-color);
      color: var(--text);
      font-family: 'Fredoka One', 'Nunito', sans-serif;
      overflow: hidden;
      touch-action: none;
    }
    .scene {
      position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
      display: none; flex-direction: column;
    }
    .scene.active { display: flex; }
    .flex-center { display: flex; justify-content: center; align-items: center; }
    .hidden { display: none !important; }
    #boot-scene { background: linear-gradient(135deg, #4b2354, #2b1a38); flex-direction: column; }
    .candy-text { font-size: 4rem; color: #ff4081; text-shadow: 0 4px 8px rgba(0,0,0,0.5); }
    .subtitle { font-size: 2rem; color: #ffeb3b; }
    .btn-primary { background: #ff4081; border: none; padding: 1rem 2rem; border-radius: 2rem; font-size: 1.5rem; color: #fff; cursor: pointer; box-shadow: 0 4px 12px rgba(255,64,129,0.5); }
    #map-scene { background: #4caf50; overflow-y: auto; overflow-x: hidden; position: relative; }
    .header-bar { position: fixed; top: 0; width: 100%; height: 60px; background: rgba(0,0,0,0.5); display: flex; justify-content: space-around; align-items: center; z-index: 10; }
    #map-scroller { width: 100%; height: 3000px; position: relative; }
    .level-node { position: absolute; width: 60px; height: 60px; background: #fff; border-radius: 50%; color: #000; display: flex; justify-content: center; align-items: center; font-weight: bold; cursor: pointer; transform: translate(-50%, -50%); border: 4px solid #aaa; }
    .level-node.unlocked { border-color: #ffeb3b; background: #ff9800; color: #fff; }
    .level-node.passed { border-color: #4caf50; background: #8bc34a; color: #fff; }
    #game-scene { background: url('/images/game-bg.jpg') center/cover, #2b1a38; }
    .game-hud { height: 80px; display: flex; justify-content: space-between; align-items: center; padding: 0 20px; background: rgba(0,0,0,0.6); }
    .score-progress-container { width: 80%; height: 20px; background: #333; margin: 10px auto; border-radius: 10px; position: relative; }
    #score-progress-bar { height: 100%; width: 0%; background: #4caf50; border-radius: 10px; transition: width 0.3s; }
    #game-board-container { flex: 1; display: flex; justify-content: center; align-items: center; padding: 20px; }
    #game-canvas { max-width: 100%; max-height: 100%; object-fit: contain; background: rgba(0,0,0,0.3); border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
    #modal-container { position: fixed; top:0; left:0; width:100%; height:100%; z-index: 100; display: flex; justify-content: center; align-items: center; }
    .modal-backdrop { position: absolute; width:100%; height:100%; background: rgba(0,0,0,0.7); }
    .modal-content { position: relative; background: #fff; color: #000; padding: 2rem; border-radius: 20px; min-width: 300px; text-align: center; }
  `,
  'public/candy-crunch/src/main.js': `
    import { SceneManager } from './scenes/SceneManager.js';
    import { BootScene } from './scenes/BootScene.js';
    import { MapScene } from './scenes/MapScene.js';
    import { GameScene } from './scenes/GameScene.js';
    
    class App {
      constructor() {
        this.sceneManager = new SceneManager();
        this.sceneManager.add('boot', new BootScene(this));
        this.sceneManager.add('map', new MapScene(this));
        this.sceneManager.add('game', new GameScene(this));
        
        this.sceneManager.start('boot');
      }
    }
    
    window.app = new App();
  `,
  'public/candy-crunch/src/scenes/SceneManager.js': `
    export class SceneManager {
      constructor() {
        this.scenes = {};
        this.activeScene = null;
      }
      add(name, scene) {
        this.scenes[name] = scene;
      }
      start(name, data) {
        if (this.activeScene) {
          this.activeScene.sleep();
          document.getElementById(this.activeScene.id).classList.remove('active');
        }
        this.activeScene = this.scenes[name];
        document.getElementById(this.activeScene.id).classList.add('active');
        this.activeScene.wake(data);
      }
      showModal(id, data) {
        const c = document.getElementById('modal-container');
        c.classList.remove('hidden');
        const content = document.getElementById('modal-content');
        if (id === 'settings') {
          content.innerHTML = '<h2>Settings</h2><button class="btn-primary" onclick="document.getElementById(\\'modal-container\\').classList.add(\\'hidden\\')">Close</button>';
        } else if (id === 'level-intro') {
          content.innerHTML = \`<h2>\${data.name}</h2><p>Target: \${data.objectives[0].target}</p><button class="btn-primary" id="btn-play-level">Play</button>\`;
          setTimeout(() => {
            document.getElementById('btn-play-level').onclick = () => {
              c.classList.add('hidden');
              window.app.sceneManager.start('game', { level: data });
            };
          }, 100);
        } else if (id === 'win') {
          content.innerHTML = '<h2>Level Cleared!</h2><button class="btn-primary" onclick="document.getElementById(\\'modal-container\\').classList.add(\\'hidden\\'); window.app.sceneManager.start(\\'map\\');">Continue</button>';
        } else if (id === 'lose') {
          content.innerHTML = '<h2>Out of Moves!</h2><button class="btn-primary" onclick="document.getElementById(\\'modal-container\\').classList.add(\\'hidden\\'); window.app.sceneManager.start(\\'map\\');">Back to Map</button>';
        }
      }
    }
  `,
  'public/candy-crunch/src/scenes/BootScene.js': `
    export class BootScene {
      constructor(app) { this.app = app; this.id = 'boot-scene'; }
      wake() {
        setTimeout(() => {
          const btn = document.getElementById('btn-start');
          btn.classList.remove('hidden');
          btn.onclick = () => this.app.sceneManager.start('map');
        }, 1000);
      }
      sleep() {}
    }
  `,
  'public/candy-crunch/src/scenes/MapScene.js': `
    import { LEVELS } from '../data/levels.js';
    export class MapScene {
      constructor(app) { this.app = app; this.id = 'map-scene'; }
      wake() {
        this.renderMap();
      }
      renderMap() {
        const scroller = document.getElementById('map-scroller');
        scroller.querySelectorAll('.level-node').forEach(e => e.remove());
        const maxLevel = parseInt(localStorage.getItem('cc_max_level') || '1', 10);
        
        LEVELS.forEach((level, i) => {
          if (i > 30) return; // limit for now
          const x = 50 + Math.sin(i * 0.5) * 30;
          const y = 3000 - 100 - i * 80;
          
          const node = document.createElement('div');
          node.className = 'level-node ' + (i + 1 <= maxLevel ? 'unlocked' : '') + (i + 1 < maxLevel ? ' passed' : '');
          node.style.left = x + '%';
          node.style.top = y + 'px';
          node.innerText = level.id;
          
          if (i + 1 <= maxLevel) {
            node.onclick = () => this.app.sceneManager.showModal('level-intro', level);
          }
          scroller.appendChild(node);
        });
        
        // Scroll to active level
        setTimeout(() => {
          const active = scroller.querySelector('.level-node.unlocked:not(.passed)') || scroller.querySelector('.level-node.unlocked');
          if (active) {
            document.getElementById('map-scene').scrollTop = active.offsetTop - window.innerHeight / 2;
          }
        }, 100);
      }
      sleep() {}
    }
  `,
  'public/candy-crunch/src/scenes/GameScene.js': `
    import { Board } from '../game/Board.js';
    export class GameScene {
      constructor(app) { 
        this.app = app; 
        this.id = 'game-scene'; 
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.board = null;
        this.loop = this.loop.bind(this);
        this.running = false;
        
        this.canvas.addEventListener('pointerdown', e => this.handleInput(e, 'down'));
        this.canvas.addEventListener('pointermove', e => this.handleInput(e, 'move'));
        this.canvas.addEventListener('pointerup', e => this.handleInput(e, 'up'));
      }
      wake(data) {
        this.level = data.level;
        this.moves = this.level.moves;
        this.score = 0;
        this.target = this.level.objectives[0].target || 0;
        
        document.getElementById('hud-target-value').innerText = \`0 / \${this.target}\`;
        document.getElementById('hud-moves').innerText = this.moves;
        
        this.board = new Board(this.level, this);
        this.running = true;
        requestAnimationFrame(this.loop);
      }
      sleep() {
        this.running = false;
        this.board = null;
      }
      handleInput(e, type) {
        if (!this.board || !this.board.inputAllowed) return;
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        this.board.handleInput(type, x, y);
      }
      addScore(amount) {
        this.score += amount;
        document.getElementById('hud-target-value').innerText = \`\${this.score} / \${this.target}\`;
        const pct = Math.min(100, (this.score / this.target) * 100);
        document.getElementById('score-progress-bar').style.width = pct + '%';
      }
      useMove() {
        this.moves--;
        document.getElementById('hud-moves').innerText = this.moves;
        if (this.moves <= 0 && this.score < this.target) {
          setTimeout(() => this.app.sceneManager.showModal('lose'), 1000);
        } else if (this.score >= this.target) {
          const curMax = parseInt(localStorage.getItem('cc_max_level') || '1', 10);
          if (this.level.id >= curMax) localStorage.setItem('cc_max_level', this.level.id + 1);
          setTimeout(() => this.app.sceneManager.showModal('win'), 1000);
        }
      }
      loop(time) {
        if (!this.running) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.board) {
          this.board.update(time);
          this.board.draw(this.ctx);
        }
        requestAnimationFrame(this.loop);
      }
    }
  `,
  'public/candy-crunch/src/game/Board.js': `
    import { Candy } from './Candy.js';
    
    export class Board {
      constructor(level, scene) {
        this.level = level;
        this.scene = scene;
        this.rows = level.rows;
        this.cols = level.cols;
        this.cellSize = 80;
        this.offsetX = 0;
        this.offsetY = 0;
        this.grid = [];
        this.candies = [];
        this.inputAllowed = true;
        this.selected = null;
        
        this.init();
      }
      init() {
        for (let r = 0; r < this.rows; r++) {
          this.grid[r] = [];
          for (let c = 0; c < this.cols; c++) {
            this.grid[r][c] = { x: c * this.cellSize, y: r * this.cellSize, type: 'empty' };
            const type = this.level.candyTypes[Math.floor(Math.random() * this.level.candyTypes.length)];
            this.candies.push(new Candy(c, r, type, this));
          }
        }
      }
      getCandy(c, r) {
        return this.candies.find(candy => candy.c === c && candy.r === r && !candy.markedForDelete);
      }
      handleInput(type, x, y) {
        const c = Math.floor(x / this.cellSize);
        const r = Math.floor(y / this.cellSize);
        if (c < 0 || c >= this.cols || r < 0 || r >= this.rows) return;
        
        if (type === 'down') {
          this.selected = {c, r, startX: x, startY: y};
        } else if (type === 'move' && this.selected) {
          const dx = x - this.selected.startX;
          const dy = y - this.selected.startY;
          if (Math.abs(dx) > 20 || Math.abs(dy) > 20) {
            let nc = this.selected.c;
            let nr = this.selected.r;
            if (Math.abs(dx) > Math.abs(dy)) {
              nc += dx > 0 ? 1 : -1;
            } else {
              nr += dy > 0 ? 1 : -1;
            }
            this.swap(this.selected.c, this.selected.r, nc, nr);
            this.selected = null;
          }
        } else if (type === 'up') {
          this.selected = null;
        }
      }
      swap(c1, r1, c2, r2) {
        if (c2 < 0 || c2 >= this.cols || r2 < 0 || r2 >= this.rows) return;
        const candy1 = this.getCandy(c1, r1);
        const candy2 = this.getCandy(c2, r2);
        if (!candy1 || !candy2) return;
        
        this.inputAllowed = false;
        
        candy1.c = c2; candy1.r = r2;
        candy2.c = c1; candy2.r = r1;
        
        candy1.moveTo(c2, r2);
        candy2.moveTo(c1, r1, () => {
          const matches = this.findMatches();
          if (matches.length > 0) {
            this.processMatches(matches);
            this.scene.useMove();
          } else {
            // Swap back
            candy1.c = c1; candy1.r = r1;
            candy2.c = c2; candy2.r = r2;
            candy1.moveTo(c1, r1);
            candy2.moveTo(c2, r2, () => {
              this.inputAllowed = true;
            });
          }
        });
      }
      findMatches() {
        const matches = [];
        // Horizontal
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols - 2; c++) {
            const m1 = this.getCandy(c, r);
            const m2 = this.getCandy(c+1, r);
            const m3 = this.getCandy(c+2, r);
            if (m1 && m2 && m3 && m1.type === m2.type && m2.type === m3.type) {
              matches.push(m1, m2, m3);
            }
          }
        }
        // Vertical
        for (let c = 0; c < this.cols; c++) {
          for (let r = 0; r < this.rows - 2; r++) {
            const m1 = this.getCandy(c, r);
            const m2 = this.getCandy(c, r+1);
            const m3 = this.getCandy(c, r+2);
            if (m1 && m2 && m3 && m1.type === m2.type && m2.type === m3.type) {
              matches.push(m1, m2, m3);
            }
          }
        }
        return [...new Set(matches)];
      }
      processMatches(matches) {
        matches.forEach(m => {
          m.markedForDelete = true;
          this.scene.addScore(60);
        });
        setTimeout(() => this.applyGravity(), 200);
      }
      applyGravity() {
        this.candies = this.candies.filter(c => !c.markedForDelete);
        for (let c = 0; c < this.cols; c++) {
          let emptyCount = 0;
          for (let r = this.rows - 1; r >= 0; r--) {
            const candy = this.getCandy(c, r);
            if (!candy) {
              emptyCount++;
            } else if (emptyCount > 0) {
              candy.r += emptyCount;
              candy.moveTo(candy.c, candy.r);
            }
          }
          for (let i = 0; i < emptyCount; i++) {
            const type = this.level.candyTypes[Math.floor(Math.random() * this.level.candyTypes.length)];
            const newCandy = new Candy(c, i, type, this);
            newCandy.y = - (emptyCount - i) * this.cellSize;
            newCandy.moveTo(c, i);
            this.candies.push(newCandy);
          }
        }
        
        setTimeout(() => {
          const matches = this.findMatches();
          if (matches.length > 0) {
            this.processMatches(matches);
          } else {
            this.inputAllowed = true;
          }
        }, 400);
      }
      update(time) {
        this.candies.forEach(c => c.update(time));
      }
      draw(ctx) {
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        for (let r = 0; r < this.rows; r++) {
          for (let c = 0; c < this.cols; c++) {
            if ((r+c)%2===0) ctx.fillRect(c*this.cellSize, r*this.cellSize, this.cellSize, this.cellSize);
          }
        }
        this.candies.forEach(c => c.draw(ctx));
      }
    }
  `,
  'public/candy-crunch/src/game/Candy.js': `
    export class Candy {
      constructor(c, r, type, board) {
        this.c = c;
        this.r = r;
        this.type = type;
        this.board = board;
        this.x = c * board.cellSize;
        this.y = r * board.cellSize;
        this.targetX = this.x;
        this.targetY = this.y;
        this.moving = false;
        this.onComplete = null;
        this.markedForDelete = false;
        
        this.colors = {
          'red': '#f44336',
          'blue': '#2196f3',
          'green': '#4caf50',
          'yellow': '#ffeb3b',
          'orange': '#ff9800',
          'purple': '#9c27b0'
        };
      }
      moveTo(c, r, callback) {
        this.targetX = c * this.board.cellSize;
        this.targetY = r * this.board.cellSize;
        this.moving = true;
        this.onComplete = callback;
      }
      update(time) {
        if (this.moving) {
          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          this.x += dx * 0.2;
          this.y += dy * 0.2;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.moving = false;
            if (this.onComplete) {
              this.onComplete();
              this.onComplete = null;
            }
          }
        }
      }
      draw(ctx) {
        const cx = this.x + this.board.cellSize / 2;
        const cy = this.y + this.board.cellSize / 2;
        const radius = this.board.cellSize / 2 - 5;
        
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = this.colors[this.type] || '#fff';
        ctx.fill();
        
        // highlight
        ctx.beginPath();
        ctx.arc(cx - radius * 0.3, cy - radius * 0.3, radius * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fill();
      }
    }
  `
};

for (const [filepath, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(process.cwd(), filepath), content.trim());
}

console.log('✅ Base engine files created!');
