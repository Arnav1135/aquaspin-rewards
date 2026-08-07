import { Solver } from './Solver';
import { GameState, PuzzleEngine } from './PuzzleEngine';
import { DifficultyEngine } from './DifficultyEngine';
import { AntiRepetitionEngine } from './AntiRepetitionEngine';

export interface LevelDefinition {
  levelId: string;
  seed: string;
  generatorVersion: string;
  difficultyTarget: number;
  actualDifficulty: number;
  colorCount: number;
  tubeCount: number;
  tubeCapacity: number;
  emptyTubeCount: number;
  initialConfiguration: number[][];
  puzzleDNA: string;
  qualityScore: number;
}

export class LevelGenerator {
  private static antiRepetitionEngine = new AntiRepetitionEngine();

  /**
   * Main pipeline for generating a validated, high-quality puzzle.
   */
  public static generate(
    targetDifficulty: number, 
    colorCount: number, 
    tubeCount: number, 
    tubeCapacity: number
  ): LevelDefinition {
    
    // Generate a candidate pool
    const poolSize = 5;
    const candidates: LevelDefinition[] = [];

    for (let i = 0; i < poolSize; i++) {
      const candidate = this.generateCandidate(targetDifficulty, colorCount, tubeCount, tubeCapacity);
      if (candidate) {
        candidates.push(candidate);
      }
    }

    if (candidates.length === 0) {
      // Fallback if the pool failed (should be rare)
      return this.generateCandidate(targetDifficulty, colorCount, tubeCount, tubeCapacity, true)!;
    }

    // Rank candidates by how close their actual difficulty is to the target, plus quality score
    candidates.sort((a, b) => {
      const diffA = Math.abs(a.actualDifficulty - targetDifficulty);
      const diffB = Math.abs(b.actualDifficulty - targetDifficulty);
      
      // Combine difficulty accuracy with quality score
      const scoreA = diffA - (a.qualityScore * 2);
      const scoreB = diffB - (b.qualityScore * 2);
      
      return scoreA - scoreB; 
    });

    // Select the best candidate
    const bestCandidate = candidates[0];
    
    // Register it to prevent repetition
    this.antiRepetitionEngine.recordLevel(bestCandidate.puzzleDNA);

    return bestCandidate;
  }

  private static generateCandidate(
    targetDifficulty: number, 
    colorCount: number, 
    tubeCount: number, 
    tubeCapacity: number,
    isFallback = false
  ): LevelDefinition | null {
    // 1. Create solved state
    const solvedTubes: number[][] = [];
    for (let c = 0; c < colorCount; c++) {
      solvedTubes.push(new Array(tubeCapacity).fill(c));
    }
    const emptyTubeCount = tubeCount - colorCount;
    for (let e = 0; e < emptyTubeCount; e++) {
      solvedTubes.push([]);
    }

    // 2. Reverse scramble
    let currentTubes = solvedTubes.map(t => [...t]);
    const scrambleDepth = 20 + Math.floor(targetDifficulty / 10);
    
    let lastSrc = -1;
    let lastDst = -1;

    for (let i = 0; i < scrambleDepth; i++) {
      const validReverseMoves: { src: number, dst: number, amount: number }[] = [];
      
      for (let src = 0; src < tubeCount; src++) {
        for (let dst = 0; dst < tubeCount; dst++) {
          if (src === dst) continue;
          if (src === lastDst && dst === lastSrc) continue; // prevent immediate undo

          const srcTube = currentTubes[src];
          const dstTube = currentTubes[dst];

          if (srcTube.length === 0) continue;
          if (dstTube.length >= tubeCapacity) continue;

          const topColor = srcTube[srcTube.length - 1];
          let matchingLayers = 0;
          for (let k = srcTube.length - 1; k >= 0; k--) {
            if (srcTube[k] === topColor) matchingLayers++;
            else break;
          }

          const spaceInDst = tubeCapacity - dstTube.length;
          const maxAmount = Math.min(matchingLayers, spaceInDst);
          
          if (maxAmount > 0) {
            const amount = Math.floor(Math.random() * maxAmount) + 1;
            validReverseMoves.push({ src, dst, amount });
          }
        }
      }

      if (validReverseMoves.length === 0) break; 
      const move = validReverseMoves[Math.floor(Math.random() * validReverseMoves.length)];
      
      const transferred = currentTubes[move.src].splice(currentTubes[move.src].length - move.amount, move.amount);
      currentTubes[move.dst].push(...transferred);
      
      lastSrc = move.src;
      lastDst = move.dst;
    }

    // 3. DNA Fingerprint
    const puzzleDNA = this.generateDNA(currentTubes);

    // 4. Anti-Repetition Check
    if (!isFallback && !this.antiRepetitionEngine.isNovel(puzzleDNA)) {
      return null;
    }

    // 5. Solvability Validation
    const mockState: GameState = {
      levelId: 'temp', generatorVersion: '2.0', seed: '', 
      tubes: currentTubes, tubeCapacity, selectedTube: null,
      moveHistory: [], undoStack: [], redoStack: [], moveCount: 0,
      elapsedTime: 0, hintsUsed: 0, undosUsed: 0, status: 'IDLE'
    };
    
    // Quick BFS check
    const solverResult = Solver.solve(mockState, 10000);
    
    // 6. Hard level protection
    if (!solverResult.solvable && !isFallback) {
      return null; // Reject unsolvable or overly complex puzzles
    }

    // 7. Difficulty Analysis
    const actualDifficulty = DifficultyEngine.analyzeDifficulty({
      levelId: '', seed: '', generatorVersion: '2.0', difficultyTarget: targetDifficulty,
      colorCount, tubeCount, tubeCapacity, emptyTubeCount, initialConfiguration: currentTubes, puzzleDNA, actualDifficulty: 0, qualityScore: 0
    }, solverResult);

    // 8. Easy level protection
    if (!isFallback && actualDifficulty < (targetDifficulty * 0.4)) {
      return null; // Reject trivial levels
    }

    // Calculate Quality Score
    const qualityScore = solverResult.solutionLength + (solverResult.nodesExplored / 100);

    return {
      levelId: `lvl_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      seed: Math.random().toString(),
      generatorVersion: '2.0',
      difficultyTarget: targetDifficulty,
      actualDifficulty,
      colorCount,
      tubeCount,
      tubeCapacity,
      emptyTubeCount,
      initialConfiguration: currentTubes,
      puzzleDNA,
      qualityScore
    };
  }

  public static generateDNA(tubes: number[][]): string {
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

    normalizedTubes.sort((a, b) => a.join(',').localeCompare(b.join(',')));
    return btoa(JSON.stringify(normalizedTubes));
  }
}
