using System.Collections.Generic;
using UnityEngine;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    public class BoardManager : MonoBehaviour
    {
        [Header("Board Settings")]
        public float SquareSize = 1.0f;
        public Material LightSquareMaterial;
        public Material DarkSquareMaterial;
        public Material HighlightMaterial;

        [Header("Piece Prefabs (Placeholders)")]
        public GameObject[] WhitePiecePrefabs; // Indexed by PieceType enum: Pawn=0, Knight=1, etc.
        public GameObject[] BlackPiecePrefabs;

        private GameObject[,] squares = new GameObject[8, 8];
        private GameObject[,] pieceInstances = new GameObject[8, 8];
        private List<GameObject> highlightInstances = new List<GameObject>();

        public void InitializeBoard(ChessBoard engineBoard)
        {
            GenerateBoardGeometry();
            SpawnPieces(engineBoard);
        }

        private void GenerateBoardGeometry()
        {
            for (int file = 0; file < 8; file++)
            {
                for (int rank = 0; rank < 8; rank++)
                {
                    GameObject square = GameObject.CreatePrimitive(PrimitiveType.Quad);
                    square.transform.parent = transform;
                    square.transform.localPosition = new Vector3(file * SquareSize, 0, rank * SquareSize);
                    square.transform.rotation = Quaternion.Euler(90, 0, 0); // Lay flat
                    square.name = $"Square_{file}_{rank}";
                    
                    var renderer = square.GetComponent<MeshRenderer>();
                    renderer.material = (file + rank) % 2 == 0 ? DarkSquareMaterial : LightSquareMaterial;
                    
                    // Add collider for raycasting
                    var collider = square.GetComponent<MeshCollider>();
                    if (collider == null) square.AddComponent<BoxCollider>();

                    squares[file, rank] = square;
                }
            }
        }

        private void SpawnPieces(ChessBoard board)
        {
            for (int file = 0; file < 8; file++)
            {
                for (int rank = 0; rank < 8; rank++)
                {
                    Piece p = board.GetPiece(file, rank);
                    if (!p.IsEmpty)
                    {
                        SpawnPieceAt(p, file, rank);
                    }
                }
            }
        }

        private void SpawnPieceAt(Piece p, int file, int rank)
        {
            GameObject[] prefabs = p.Color == PieceColor.White ? WhitePiecePrefabs : BlackPiecePrefabs;
            int typeIndex = (int)p.Type;
            
            if (prefabs != null && prefabs.Length > typeIndex && prefabs[typeIndex] != null)
            {
                GameObject piece = Instantiate(prefabs[typeIndex], transform);
                piece.transform.localPosition = new Vector3(file * SquareSize, 0.5f, rank * SquareSize);
                pieceInstances[file, rank] = piece;
            }
            else
            {
                // Load authentic 3D model from Resources
                string modelName = p.Type.ToString().ToLower();
                GameObject prefab = Resources.Load<GameObject>($"Pieces/{modelName}");
                GameObject piece;
                if (prefab != null)
                {
                    piece = Instantiate(prefab, transform);
                    piece.name = p.Type.ToString();
                    
                    // The OBJ model may have a child mesh, we need to extract the MeshFilter/Renderer
                    var meshFilters = piece.GetComponentsInChildren<MeshFilter>();
                    var renderers = piece.GetComponentsInChildren<MeshRenderer>();
                    
                    // Assign High-End PBR Material
                    Material mat = Resources.Load<Material>(p.Color == PieceColor.White ? "Materials/WhitePiece" : "Materials/BlackPiece");
                    if (mat == null)
                    {
                        mat = new Material(Shader.Find("Standard"));
                        mat.color = p.Color == PieceColor.White ? new Color(0.95f, 0.95f, 0.92f) : new Color(0.05f, 0.05f, 0.05f);
                        mat.SetFloat("_Glossiness", p.Color == PieceColor.White ? 0.8f : 0.9f);
                        mat.SetFloat("_Metallic", 0.1f);
                    }

                    foreach (var renderer in renderers)
                    {
                        renderer.material = mat;
                    }

                    piece.transform.localPosition = new Vector3(file * SquareSize, 0f, rank * SquareSize);
                    
                    // Adjust scale and rotation if the STL/OBJ exported size is weird
                    piece.transform.localScale = new Vector3(0.15f, 0.15f, 0.15f); // Start with an estimated scale
                    piece.transform.localRotation = Quaternion.Euler(-90, 0, 0); // Common fix for STL exports
                }
                else
                {
                    // absolute fallback if resources are missing
                    piece = GameObject.CreatePrimitive(PrimitiveType.Cylinder);
                    piece.transform.parent = transform;
                    piece.transform.localPosition = new Vector3(file * SquareSize, 0.5f, rank * SquareSize);
                }
                
                pieceInstances[file, rank] = piece;
            }
        }

        public void HighlightSquare(int file, int rank)
        {
            GameObject highlight = GameObject.CreatePrimitive(PrimitiveType.Quad);
            highlight.transform.parent = transform;
            highlight.transform.localPosition = new Vector3(file * SquareSize, 0.01f, rank * SquareSize);
            highlight.transform.rotation = Quaternion.Euler(90, 0, 0);
            
            var renderer = highlight.GetComponent<MeshRenderer>();
            if (HighlightMaterial != null) renderer.material = HighlightMaterial;
            else renderer.material.color = new Color(1, 1, 0, 0.5f); // Yellowish tint

            Destroy(highlight.GetComponent<Collider>());
            highlightInstances.Add(highlight);
        }

        public void ShowLegalMoves(List<Move> moves)
        {
            foreach (var m in moves)
            {
                HighlightSquare(m.ToFile, m.ToRank);
            }
        }

        public void ClearHighlights()
        {
            foreach (var h in highlightInstances)
            {
                Destroy(h);
            }
            highlightInstances.Clear();
        }

        public void AnimateMove(Move move, ChessBoard currentBoardState)
        {
            GameObject pieceToMove = pieceInstances[move.FromFile, move.FromRank];
            pieceInstances[move.FromFile, move.FromRank] = null;

            // Handle captures immediately visually or delay it to the end of movement?
            // For stability, we'll fade out the captured piece at the end of the move, but logically remove it now
            GameObject capturedPiece = pieceInstances[move.ToFile, move.ToRank];
            
            GameObject enPassantPawn = null;
            if (move.IsEnPassant)
            {
                int capturedRank = currentBoardState.CurrentTurn == PieceColor.White ? move.ToRank - 1 : move.ToRank + 1;
                enPassantPawn = pieceInstances[move.ToFile, capturedRank];
                pieceInstances[move.ToFile, capturedRank] = null;
            }

            Vector3 targetPos = new Vector3(move.ToFile * SquareSize, 0f, move.ToRank * SquareSize);
            StartCoroutine(AnimatePieceMovement(pieceToMove, targetPos, capturedPiece, enPassantPawn));

            pieceInstances[move.ToFile, move.ToRank] = pieceToMove;

            // Handle castling rook movement
            if (move.IsCastling)
            {
                if (move.ToFile == 6) // Kingside
                {
                    GameObject rook = pieceInstances[7, move.FromRank];
                    pieceInstances[7, move.FromRank] = null;
                    Vector3 rookTarget = new Vector3(5 * SquareSize, 0f, move.ToRank * SquareSize);
                    StartCoroutine(AnimatePieceMovement(rook, rookTarget, null, null));
                    pieceInstances[5, move.FromRank] = rook;
                }
                else if (move.ToFile == 2) // Queenside
                {
                    GameObject rook = pieceInstances[0, move.FromRank];
                    pieceInstances[0, move.FromRank] = null;
                    Vector3 rookTarget = new Vector3(3 * SquareSize, 0f, move.ToRank * SquareSize);
                    StartCoroutine(AnimatePieceMovement(rook, rookTarget, null, null));
                    pieceInstances[3, move.FromRank] = rook;
                }
            }
            
            // Handle promotion visual replacement (simplified for placeholder)
            if (move.Promotion != PieceType.None)
            {
                // We'll just change color to Gold for promotion to make it obvious
                var renderer = pieceToMove.GetComponent<MeshRenderer>();
                if (renderer != null) renderer.material.color = Color.yellow;
            }
        }

        private System.Collections.IEnumerator AnimatePieceMovement(GameObject piece, Vector3 targetPos, GameObject capturedPiece, GameObject enPassantPawn)
        {
            if (piece == null) yield break;

            Vector3 startPos = piece.transform.localPosition;
            float duration = 0.5f; // Slower, more cinematic
            float elapsed = 0f;
            float arcHeight = 0.8f;

            // Optional: Slide captured piece off board
            if (capturedPiece != null)
            {
                StartCoroutine(SlideOffBoard(capturedPiece));
            }
            if (enPassantPawn != null)
            {
                StartCoroutine(SlideOffBoard(enPassantPawn));
            }

            while (elapsed < duration)
            {
                if (piece == null) yield break; // Safety check

                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                
                // Ease-in-out
                float smoothT = t * t * (3f - 2f * t);

                Vector3 currentPos = Vector3.Lerp(startPos, targetPos, smoothT);
                
                // Parabolic lift and drop with slight bounce feeling
                // A bounce could be simulated by dipping slightly below or just landing hard, but let's stick to a clean parabola
                float height = Mathf.Sin(t * Mathf.PI) * arcHeight;
                if (t > 0.8f) // Settle phase
                {
                    float settle = (t - 0.8f) / 0.2f;
                    height += Mathf.Sin(settle * Mathf.PI * 2f) * 0.1f * (1f - settle); // Tiny bounce
                }
                
                currentPos.y += height;

                piece.transform.localPosition = currentPos;
                yield return null;
            }

            piece.transform.localPosition = targetPos;

            if (capturedPiece != null) Destroy(capturedPiece, 1f); // Destroy after slide off
            if (enPassantPawn != null) Destroy(enPassantPawn, 1f);
        }

        private System.Collections.IEnumerator SlideOffBoard(GameObject piece)
        {
            Vector3 start = piece.transform.localPosition;
            Vector3 end = start + new Vector3((start.x > 3.5f ? 5f : -5f), 0, 0); // Slide to nearest edge
            float elapsed = 0;
            float duration = 0.5f;
            while(elapsed < duration)
            {
                if(piece == null) yield break;
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                piece.transform.localPosition = Vector3.Lerp(start, end, t * t); // Ease in
                yield return null;
            }
        }
    }
}
