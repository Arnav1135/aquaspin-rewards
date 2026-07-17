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