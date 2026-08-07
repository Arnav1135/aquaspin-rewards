import { GameState, PuzzleEngine } from './PuzzleEngine';

export interface SolverResult {
  solvable: boolean;
  solution: { source: number, destination: number }[] | null;
  solutionLength: number;
  nodesExplored: number;
  executionTime: number;
  optimal: boolean;
}

export class Solver {
  /**
   * Simple BFS solver to find shortest path
   */
  public static solve(state: GameState, maxNodes = 50000): SolverResult {
    const startTime = performance.now();
    
    // Hash state for visited set
    const hashState = (tubes: number[][]) => {
      // Sort tubes to handle permutation symmetries
      const sortedTubes = [...tubes].map(t => t.join(',')).sort();
      return sortedTubes.join('|');
    };

    const queue: { tubes: number[][], path: { source: number, destination: number }[] }[] = [];
    const visited = new Set<string>();

    queue.push({ tubes: state.tubes, path: [] });
    visited.add(hashState(state.tubes));

    let nodesExplored = 0;

    while (queue.length > 0 && nodesExplored < maxNodes) {
      const current = queue.shift()!;
      nodesExplored++;

      // Create a temporary mock GameState to use PuzzleEngine methods
      const mockState = { ...state, tubes: current.tubes };

      if (PuzzleEngine.isSolved(mockState)) {
        return {
          solvable: true,
          solution: current.path,
          solutionLength: current.path.length,
          nodesExplored,
          executionTime: performance.now() - startTime,
          optimal: true
        };
      }

      // Generate moves
      for (let i = 0; i < current.tubes.length; i++) {
        for (let j = 0; j < current.tubes.length; j++) {
          if (i !== j && PuzzleEngine.canPour(mockState, i, j)) {
            const nextState = PuzzleEngine.applyMove(mockState, i, j);
            const hash = hashState(nextState.tubes);
            
            if (!visited.has(hash)) {
              visited.add(hash);
              queue.push({ tubes: nextState.tubes, path: [...current.path, { source: i, destination: j }] });
            }
          }
        }
      }
    }

    return {
      solvable: false,
      solution: null,
      solutionLength: 0,
      nodesExplored,
      executionTime: performance.now() - startTime,
      optimal: false
    };
  }
}
