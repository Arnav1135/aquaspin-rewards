using System;
using UnityEngine;
using UnityChess.Engine;
using UnityChess.Stability;

namespace UnityChess.Gameplay
{
    public class GameManager : MonoBehaviour
    {
        public static GameManager Instance { get; private set; }
        
        public ChessBoard Board { get; private set; }
        public BoardManager BoardRenderer;
        public InputManager InputHandler;

        public event Action<Move> OnMoveMade;
        public event Action<GameState> OnGameOver;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                Board = new ChessBoard();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            // Initialize board visuals safely
            StabilityManager.Instance.SafeExecute(() =>
            {
                BoardRenderer.InitializeBoard(Board);
            }, "InitializeBoardRenderer");
            
            InputHandler.OnSquareSelected += HandleSquareSelected;
        }

        private void HandleSquareSelected(int file, int rank)
        {
            // Input handling logic routed through StabilityManager
            StabilityManager.Instance.SafeExecute(() =>
            {
                ProcessSelection(file, rank);
            }, "ProcessSquareSelection");
        }

        private int selectedFile = -1;
        private int selectedRank = -1;

        private void ProcessSelection(int file, int rank)
        {
            if (Board.State != GameState.Playing) return;

            if (selectedFile == -1)
            {
                Piece p = Board.GetPiece(file, rank);
                if (!p.IsEmpty && p.Color == Board.CurrentTurn)
                {
                    selectedFile = file;
                    selectedRank = rank;
                    BoardRenderer.HighlightSquare(file, rank);
                    BoardRenderer.ShowLegalMoves(Board.GetLegalMoves().FindAll(m => m.FromFile == file && m.FromRank == rank));
                }
            }
            else
            {
                // Attempt to make a move
                var legalMoves = Board.GetLegalMoves();
                System.Collections.Generic.List<Move> matchingMoves = new System.Collections.Generic.List<Move>();
                
                foreach (var move in legalMoves)
                {
                    if (move.FromFile == selectedFile && move.FromRank == selectedRank && move.ToFile == file && move.ToRank == rank)
                    {
                        matchingMoves.Add(move);
                    }
                }

                if (matchingMoves.Count > 0)
                {
                    // Check if it's a promotion
                    if (matchingMoves[0].Promotion != PieceType.None)
                    {
                        // Needs promotion selection
                        if (UIManager.Instance != null)
                        {
                            UIManager.Instance.ShowPromotionUI((selectedType) => 
                            {
                                Move finalMove = matchingMoves.Find(m => m.Promotion == selectedType);
                                if (finalMove.FromFile == 0 && finalMove.ToFile == 0) finalMove = matchingMoves[0]; // fallback
                                FinalizeMove(finalMove);
                            });
                        }
                        else
                        {
                            // Fallback if no UI manager
                            FinalizeMove(matchingMoves[0]);
                        }
                    }
                    else
                    {
                        // Normal move
                        FinalizeMove(matchingMoves[0]);
                    }
                }
                else
                {
                    // Invalid move, clear selection or select new piece
                    BoardRenderer.ClearHighlights();
                    selectedFile = -1;
                    selectedRank = -1;
                    
                    Piece p = Board.GetPiece(file, rank);
                    if (!p.IsEmpty && p.Color == Board.CurrentTurn)
                    {
                        selectedFile = file;
                        selectedRank = rank;
                        BoardRenderer.HighlightSquare(file, rank);
                        BoardRenderer.ShowLegalMoves(legalMoves.FindAll(m => m.FromFile == file && m.FromRank == rank));
                    }
                }
            }
        }

        private void FinalizeMove(Move chosenMove)
        {
            // Play Audio
            if (AudioManager.Instance != null)
            {
                if (Board.GetPiece(chosenMove.ToFile, chosenMove.ToRank).IsEmpty)
                    AudioManager.Instance.PlayMoveSound();
                else
                    AudioManager.Instance.PlayCaptureSound();
            }

            Board.MakeMove(chosenMove);
            BoardRenderer.ClearHighlights();
            BoardRenderer.AnimateMove(chosenMove, Board);
            
            selectedFile = -1;
            selectedRank = -1;
            
            OnMoveMade?.Invoke(chosenMove);
            
            if (Board.State != GameState.Playing)
            {
                OnGameOver?.Invoke(Board.State);
                if (UIManager.Instance != null) UIManager.Instance.ShowGameOver(Board.State);
                if (AudioManager.Instance != null) AudioManager.Instance.PlayGameOverSound();
                Debug.Log($"Game Over! Result: {Board.State}");
            }
            else if (Board.IsKingInCheck(Board.CurrentTurn))
            {
                // Play capture sound as a generic alert for Check
                if (AudioManager.Instance != null) AudioManager.Instance.PlayCaptureSound();
            }
        }
        
        private void OnDestroy()
        {
            if (InputHandler != null)
                InputHandler.OnSquareSelected -= HandleSquareSelected;
        }
    }
}
