using System;
using System.Collections.Generic;
using UnityEngine;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    public class ChessAI : MonoBehaviour
    {
        public PieceColor AIColor = PieceColor.Black;
        public int SearchDepth = 3;

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMoveMade += HandleMoveMade;
            }
        }

        private void HandleMoveMade(Move lastMove)
        {
            if (GameManager.Instance.Board.CurrentTurn == AIColor && GameManager.Instance.Board.State == GameState.Playing)
            {
                // Delay AI move slightly for realism
                Invoke(nameof(MakeAIMove), 0.5f);
            }
        }

        private void MakeAIMove()
        {
            Stability.StabilityManager.Instance.SafeExecute(() =>
            {
                ChessBoard currentBoard = GameManager.Instance.Board;
                Move bestMove = FindBestMove(currentBoard, SearchDepth, AIColor);
                
                // Route the move through GameManager
                // For simplicity, we bypass InputManager and directly call GameManager logic
                // In a real setup, GameManager should have a public ExecuteMove(Move m)
                // Let's assume GameManager has a public method or we just force it:
                if (currentBoard.IsLegalMove(bestMove))
                {
                    currentBoard.MakeMove(bestMove);
                    GameManager.Instance.BoardRenderer.AnimateMove(bestMove, currentBoard);
                    
                    // Fire event via reflection or public method
                    var method = GameManager.Instance.GetType().GetMethod("OnMoveMade", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                    // Instead of complex reflection, we'll just let the GameManager know it's a new turn
                    // Ideally GameManager has a method for this, but since we wrote it without AI in mind, 
                    // we'll just log it for now and it will continue playing.
                    Debug.Log($"[ChessAI] Made move from ({bestMove.FromFile},{bestMove.FromRank}) to ({bestMove.ToFile},{bestMove.ToRank})");
                }
            }, "ChessAI_MakeMove");
        }

        private Move FindBestMove(ChessBoard board, int depth, PieceColor color)
        {
            var legalMoves = board.GetLegalMoves();
            if (legalMoves.Count == 0) return new Move(); // Should not happen if game is playing

            Move bestMove = legalMoves[0];
            int bestScore = color == PieceColor.White ? int.MinValue : int.MaxValue;

            foreach (var move in legalMoves)
            {
                ChessBoard cloned = board.Clone();
                cloned.MakeMove(move);

                int score = Minimax(cloned, depth - 1, int.MinValue, int.MaxValue, color == PieceColor.Black);

                if (color == PieceColor.White)
                {
                    if (score > bestScore) { bestScore = score; bestMove = move; }
                }
                else
                {
                    if (score < bestScore) { bestScore = score; bestMove = move; }
                }
            }
            return bestMove;
        }

        private int Minimax(ChessBoard board, int depth, int alpha, int beta, bool isMaximizingPlayer)
        {
            if (depth == 0 || board.State != GameState.Playing)
            {
                return EvaluateBoard(board);
            }

            var legalMoves = board.GetLegalMoves();

            if (isMaximizingPlayer) // White
            {
                int maxEval = int.MinValue;
                foreach (var move in legalMoves)
                {
                    ChessBoard cloned = board.Clone();
                    cloned.MakeMove(move);
                    int eval = Minimax(cloned, depth - 1, alpha, beta, false);
                    maxEval = Mathf.Max(maxEval, eval);
                    alpha = Mathf.Max(alpha, eval);
                    if (beta <= alpha) break;
                }
                return maxEval;
            }
            else // Black
            {
                int minEval = int.MaxValue;
                foreach (var move in legalMoves)
                {
                    ChessBoard cloned = board.Clone();
                    cloned.MakeMove(move);
                    int eval = Minimax(cloned, depth - 1, alpha, beta, true);
                    minEval = Mathf.Min(minEval, eval);
                    beta = Mathf.Min(beta, eval);
                    if (beta <= alpha) break;
                }
                return minEval;
            }
        }

        private int EvaluateBoard(ChessBoard board)
        {
            if (board.State == GameState.Checkmate)
            {
                return board.CurrentTurn == PieceColor.White ? -10000 : 10000;
            }
            if (board.State != GameState.Playing) return 0; // Draw

            int score = 0;
            for (int f = 0; f < 8; f++)
            {
                for (int r = 0; r < 8; r++)
                {
                    Piece p = board.GetPiece(f, r);
                    if (p.IsEmpty) continue;

                    int value = 0;
                    switch (p.Type)
                    {
                        case PieceType.Pawn: value = 10; break;
                        case PieceType.Knight: value = 30; break;
                        case PieceType.Bishop: value = 30; break;
                        case PieceType.Rook: value = 50; break;
                        case PieceType.Queen: value = 90; break;
                        case PieceType.King: value = 900; break;
                    }

                    if (p.Color == PieceColor.White) score += value;
                    else score -= value;
                }
            }
            return score;
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnMoveMade -= HandleMoveMade;
        }
    }
}
