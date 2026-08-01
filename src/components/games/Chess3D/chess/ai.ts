import { Chess, Square } from 'chess.js';
import { AIDifficulty, PieceColor } from '../types';

/**
 * AI Chess Engine
 * Evaluates positional balance, material advantages, piece activity,
 * and performs alpha-beta min-max search for intelligent bot play.
 */

const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Positional advantage table for Pawns (rewards center advancement)
const PAWN_TABLE = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
   5,  5, 10, 25, 25, 10,  5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5, -5,-10,  0,  0,-10, -5,  5,
   5, 10, 10,-20,-20, 10, 10,  5,
   0,  0,  0,  0,  0,  0,  0,  0
];

// Positional advantage table for Knights (rewards central Outposts)
const KNIGHT_TABLE = [
  -50,-40,-30,-30,-30,-30,-40,-50,
  -40,-20,  0,  0,  0,  0,-20,-40,
  -30,  0, 10, 15, 15, 10,  0,-30,
  -30,  5, 15, 20, 20, 15,  5,-30,
  -30,  0, 15, 20, 20, 15,  0,-30,
  -30,  5, 10, 15, 15, 10,  5,-30,
  -40,-20,  0,  5,  5,  0,-20,-40,
  -50,-40,-30,-30,-30,-30,-40,-50
];

function evaluateBoard(chess: Chess, aiColor: PieceColor): number {
  let totalScore = 0;

  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece) {
        const val = PIECE_VALUES[piece.type] || 0;
        let posBonus = 0;

        const idx = piece.color === 'w' ? (7 - r) * 8 + c : r * 8 + c;
        if (piece.type === 'p') posBonus = PAWN_TABLE[idx];
        if (piece.type === 'n') posBonus = KNIGHT_TABLE[idx];

        const score = val + posBonus;
        if (piece.color === aiColor) {
          totalScore += score;
        } else {
          totalScore -= score;
        }
      }
    }
  }

  return totalScore;
}

function minimax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiColor: PieceColor
): number {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess, aiColor);
  }

  const moves = chess.moves({ verbose: true });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalVal = minimax(chess, depth - 1, alpha, beta, false, aiColor);
      chess.undo();
      maxEval = Math.max(maxEval, evalVal);
      alpha = Math.max(alpha, evalVal);
      if (beta <= alpha) break; // Alpha-beta cutoff
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      chess.move(move);
      const evalVal = minimax(chess, depth - 1, alpha, beta, true, aiColor);
      chess.undo();
      minEval = Math.min(minEval, evalVal);
      beta = Math.min(beta, evalVal);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getBestAIMove(
  chess: Chess,
  difficulty: AIDifficulty
): { from: string; to: string; promotion?: string } | null {
  const moves = chess.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy: Pick a random move 70% of the time, or best move 30%
  if (difficulty === 'easy') {
    if (Math.random() < 0.7) {
      const randomMove = moves[Math.floor(Math.random() * moves.length)];
      return { from: randomMove.from, to: randomMove.to, promotion: randomMove.promotion };
    }
  }

  const depth = difficulty === 'hard' ? 3 : 2;
  const aiColor = chess.turn() as PieceColor;

  let bestMove = moves[0];
  let bestScore = -Infinity;

  // Shuffle moves slightly so identical evaluations pick varied moves
  const shuffledMoves = [...moves].sort(() => Math.random() - 0.5);

  for (const move of shuffledMoves) {
    chess.move(move);
    const score = minimax(chess, depth - 1, -Infinity, Infinity, false, aiColor);
    chess.undo();

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion || 'q' };
}
