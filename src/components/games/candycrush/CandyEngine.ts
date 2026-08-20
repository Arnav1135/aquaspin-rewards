import { Orchestrator, CandyColor, SpecialType, GameEvent } from './Orchestrator';

export interface Candy {
  id: string;
  color: CandyColor;
  special: SpecialType;
  row: number;
  col: number;
}

const COLORS: CandyColor[] = ["red", "orange", "yellow", "green", "blue", "purple"];

export interface MatchGroup {
  cells: {r: number, c: number}[];
  color: CandyColor;
  specialGenerated?: SpecialType;
  spawnPoint?: {r: number, c: number};
}

export class CandyEngine {
  width: number;
  height: number;
  board: (Candy | null)[][];
  
  constructor(width = 8, height = 8) {
    this.width = width;
    this.height = height;
    this.board = Array(height).fill(null).map(() => Array(width).fill(null));
  }

  emit(type: GameEvent["type"], payload: any) {
    Orchestrator.emit("game_event", {
      eventId: Orchestrator.generateId(),
      timestamp: Date.now(),
      type,
      payload
    });
  }

  fillBoard() {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (!this.board[r][c]) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
    // Remove initial matches silently without generating specials
    while (this.findMatchGroups().length > 0) {
      this.board = Array(this.height).fill(null).map(() => Array(this.width).fill(null));
      for (let r = 0; r < this.height; r++) {
        for (let c = 0; c < this.width; c++) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }
    }
    this.emit("board_settled", { board: this.board });
  }

  createRandomCandy(row: number, col: number, special: SpecialType = 'none'): Candy {
    return {
      id: Math.random().toString(36).substring(2, 9),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      special,
      row,
      col
    };
  }

  async attemptSwap(r1: number, c1: number, r2: number, c2: number) {
    this.emit("swap_attempted", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 } });

    const cnd1 = this.board[r1][c1];
    const cnd2 = this.board[r2][c2];
    if (!cnd1 || !cnd2) return;

    // Swap
    this.board[r1][c1] = cnd2;
    this.board[r2][c2] = cnd1;
    cnd1.row = r2; cnd1.col = c2;
    cnd2.row = r1; cnd2.col = c1;

    // Special: Color Bomb swap
    let specialTriggered = false;
    let detonateQueue: {r: number, c: number}[] = [];

    if (cnd1.special === 'color_bomb' && cnd2.special === 'color_bomb') {
      // Clear entire board
      for(let r=0; r<this.height; r++) for(let c=0; c<this.width; c++) detonateQueue.push({r, c});
      specialTriggered = true;
    } else if (cnd1.special === 'color_bomb') {
      detonateQueue = this.findColorLocations(cnd2.color);
      detonateQueue.push({r: r2, c: c2}); // Detonate the bomb itself
      specialTriggered = true;
    } else if (cnd2.special === 'color_bomb') {
      detonateQueue = this.findColorLocations(cnd1.color);
      detonateQueue.push({r: r1, c: c1});
      specialTriggered = true;
    }

    const matchGroups = this.findMatchGroups([{r: r1, c: c1}, {r: r2, c: c2}]);

    if (!specialTriggered && matchGroups.length === 0) {
      this.emit("swap_invalid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
      await new Promise(r => setTimeout(r, 300));
      // Revert swap
      this.board[r1][c1] = cnd1;
      this.board[r2][c2] = cnd2;
      cnd1.row = r1; cnd1.col = c1;
      cnd2.row = r2; cnd2.col = c2;
      this.emit("swap_invalid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
      this.emit("board_settled", { board: this.board });
      return;
    }

    this.emit("swap_valid", { from: { row: r1, col: c1 }, to: { row: r2, col: c2 }, board: this.board });
    this.emit("moves_changed", { change: -1 });
    await new Promise(r => setTimeout(r, 300));
    
    // Process matches
    await this.processCascades(matchGroups, detonateQueue);
  }

  findColorLocations(color: CandyColor): {r: number, c: number}[] {
    const locs: {r: number, c: number}[] = [];
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.board[r][c]?.color === color) locs.push({r, c});
      }
    }
    return locs;
  }

  findMatchGroups(swapOrigins: {r: number, c: number}[] = []): MatchGroup[] {
    const hLines: {r: number, c: number}[][] = [];
    const vLines: {r: number, c: number}[][] = [];
    
    // Horizontal lines
    for (let r = 0; r < this.height; r++) {
      let matchLen = 1;
      for (let c = 0; c < this.width; c++) {
        let isMatch = false;
        if (c < this.width - 1) {
          const c1 = this.board[r][c];
          const c2 = this.board[r][c+1];
          if (c1 && c2 && c1.color === c2.color) {
            isMatch = true;
            matchLen++;
          }
        }
        if (!isMatch || c === this.width - 1) {
          if (matchLen >= 3) {
            const line = [];
            for (let i = 0; i < matchLen; i++) line.push({r, c: c - i - (isMatch ? 0 : 1)});
            hLines.push(line);
          }
          matchLen = 1;
        }
      }
    }

    // Vertical lines
    for (let c = 0; c < this.width; c++) {
      let matchLen = 1;
      for (let r = 0; r < this.height; r++) {
        let isMatch = false;
        if (r < this.height - 1) {
          const c1 = this.board[r][c];
          const c2 = this.board[r+1][c];
          if (c1 && c2 && c1.color === c2.color) {
            isMatch = true;
            matchLen++;
          }
        }
        if (!isMatch || r === this.height - 1) {
          if (matchLen >= 3) {
            const line = [];
            for (let i = 0; i < matchLen; i++) line.push({r: r - i - (isMatch ? 0 : 1), c});
            vLines.push(line);
          }
          matchLen = 1;
        }
      }
    }

    const groups: MatchGroup[] = [];
    const processedH = new Set<number>();
    const processedV = new Set<number>();

    // Check for intersections (Wrapped candies)
    for (let i = 0; i < hLines.length; i++) {
      for (let j = 0; j < vLines.length; j++) {
        const hLine = hLines[i];
        const vLine = vLines[j];
        const hColor = this.board[hLine[0].r][hLine[0].c]?.color;
        const vColor = this.board[vLine[0].r][vLine[0].c]?.color;
        
        if (hColor === vColor) {
          // Check intersection
          const intersection = hLine.find(hc => vLine.some(vc => vc.r === hc.r && vc.c === hc.c));
          if (intersection) {
            processedH.add(i);
            processedV.add(j);
            const cells = [...hLine, ...vLine.filter(vc => vc.r !== intersection.r || vc.c !== intersection.c)];
            groups.push({
              cells,
              color: hColor!,
              specialGenerated: 'wrapped',
              spawnPoint: intersection
            });
          }
        }
      }
    }

    // Process remaining isolated lines
    const processLine = (line: {r: number, c: number}[], isHorizontal: boolean) => {
      const color = this.board[line[0].r][line[0].c]?.color!;
      let special: SpecialType | undefined;
      let spawnPoint = line[1]; // default center-ish

      // Try to align spawn point with a swap origin if available
      for (const origin of swapOrigins) {
        if (line.some(c => c.r === origin.r && c.c === origin.c)) {
          spawnPoint = origin;
          break;
        }
      }

      if (line.length >= 5) {
        special = 'color_bomb';
      } else if (line.length === 4) {
        special = isHorizontal ? 'striped_v' : 'striped_h'; // swipe H creates V stripe
      }

      groups.push({ cells: line, color, specialGenerated: special, spawnPoint });
    };

    hLines.forEach((line, i) => !processedH.has(i) && processLine(line, true));
    vLines.forEach((line, i) => !processedV.has(i) && processLine(line, false));

    return groups;
  }

  async detonate(queue: {r: number, c: number}[]) {
    const destroyed = new Set<string>();
    let scoreGain = 0;

    const processCell = (r: number, c: number) => {
      if (r < 0 || r >= this.height || c < 0 || c >= this.width) return;
      const key = `${r},${c}`;
      if (destroyed.has(key)) return;
      
      const candy = this.board[r][c];
      if (!candy) return;
      
      destroyed.add(key);
      scoreGain += 10;
      this.board[r][c] = null; // Mark dead

      // Trigger Specials!
      if (candy.special === 'striped_h') {
        for (let i = 0; i < this.width; i++) queue.push({r, c: i});
      } else if (candy.special === 'striped_v') {
        for (let i = 0; i < this.height; i++) queue.push({r: i, c});
      } else if (candy.special === 'wrapped') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            queue.push({r: r + dr, c: c + dc});
          }
        }
      } else if (candy.special === 'color_bomb') {
        // Find a random color to destroy if randomly hit by a stripe
        const targetColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const locs = this.findColorLocations(targetColor);
        locs.forEach(loc => queue.push(loc));
      }
    };

    while (queue.length > 0) {
      // Snapshot queue level for staggered animations
      const levelQueue = [...queue];
      queue.length = 0;
      
      levelQueue.forEach(({r, c}) => processCell(r, c));
      
      if (levelQueue.length > 0) {
        this.emit("cascade_step", { board: this.board });
        await new Promise(r => setTimeout(r, 150)); // Tiny pause for chain reaction visuals
      }
    }

    if (scoreGain > 0) {
      this.emit("score_changed", { change: scoreGain });
    }
  }

  async processCascades(initialGroups: MatchGroup[] = [], initialDetonateQueue: {r: number, c: number}[] = []) {
    let matchGroups = initialGroups;
    const detonateQueue = initialDetonateQueue;
    
    while (matchGroups.length > 0 || detonateQueue.length > 0) {
      const specialsToSpawn: {candy: Candy, r: number, c: number}[] = [];

      if (matchGroups.length > 0) {
        this.emit("match_found", { groups: matchGroups }); // payload format changed!
        
        matchGroups.forEach(group => {
          group.cells.forEach(cell => detonateQueue.push(cell));
          if (group.specialGenerated && group.spawnPoint) {
            const sc = this.createRandomCandy(group.spawnPoint.r, group.spawnPoint.c, group.specialGenerated);
            if (group.specialGenerated !== 'color_bomb') sc.color = group.color;
            specialsToSpawn.push({candy: sc, r: group.spawnPoint.r, c: group.spawnPoint.c});
          }
        });
      }

      await this.detonate(detonateQueue);

      // Spawn specials after detonation clears the spot
      specialsToSpawn.forEach(s => {
        this.board[s.r][s.c] = s.candy;
      });

      this.emit("cascade_step", { board: this.board });
      await new Promise(r => setTimeout(r, 250));

      // Apply gravity
      for (let c = 0; c < this.width; c++) {
        let emptySlots = 0;
        for (let r = this.height - 1; r >= 0; r--) {
          if (this.board[r][c] === null) {
            emptySlots++;
          } else if (emptySlots > 0) {
            const candy = this.board[r][c]!;
            this.board[r + emptySlots][c] = candy;
            candy.row = r + emptySlots;
            this.board[r][c] = null;
          }
        }
  
        for (let r = emptySlots - 1; r >= 0; r--) {
          this.board[r][c] = this.createRandomCandy(r, c);
        }
      }

      this.emit("cascade_step", { board: this.board });
      await new Promise(r => setTimeout(r, 400));
      
      matchGroups = this.findMatchGroups();
    }
    
    this.emit("board_settled", { board: this.board });
  }
}
