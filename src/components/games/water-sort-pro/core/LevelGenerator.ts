import { Solver } from './Solver';
import { GameState, PuzzleEngine } from './PuzzleEngine';

export interface LevelDefinition {
  levelId: string;
  seed: string;
  generatorVersion: string;
  difficultyTarget: number;
  colorCount: number;
  tubeCount: number;
  tubeCapacity: number;
  emptyTubeCount: number;
  initialConfiguration: number[][];
  puzzleDNA: string;
}

export class LevelGenerator {
  /**
   * Generates a puzzle by starting with a solved state and reversing valid moves
   */
  public static generate(
    targetDifficulty: number, 
    colorCount: number, 
    tubeCount: number, 
    tubeCapacity: number
  ): LevelDefinition {
    // 1. Create a solved state
    const solvedTubes: number[][] = [];
    for (let c = 0; c < colorCount; c++) {
      const tube = new Array(tubeCapacity).fill(c);
      solvedTubes.push(tube);
    }
    const emptyTubeCount = tubeCount - colorCount;
    for (let e = 0; e < emptyTubeCount; e++) {
      solvedTubes.push([]);
    }

    // 2. Scramble by reversing moves
    // A reverse move takes the top color(s) of tube A and puts them on top of tube B
    let currentTubes = solvedTubes.map(t => [...t]);
    const scrambleDepth = 20 + Math.floor(targetDifficulty / 10);
    
    let lastSrc = -1;
    let lastDst = -1;

    for (let i = 0; i < scrambleDepth; i++) {
      // Find all valid reverse moves
      const validReverseMoves: { src: number, dst: number, amount: number }[] = [];
      
      for (let src = 0; src < tubeCount; src++) {
        for (let dst = 0; dst < tubeCount; dst++) {
          if (src === dst) continue;
          // Don't just undo the move we literally just did
          if (src === lastDst && dst === lastSrc) continue;

          const srcTube = currentTubes[src];
          const dstTube = currentTubes[dst];

          if (srcTube.length === 0) continue;
          if (dstTube.length >= tubeCapacity) continue;

          const topColor = srcTube[srcTube.length - 1];

          // In reverse, we can pour to an empty tube, OR to a tube that has room.
          // Unlike normal play, we don't strictly require matching colors to reverse-pour, 
          // because reversing is literally mixing colors together.
          // However, we only reverse-pour a contiguous block.
          let matchingLayers = 0;
          for (let k = srcTube.length - 1; k >= 0; k--) {
            if (srcTube[k] === topColor) matchingLayers++;
            else break;
          }

          const spaceInDst = tubeCapacity - dstTube.length;
          const maxAmount = Math.min(matchingLayers, spaceInDst);
          
          if (maxAmount > 0) {
            // We can pick a random amount between 1 and maxAmount
            const amount = Math.floor(Math.random() * maxAmount) + 1;
            validReverseMoves.push({ src, dst, amount });
          }
        }
      }

      if (validReverseMoves.length === 0) break; // Dead end in scrambling

      // Pick random move
      const move = validReverseMoves[Math.floor(Math.random() * validReverseMoves.length)];
      
      // Apply reverse move
      const transferred = currentTubes[move.src].splice(currentTubes[move.src].length - move.amount, move.amount);
      currentTubes[move.dst].push(...transferred);
      
      lastSrc = move.src;
      lastDst = move.dst;
    }

    // 3. DNA Fingerprint (Hash of the structure)
    const puzzleDNA = this.generateDNA(currentTubes);

    return {
      levelId: `lvl_${Date.now()}`,
      seed: Math.random().toString(),
      generatorVersion: '2.0',
      difficultyTarget: targetDifficulty,
      colorCount,
      tubeCount,
      tubeCapacity,
      emptyTubeCount,
      initialConfiguration: currentTubes,
      puzzleDNA
    };
  }

  public static generateDNA(tubes: number[][]): string {
    // Map literal colors to structural IDs (A, B, C...) based on first appearance
    const colorMap = new Map<number, number>();
    let nextId = 0;
    
    const normalizedTubes = tubes.map(tube => {
      return tube.map(color => {
        if (!colorMap.has(color)) {
          colorMap.set(color, nextId++);
        }
        return colorMap.get(color)!;
      });
    });

    // Sort tubes to ignore ordering
    normalizedTubes.sort((a, b) => a.join(',').localeCompare(b.join(',')));
    
    return btoa(JSON.stringify(normalizedTubes));
  }
}
