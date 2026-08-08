export interface Position {
  x: number;
  y: number;
}

export interface LayoutPattern {
  id: string;
  name: string;
  // Returns array of positions for the vessels.
  // The first element might be the special vessel if there's one.
  getPositions: (numTubes: number, tubeWidth: number, tubeHeight: number, gap: number) => Position[];
}

export class LayoutPatternRegistry {
  private static patterns: Record<string, LayoutPattern> = {};

  static register(pattern: LayoutPattern) {
    this.patterns[pattern.id] = pattern;
  }

  static get(id: string): LayoutPattern {
    return this.patterns[id] || this.patterns['grid'];
  }

  static getAll(): LayoutPattern[] {
    return Object.values(this.patterns);
  }
}

// Standard Grid Pattern
LayoutPatternRegistry.register({
  id: 'grid',
  name: 'Standard Grid',
  getPositions: (numTubes, tubeWidth, tubeHeight, gap) => {
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

    const positions: Position[] = [];
    for (let i = 0; i < numTubes; i++) {
      const col = i % columns;
      const row = Math.floor(i / columns);
      
      const x = col * (tubeWidth + gap);
      const y = row * (tubeHeight + gap * 2);
      positions.push({ x, y });
    }
    return positions;
  }
});

// Center Shape Pattern (e.g., Heart in the middle, tubes around)
LayoutPatternRegistry.register({
  id: 'center_shape',
  name: 'Center Shape Layout',
  getPositions: (numTubes, tubeWidth, tubeHeight, gap) => {
    // 0 is the special container (center)
    // 1..numTubes-1 are regular tubes around it
    const positions: Position[] = [];
    
    // The center vessel
    positions.push({ x: tubeWidth * 1.5 + gap, y: tubeHeight / 2 + gap });

    // The other tubes
    const otherTubes = numTubes - 1;
    const topRow = Math.ceil(otherTubes / 2);
    const bottomRow = otherTubes - topRow;

    // Top Row
    for (let i = 0; i < topRow; i++) {
      positions.push({ x: i * (tubeWidth + gap), y: 0 });
    }
    // Bottom Row
    for (let i = 0; i < bottomRow; i++) {
      positions.push({ x: i * (tubeWidth + gap), y: tubeHeight * 1.5 + gap * 2 });
    }
    
    return positions;
  }
});
