import { GameState, Move, PuzzleEngine } from './PuzzleEngine';
import { Solver } from './Solver';

export enum MoveCategory {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  POOR = 'POOR',
  DEADLOCK = 'DEADLOCK'
}

export interface MoveAnalysis {
  move: Move;
  category: MoveCategory;
  score: number;
  explanation: string;
}

export interface Hint {
  level: number;
  recommendedMove?: Move;
  explanation?: string;
  sequence?: Move[];
  fullSolution?: Move[];
}

export class HintEngine {
  /**
   * Get all legal moves for a given state.
   */
  private static getLegalMoves(state: GameState): Move[] {
    const moves: Move[] = [];
    for (let i = 0; i < state.tubes.length; i++) {
      for (let j = 0; j < state.tubes.length; j++) {
        if (i !== j && PuzzleEngine.canPour(state, i, j)) {
          const amount = PuzzleEngine.getPourAmount(state, i, j);
          moves.push({ source: i, destination: j, amount });
        }
      }
    }
    return moves;
  }

  /**
   * Evaluate the strategic value of a move.
   */
  public static evaluateMove(state: GameState, move: Move): MoveAnalysis {
    const sourceTube = state.tubes[move.source];
    const destTube = state.tubes[move.destination];
    
    let score = 0;
    let explanation = "A neutral move.";
    let category = MoveCategory.NEUTRAL;
    
    // Check what we are exposing
    const movedColor = sourceTube[sourceTube.length - 1];
    const sourceRemaining = sourceTube.length - move.amount;
    
    const isClearingSource = sourceRemaining === 0;
    const isFillingDest = destTube.length + move.amount === state.tubeCapacity;
    
    // Penalize moving from empty to empty (useless)
    if (destTube.length === 0 && sourceTube.every(c => c === movedColor)) {
      return { move, category: MoveCategory.POOR, score: -100, explanation: "Moving a sorted color to another empty tube achieves nothing." };
    }
    
    if (isClearingSource) {
      score += 50;
      explanation = "Frees up an empty tube for future mobility.";
    } else {
      const exposedColor = sourceTube[sourceRemaining - 1];
      if (exposedColor !== movedColor) {
        score += 20;
        explanation = `Frees the layer to make the hidden color accessible.`;
      }
    }
    
    if (destTube.length > 0) {
      score += 30; // Consolidating colors is good
      explanation = "Consolidates matching colors together.";
    }
    
    if (isFillingDest && destTube.every(c => c === movedColor)) {
      score += 100;
      category = MoveCategory.EXCELLENT;
      explanation = "Perfectly completes a color tube!";
    }
    
    if (category !== MoveCategory.EXCELLENT) {
      if (score > 40) category = MoveCategory.GOOD;
      else if (score < 0) category = MoveCategory.POOR;
    }

    return { move, category, score, explanation };
  }

  /**
   * Get the best available moves, ranked.
   */
  public static getRankedMoves(state: GameState): MoveAnalysis[] {
    const moves = this.getLegalMoves(state);
    const analyzed = moves.map(m => this.evaluateMove(state, m));
    
    // Sort descending by score
    analyzed.sort((a, b) => b.score - a.score);
    
    // Validate with solver to ensure it doesn't lead to deadlock
    // For performance, we only check the top 3 moves if they are actually solvable
    for (let i = 0; i < Math.min(3, analyzed.length); i++) {
      const simulated = PuzzleEngine.applyMove(state, analyzed[i].move.source, analyzed[i].move.destination);
      const solution = Solver.solve(simulated);
      if (solution.moves.length === 0 && !PuzzleEngine.isSolved(simulated)) {
        analyzed[i].category = MoveCategory.DEADLOCK;
        analyzed[i].score = -1000;
        analyzed[i].explanation = "This move leads to an unsolvable deadlock.";
      }
    }
    
    analyzed.sort((a, b) => b.score - a.score);
    return analyzed;
  }

  /**
   * Request a hint at a specific level.
   * Level 1: Visual only (Source/Dest highlight returned in UI)
   * Level 2: Recommended move (Source -> Dest)
   * Level 3: Strategic explanation
   * Level 4: Short sequence (next 3 moves)
   * Level 5: Full verified solve
   */
  public static getHint(state: GameState, hintLevel: number): Hint {
    const bestMoves = this.getRankedMoves(state);
    
    if (bestMoves.length === 0) {
      return { level: hintLevel, explanation: "No legal moves remain!" };
    }
    
    const bestMove = bestMoves[0];
    
    // For levels 4 and 5, we need the actual solver
    let sequence: Move[] | undefined = undefined;
    let fullSolution: Move[] | undefined = undefined;
    
    if (hintLevel >= 4) {
      const solverResult = Solver.solve(state);
      if (solverResult.isSolvable) {
        fullSolution = solverResult.moves;
        sequence = fullSolution.slice(0, 3);
        // Override bestMove to be exactly what solver wants, in case heuristics failed
        if (fullSolution.length > 0) {
          bestMove.move = fullSolution[0];
          bestMove.explanation = this.evaluateMove(state, bestMove.move).explanation;
        }
      } else {
        return { level: hintLevel, explanation: "Puzzle is currently unsolvable from this state. Undo required." };
      }
    }

    return {
      level: hintLevel,
      recommendedMove: bestMove.move,
      explanation: hintLevel >= 3 ? bestMove.explanation : undefined,
      sequence: hintLevel === 4 ? sequence : undefined,
      fullSolution: hintLevel === 5 ? fullSolution : undefined
    };
  }
}
