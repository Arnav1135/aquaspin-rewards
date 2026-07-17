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
        
        document.getElementById('hud-target-value').innerText = `0 / ${this.target}`;
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
        document.getElementById('hud-target-value').innerText = `${this.score} / ${this.target}`;
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