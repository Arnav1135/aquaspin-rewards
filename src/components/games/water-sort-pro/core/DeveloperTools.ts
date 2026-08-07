import { LevelGenerator } from './LevelGenerator';
import { LevelQA, QAReport } from './LevelQA';
import { Solver } from './Solver';
import { GameState } from './PuzzleEngine';

export class DeveloperTools {
  static async runQAStressTest(iterations = 100): Promise<{ passes: number, fails: number, logs: string[] }> {
    const logs: string[] = [];
    let passes = 0;
    let fails = 0;

    logs.push(`Starting Stress Test: ${iterations} Levels`);
    
    for (let i = 0; i < iterations; i++) {
      const startMs = performance.now();
      const diff = 50 + (i % 50); // cycle through difficulties
      
      const level = LevelGenerator.generate(i + 1, diff);
      const genTime = performance.now() - startMs;
      
      const report = LevelQA.runPipeline(level, diff, genTime);
      
      if (report.passed) {
        passes++;
      } else {
        fails++;
        logs.push(`Level ${i + 1} (Diff: ${diff}) FAILED: ${report.rejectReason}`);
      }
      
      // Yield to main thread every 10 iterations to prevent UI freeze during test
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }
    
    logs.push(`Stress Test Complete. PASS: ${passes}, FAIL: ${fails}`);
    return { passes, fails, logs };
  }

  static benchmarkSolver(tubes: number[][]): { timeMs: number, solvable: boolean, nodes: number } {
    const state: GameState = {
      levelId: 'BENCH',
      generatorVersion: '1',
      seed: '1',
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

    const start = performance.now();
    const result = Solver.solve(state, 1000000); // 1 million node limit
    const timeMs = performance.now() - start;

    return {
      timeMs,
      solvable: result.isSolvable,
      nodes: result.searchComplexity
    };
  }
}
