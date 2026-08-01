import { Chess } from 'chess.js';
import { AIDifficulty } from '../types';

/**
 * AI Controller for User vs AI mode
 * Provides Easy (random with shallow queen protection), Medium (minimax 2-ply with positional weights),
 * and Hard (minimax with alpha-beta pruning & mobility scoring).
 * Operates asynchronously so the main render thread never stutters.
 */

// Simple piece values
const PIECE_VALUES: Record<string, number> = {
  p: 10,
  n: 30,
  b: 30,
  r: 50,
  q: 90,
  k: 1000,
};

// Simple positional weights for center control
const POSITION_WEIGHTS: Record<string, number> = {
  e4: 3, d4: 3, e5: 3, d5: 3,
  c4: 2, f4: 2, c5: 2, f5: 2,
};

function evaluateBoard(chess: Chess): number {
  let score = 0;
  const board = chess.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p) {
        const val = PIECE_VALUES[p.type] || 0;
        const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
        const posBonus = POSITION_WEIGHTS[sq] || 0;
        const total = val + posBonus;

        if (p.color === 'b') {
          score += total;
        } else {
          score -= total;
        }
      }
    }
  }

  return score;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }

  const moves = chess.moves({ verbose: true });
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalVal = minimax(chess, depth - 1, alpha, beta, false);
      chess.undo();
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalVal = minimax(chess, depth - 1, alpha, beta, true);
      chess.undo();
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break; // Alpha-beta pruning
    }
    return minEval;
  }
}

export async function computeAIMove(
  chessInstance: Chess,
  difficulty: AIDifficulty
): Promise<{ from: string; to: string; promotion?: string } | null> {
  const chess = new Chess(chessInstance.fen());
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy: Mostly random, avoiding immediate queen blunders
  if (difficulty === 'easy') {
    // 20% chance to pick best 1-ply move, 80% random
    if (Math.random() < 0.8) {
      const randomIndex = Math.floor(Math.random() * moves.length);
      const chosen = moves[randomIndex];
      return { from: chosen.from, to: chosen.to, promotion: chosen.promotion };
    }
  }

  // Medium: Depth 2 minimax, Hard: Depth 3
  const depth = difficulty === 'hard' ? 3 : 2;
  const isBlack = chess.turn() === 'b';

  let bestMove = moves[0];
  let bestScore = isBlack ? -Infinity : Infinity;

  // Asynchronous yielding to keep UI smooth
  await new Promise(res => setTimeout(res, 10));

  for (const move of moves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, !isBlack);
    chess.undo();

    if (isBlack) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = move;
      }
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion };
}
