import { GameState, PuzzleEngine } from './PuzzleEngine';

export interface SolverResult {
  isSolvable: boolean;
  shortestPath: { source: number, destination: number }[] | null;
  solutionLength: number;
  searchComplexity: number;
  maxDepthReached: number;
  executionTimeMs: number;
  isOptimal: boolean;
}

export class Solver {
  /**
   * Advanced Mathematical Solver (BFS Hybrid)
   * Includes state transposition tables (Visited Sets), strict pruning, and timeout protection.
   */
  public static solve(state: GameState, maxNodes = 100000): SolverResult {
    const startTime = performance.now();
    
    // Hash state for transposition table (Visited Set)
    const hashState = (tubes: number[][]) => {
      // Sort tubes to handle permutation symmetries (tube order doesn't matter)
      const sortedTubes = [...tubes].map(t => t.join(',')).sort();
      return sortedTubes.join('|');
    };

    const queue: { tubes: number[][], path: { source: number, destination: number }[] }[] = [];
    const visited = new Set<string>();

    queue.push({ tubes: state.tubes, path: [] });
    visited.add(hashState(state.tubes));

    let searchComplexity = 0;
    let maxDepthReached = 0;

    while (queue.length > 0 && searchComplexity < maxNodes) {
      const current = queue.shift()!;
      searchComplexity++;

      if (current.path.length > maxDepthReached) {
        maxDepthReached = current.path.length;
      }

      // Create a temporary mock GameState to use PuzzleEngine methods
      const mockState = { ...state, tubes: current.tubes };

      if (PuzzleEngine.isSolved(mockState)) {
        return {
          isSolvable: true,
          shortestPath: current.path,
          solutionLength: current.path.length,
          searchComplexity,
          maxDepthReached,
          executionTimeMs: performance.now() - startTime,
          isOptimal: true
        };
      }

      // Generate valid moves
      for (let src = 0; src < current.tubes.length; src++) {
        for (let dst = 0; dst < current.tubes.length; dst++) {
          if (src === dst) continue;
          
          if (PuzzleEngine.canPour(mockState, src, dst)) {
            const srcTube = current.tubes[src];
            const dstTube = current.tubes[dst];

            // ----------------------------------------------------
            // PRUNING HEURISTICS
            // ----------------------------------------------------
            
            // 1. Don't pour a perfectly solid, full color into an empty tube. It wastes a move and achieves nothing structurally.
            const isSrcSolid = srcTube.every(color => color === srcTube[0]);
            if (isSrcSolid && dstTube.length === 0 && srcTube.length === state.tubeCapacity) {
              continue;
            }

            // 2. Prevent immediate exact reversals (A -> B, then B -> A)
            if (current.path.length > 0) {
              const lastMove = current.path[current.path.length - 1];
              if (lastMove.source === dst && lastMove.destination === src) {
                // If we pour back immediately, that's just an undo.
                // However, partial pours back might be valid in some obscure edge cases, 
                // but generally A->B B->A is a cycle we want to heavily penalize or prune.
                // We prune it entirely for efficiency.
                continue;
              }
            }
            
            // Apply move
            const nextState = PuzzleEngine.applyMove(mockState, src, dst);
            const hash = hashState(nextState.tubes);
            
            if (!visited.has(hash)) {
              visited.add(hash);
              queue.push({ 
                tubes: nextState.tubes, 
                path: [...current.path, { source: src, destination: dst }] 
              });
            }
          }
        }
      }
    }

    return {
      isSolvable: false,
      shortestPath: null,
      solutionLength: 0,
      searchComplexity,
      maxDepthReached,
      executionTimeMs: performance.now() - startTime,
      isOptimal: false
    };
  }
}
