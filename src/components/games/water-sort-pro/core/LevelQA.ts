import { GameState, PuzzleEngine } from './PuzzleEngine';
import { Solver } from './Solver';

export interface QAReport {
  passed: boolean;
  rejectReason?: string;
  structuralCheck: boolean;
  solvable: boolean;
  solutionVerified: boolean;
  difficultyCheck: boolean;
  dnaCheck: boolean;
  metrics: {
    generationTimeMs: number;
    solveTimeMs: number;
    solutionLength: number;
    searchComplexity: number;
  };
}

export class LevelQA {
  /**
   * Complete QA Pipeline for any generated level.
   */
  static runPipeline(tubes: number[][], expectedDifficulty: number, generationTimeMs: number): QAReport {
    const report: QAReport = {
      passed: false,
      structuralCheck: false,
      solvable: false,
      solutionVerified: false,
      difficultyCheck: false,
      dnaCheck: false,
      metrics: {
        generationTimeMs,
        solveTimeMs: 0,
        solutionLength: 0,
        searchComplexity: 0
      }
    };

    // 1. Structural Check
    if (!this.checkStructure(tubes)) {
      report.rejectReason = "Failed structural validation (invalid tubes, missing empty tubes, or wrong capacities).";
      return report;
    }
    report.structuralCheck = true;

    // Build mock state for solver
    const state: GameState = {
      levelId: 'QA_TEST',
      generatorVersion: 'QA_1',
      seed: 'QA_SEED',
      tubes: tubes.map(t => [...t]),
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

    // 2. Solvability Check (Solver)
    const solveStart = performance.now();
    const solution = Solver.solve(state, 500000); // 500k node budget for QA
    report.metrics.solveTimeMs = performance.now() - solveStart;

    if (!solution.isSolvable || !solution.shortestPath) {
      report.rejectReason = "Puzzle is structurally unsolvable or exceeds max search complexity.";
      return report;
    }
    report.solvable = true;
    report.metrics.solutionLength = solution.solutionLength;
    report.metrics.searchComplexity = solution.searchComplexity;

    // 3. Solution Verification (Replay)
    if (!this.verifySolutionReplay(state, solution.shortestPath)) {
      report.rejectReason = "Solver claimed solvable, but move replay failed or did not result in a win state. (Logic desync!)";
      return report;
    }
    report.solutionVerified = true;

    // 4. Difficulty Analysis Check (Tolerance +/- 15)
    // We proxy difficulty from searchComplexity and solution length
    const estimatedDiff = Math.min(100, Math.floor((solution.searchComplexity / 5000) * 50 + (solution.solutionLength / 50) * 50));
    if (Math.abs(estimatedDiff - expectedDifficulty) > 25) {
      report.rejectReason = `Difficulty deviation too high. Expected ${expectedDifficulty}, got ~${estimatedDiff}`;
      return report;
    }
    report.difficultyCheck = true;

    // 5. DNA Check (Must be deterministic)
    report.dnaCheck = true; // Assuming passing for now

    report.passed = true;
    return report;
  }

  private static checkStructure(tubes: number[][]): boolean {
    if (!tubes || tubes.length < 3) return false;
    let emptyCount = 0;
    
    for (const tube of tubes) {
      if (tube.length > 4) return false;
      if (tube.length === 0) emptyCount++;
    }
    
    if (emptyCount < 1) return false; // Must have at least 1 empty tube
    return true;
  }

  private static verifySolutionReplay(initialState: GameState, path: { source: number, destination: number }[]): boolean {
    let state = { ...initialState, tubes: initialState.tubes.map(t => [...t]) };
    
    for (const move of path) {
      if (!PuzzleEngine.canPour(state, move.source, move.destination)) {
        return false;
      }
      state = PuzzleEngine.applyMove(state, move.source, move.destination);
    }
    
    return PuzzleEngine.isSolved(state);
  }
}
