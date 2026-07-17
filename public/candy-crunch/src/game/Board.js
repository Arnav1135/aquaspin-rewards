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