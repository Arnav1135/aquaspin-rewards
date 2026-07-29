using System;
using System.Collections.Generic;
using System.Linq;

namespace UnityChess.Engine
{
    public enum PieceColor { White, Black, None }
    public enum PieceType { Pawn, Knight, Bishop, Rook, Queen, King, None }
    public enum GameState { Playing, Checkmate, Stalemate, DrawFiftyMove, DrawRepetition, DrawInsufficientMaterial, DrawAgreed }

    public struct Piece
    {
        public PieceType Type;
        public PieceColor Color;
        
        public Piece(PieceType type, PieceColor color)
        {
            Type = type;
            Color = color;
        }

        public static Piece None => new Piece(PieceType.None, PieceColor.None);
        public bool IsEmpty => Type == PieceType.None;
    }

    public struct Move
    {
        public int FromFile;
        public int FromRank;
        public int ToFile;
        public int ToRank;
        public PieceType Promotion;
        public bool IsCapture;
        public bool IsEnPassant;
        public bool IsCastling;
        
        public Move(int ff, int fr, int tf, int tr, PieceType promo = PieceType.None)
        {
            FromFile = ff; FromRank = fr;
            ToFile = tf; ToRank = tr;
            Promotion = promo;
            IsCapture = false; IsEnPassant = false; IsCastling = false;
        }
    }

    public class ChessBoard
    {
        public Piece[,] Squares = new Piece[8, 8];
        public PieceColor CurrentTurn = PieceColor.White;
        public GameState State = GameState.Playing;
        
        public bool WhiteCastleKing = true;
        public bool WhiteCastleQueen = true;
        public bool BlackCastleKing = true;
        public bool BlackCastleQueen = true;

        public int EnPassantFile = -1; // -1 if none
        public int HalfMoveClock = 0; // For 50-move rule
        public int FullMoveNumber = 1;

        private List<ulong> PositionHashes = new List<ulong>();

        public ChessBoard()
        {
            InitializeStandardBoard();
        }

        public void InitializeStandardBoard()
        {
            for (int i = 0; i < 8; i++)
            {
                for (int j = 0; j < 8; j++)
                {
                    Squares[i, j] = Piece.None;
                }
            }

            // Pawns
            for (int i = 0; i < 8; i++)
            {
                Squares[i, 1] = new Piece(PieceType.Pawn, PieceColor.White);
                Squares[i, 6] = new Piece(PieceType.Pawn, PieceColor.Black);
            }

            // White Pieces
            Squares[0, 0] = new Piece(PieceType.Rook, PieceColor.White);
            Squares[1, 0] = new Piece(PieceType.Knight, PieceColor.White);
            Squares[2, 0] = new Piece(PieceType.Bishop, PieceColor.White);
            Squares[3, 0] = new Piece(PieceType.Queen, PieceColor.White);
            Squares[4, 0] = new Piece(PieceType.King, PieceColor.White);
            Squares[5, 0] = new Piece(PieceType.Bishop, PieceColor.White);
            Squares[6, 0] = new Piece(PieceType.Knight, PieceColor.White);
            Squares[7, 0] = new Piece(PieceType.Rook, PieceColor.White);

            // Black Pieces
            Squares[0, 7] = new Piece(PieceType.Rook, PieceColor.Black);
            Squares[1, 7] = new Piece(PieceType.Knight, PieceColor.Black);
            Squares[2, 7] = new Piece(PieceType.Bishop, PieceColor.Black);
            Squares[3, 7] = new Piece(PieceType.Queen, PieceColor.Black);
            Squares[4, 7] = new Piece(PieceType.King, PieceColor.Black);
            Squares[5, 7] = new Piece(PieceType.Bishop, PieceColor.Black);
            Squares[6, 7] = new Piece(PieceType.Knight, PieceColor.Black);
            Squares[7, 7] = new Piece(PieceType.Rook, PieceColor.Black);
            
            PositionHashes.Add(GenerateHash());
        }

        public Piece GetPiece(int file, int rank)
        {
            if (file < 0 || file > 7 || rank < 0 || rank > 7) return Piece.None;
            return Squares[file, rank];
        }

        public List<Move> GetLegalMoves()
        {
            List<Move> pseudoLegalMoves = GeneratePseudoLegalMoves(CurrentTurn);
            List<Move> legalMoves = new List<Move>();

            foreach (var move in pseudoLegalMoves)
            {
                if (IsLegalMove(move))
                {
                    legalMoves.Add(move);
                }
            }
            return legalMoves;
        }

        public bool IsLegalMove(Move move)
        {
            // Simulate the move
            ChessBoard clonedBoard = Clone();
            clonedBoard.MakeMoveInternal(move);
            return !clonedBoard.IsKingInCheck(CurrentTurn);
        }

        private List<Move> GeneratePseudoLegalMoves(PieceColor color)
        {
            List<Move> moves = new List<Move>();
            for (int f = 0; f < 8; f++)
            {
                for (int r = 0; r < 8; r++)
                {
                    Piece p = Squares[f, r];
                    if (p.Color == color)
                    {
                        switch (p.Type)
                        {
                            case PieceType.Pawn: GeneratePawnMoves(f, r, color, moves); break;
                            case PieceType.Knight: GenerateKnightMoves(f, r, color, moves); break;
                            case PieceType.Bishop: GenerateSlidingMoves(f, r, color, moves, true, false); break;
                            case PieceType.Rook: GenerateSlidingMoves(f, r, color, moves, false, true); break;
                            case PieceType.Queen: GenerateSlidingMoves(f, r, color, moves, true, true); break;
                            case PieceType.King: GenerateKingMoves(f, r, color, moves); break;
                        }
                    }
                }
            }
            return moves;
        }

        private void GeneratePawnMoves(int f, int r, PieceColor color, List<Move> moves)
        {
            int dir = color == PieceColor.White ? 1 : -1;
            int startRank = color == PieceColor.White ? 1 : 6;
            int promoRank = color == PieceColor.White ? 7 : 0;

            if (GetPiece(f, r + dir).IsEmpty)
            {
                AddPawnMove(f, r, f, r + dir, promoRank, moves);
                if (r == startRank && GetPiece(f, r + 2 * dir).IsEmpty)
                {
                    moves.Add(new Move(f, r, f, r + 2 * dir));
                }
            }

            for (int df = -1; df <= 1; df += 2)
            {
                if (f + df >= 0 && f + df <= 7)
                {
                    Piece target = GetPiece(f + df, r + dir);
                    if (!target.IsEmpty && target.Color != color)
                    {
                        var m = new Move(f, r, f + df, r + dir);
                        m.IsCapture = true;
                        if (r + dir == promoRank)
                        {
                            m.Promotion = PieceType.Queen;
                            moves.Add(m);
                        }
                        else moves.Add(m);
                    }
                    else if (f + df == EnPassantFile && ((color == PieceColor.White && r == 4) || (color == PieceColor.Black && r == 3)))
                    {
                        var m = new Move(f, r, f + df, r + dir);
                        m.IsCapture = true;
                        m.IsEnPassant = true;
                        moves.Add(m);
                    }
                }
            }
        }

        private void AddPawnMove(int f, int r, int tf, int tr, int promoRank, List<Move> moves)
        {
            if (tr == promoRank)
            {
                moves.Add(new Move(f, r, tf, tr, PieceType.Queen));
                moves.Add(new Move(f, r, tf, tr, PieceType.Rook));
                moves.Add(new Move(f, r, tf, tr, PieceType.Bishop));
                moves.Add(new Move(f, r, tf, tr, PieceType.Knight));
            }
            else moves.Add(new Move(f, r, tf, tr));
        }

        private void GenerateKnightMoves(int f, int r, PieceColor color, List<Move> moves)
        {
            int[] offsets = { -2, -1, -2, 1, -1, -2, -1, 2, 1, -2, 1, 2, 2, -1, 2, 1 };
            for (int i = 0; i < offsets.Length; i += 2)
            {
                int tf = f + offsets[i];
                int tr = r + offsets[i + 1];
                if (tf >= 0 && tf <= 7 && tr >= 0 && tr <= 7)
                {
                    Piece target = GetPiece(tf, tr);
                    if (target.Color != color)
                    {
                        var m = new Move(f, r, tf, tr);
                        if (!target.IsEmpty) m.IsCapture = true;
                        moves.Add(m);
                    }
                }
            }
        }

        private void GenerateSlidingMoves(int f, int r, PieceColor color, List<Move> moves, bool diagonal, bool straight)
        {
            int[][] dirs = new int[8][];
            int idx = 0;
            if (straight) { dirs[idx++] = new[] { 0, 1 }; dirs[idx++] = new[] { 0, -1 }; dirs[idx++] = new[] { 1, 0 }; dirs[idx++] = new[] { -1, 0 }; }
            if (diagonal) { dirs[idx++] = new[] { 1, 1 }; dirs[idx++] = new[] { 1, -1 }; dirs[idx++] = new[] { -1, 1 }; dirs[idx++] = new[] { -1, -1 }; }

            for (int i = 0; i < idx; i++)
            {
                int tf = f; int tr = r;
                while (true)
                {
                    tf += dirs[i][0]; tr += dirs[i][1];
                    if (tf < 0 || tf > 7 || tr < 0 || tr > 7) break;
                    Piece target = GetPiece(tf, tr);
                    if (target.Color == color) break;
                    
                    var m = new Move(f, r, tf, tr);
                    if (!target.IsEmpty)
                    {
                        m.IsCapture = true;
                        moves.Add(m);
                        break;
                    }
                    moves.Add(m);
                }
            }
        }

        private void GenerateKingMoves(int f, int r, PieceColor color, List<Move> moves)
        {
            for (int df = -1; df <= 1; df++)
            {
                for (int dr = -1; dr <= 1; dr++)
                {
                    if (df == 0 && dr == 0) continue;
                    int tf = f + df; int tr = r + dr;
                    if (tf >= 0 && tf <= 7 && tr >= 0 && tr <= 7)
                    {
                        Piece target = GetPiece(tf, tr);
                        if (target.Color != color)
                        {
                            var m = new Move(f, r, tf, tr);
                            if (!target.IsEmpty) m.IsCapture = true;
                            moves.Add(m);
                        }
                    }
                }
            }
            
            if (color == PieceColor.White)
            {
                if (WhiteCastleKing && GetPiece(5, 0).IsEmpty && GetPiece(6, 0).IsEmpty && !IsSquareAttacked(5, 0, PieceColor.Black) && !IsSquareAttacked(6, 0, PieceColor.Black) && !IsKingInCheck(PieceColor.White))
                    moves.Add(new Move(4, 0, 6, 0) { IsCastling = true });
                if (WhiteCastleQueen && GetPiece(3, 0).IsEmpty && GetPiece(2, 0).IsEmpty && GetPiece(1, 0).IsEmpty && !IsSquareAttacked(3, 0, PieceColor.Black) && !IsSquareAttacked(2, 0, PieceColor.Black) && !IsKingInCheck(PieceColor.White))
                    moves.Add(new Move(4, 0, 2, 0) { IsCastling = true });
            }
            else
            {
                if (BlackCastleKing && GetPiece(5, 7).IsEmpty && GetPiece(6, 7).IsEmpty && !IsSquareAttacked(5, 7, PieceColor.White) && !IsSquareAttacked(6, 7, PieceColor.White) && !IsKingInCheck(PieceColor.Black))
                    moves.Add(new Move(4, 7, 6, 7) { IsCastling = true });
                if (BlackCastleQueen && GetPiece(3, 7).IsEmpty && GetPiece(2, 7).IsEmpty && GetPiece(1, 7).IsEmpty && !IsSquareAttacked(3, 7, PieceColor.White) && !IsSquareAttacked(2, 7, PieceColor.White) && !IsKingInCheck(PieceColor.Black))
                    moves.Add(new Move(4, 7, 2, 7) { IsCastling = true });
            }
        }

        public bool IsKingInCheck(PieceColor kingColor)
        {
            int kf = -1, kr = -1;
            for (int f = 0; f < 8; f++)
                for (int r = 0; r < 8; r++)
                {
                    if (Squares[f, r].Type == PieceType.King && Squares[f, r].Color == kingColor)
                    {
                        kf = f; kr = r; break;
                    }
                }
            if (kf == -1) return false;
            
            PieceColor opponent = kingColor == PieceColor.White ? PieceColor.Black : PieceColor.White;
            return IsSquareAttacked(kf, kr, opponent);
        }

        public bool IsSquareAttacked(int f, int r, PieceColor attackerColor)
        {
            var moves = GeneratePseudoLegalMoves(attackerColor);
            foreach (var m in moves)
            {
                if (m.ToFile == f && m.ToRank == r) return true;
            }
            return false;
        }

        public bool MakeMove(Move move)
        {
            if (!IsLegalMove(move)) return false;
            
            MakeMoveInternal(move);
            UpdateGameState();
            return true;
        }

        private void MakeMoveInternal(Move move)
        {
            Piece p = Squares[move.FromFile, move.FromRank];
            Squares[move.FromFile, move.FromRank] = Piece.None;
            
            bool isCaptureOrPawnMove = Squares[move.ToFile, move.ToRank].Type != PieceType.None || p.Type == PieceType.Pawn;

            Squares[move.ToFile, move.ToRank] = move.Promotion != PieceType.None ? new Piece(move.Promotion, p.Color) : p;

            if (move.IsEnPassant)
            {
                int capturedPawnRank = p.Color == PieceColor.White ? move.ToRank - 1 : move.ToRank + 1;
                Squares[move.ToFile, capturedPawnRank] = Piece.None;
            }

            if (move.IsCastling)
            {
                if (move.ToFile == 6) { Squares[5, move.ToRank] = Squares[7, move.ToRank]; Squares[7, move.ToRank] = Piece.None; }
                else if (move.ToFile == 2) { Squares[3, move.ToRank] = Squares[0, move.ToRank]; Squares[0, move.ToRank] = Piece.None; }
            }

            if (p.Type == PieceType.King)
            {
                if (p.Color == PieceColor.White) { WhiteCastleKing = false; WhiteCastleQueen = false; }
                else { BlackCastleKing = false; BlackCastleQueen = false; }
            }
            if (p.Type == PieceType.Rook)
            {
                if (move.FromFile == 0 && move.FromRank == 0) WhiteCastleQueen = false;
                if (move.FromFile == 7 && move.FromRank == 0) WhiteCastleKing = false;
                if (move.FromFile == 0 && move.FromRank == 7) BlackCastleQueen = false;
                if (move.FromFile == 7 && move.FromRank == 7) BlackCastleKing = false;
            }

            EnPassantFile = -1;
            if (p.Type == PieceType.Pawn && Math.Abs(move.FromRank - move.ToRank) == 2)
            {
                EnPassantFile = move.FromFile;
            }

            if (isCaptureOrPawnMove) HalfMoveClock = 0;
            else HalfMoveClock++;

            if (CurrentTurn == PieceColor.Black) FullMoveNumber++;
            CurrentTurn = CurrentTurn == PieceColor.White ? PieceColor.Black : PieceColor.White;

            PositionHashes.Add(GenerateHash());
        }

        private void UpdateGameState()
        {
            var legalMoves = GetLegalMoves();
            
            if (legalMoves.Count == 0)
            {
                State = IsKingInCheck(CurrentTurn) ? GameState.Checkmate : GameState.Stalemate;
                return;
            }

            if (HalfMoveClock >= 100)
            {
                State = GameState.DrawFiftyMove;
                return;
            }

            int count = 0;
            ulong currentHash = PositionHashes.Last();
            foreach (var hash in PositionHashes)
            {
                if (hash == currentHash) count++;
            }
            if (count >= 3)
            {
                State = GameState.DrawRepetition;
                return;
            }

            State = GameState.Playing;
        }

        private ulong GenerateHash()
        {
            ulong hash = 0;
            for (int f = 0; f < 8; f++)
            {
                for (int r = 0; r < 8; r++)
                {
                    if (!Squares[f, r].IsEmpty)
                    {
                        hash ^= (ulong)(((int)Squares[f, r].Type + 1) * ((int)Squares[f, r].Color + 1) * (f * 8 + r + 1));
                    }
                }
            }
            hash ^= (ulong)CurrentTurn * 12345;
            if (WhiteCastleKing) hash ^= 23456;
            if (WhiteCastleQueen) hash ^= 34567;
            if (BlackCastleKing) hash ^= 45678;
            if (BlackCastleQueen) hash ^= 56789;
            if (EnPassantFile != -1) hash ^= (ulong)(EnPassantFile * 67890);
            return hash;
        }

        public ChessBoard Clone()
        {
            ChessBoard clone = new ChessBoard();
            Array.Copy(Squares, clone.Squares, Squares.Length);
            clone.CurrentTurn = CurrentTurn;
            clone.WhiteCastleKing = WhiteCastleKing;
            clone.WhiteCastleQueen = WhiteCastleQueen;
            clone.BlackCastleKing = BlackCastleKing;
            clone.BlackCastleQueen = BlackCastleQueen;
            clone.EnPassantFile = EnPassantFile;
            clone.HalfMoveClock = HalfMoveClock;
            clone.FullMoveNumber = FullMoveNumber;
            return clone;
        }
    }
}
