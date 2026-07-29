using System;
using UnityEngine;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    /// <summary>
    /// Placeholder NetworkManager for the upcoming Netcode for GameObjects integration.
    /// Handles sending and receiving moves to/from the server.
    /// </summary>
    public class NetworkManager : MonoBehaviour
    {
        public static NetworkManager Instance { get; private set; }

        public bool IsMultiplayerActive = false;
        public bool IsHost = true; // Are we the white player hosting?

        public event Action<Move> OnNetworkMoveReceived;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Start()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMoveMade += HandleLocalMoveMade;
            }
        }

        private void HandleLocalMoveMade(Move move)
        {
            if (!IsMultiplayerActive) return;

            // Only send moves made by the local player
            PieceColor localColor = IsHost ? PieceColor.White : PieceColor.Black;
            
            // Note: Since OnMoveMade fires after the move is processed, the current turn is now the opponent's.
            // So if it is currently the opponent's turn, it means we just made a move.
            if (GameManager.Instance.Board.CurrentTurn != localColor)
            {
                SendMoveToServer(move);
            }
        }

        private void SendMoveToServer(Move move)
        {
            Stability.StabilityManager.Instance.SafeExecute(() =>
            {
                // TODO: Serialize move and send via RPC
                // ServerRpc_SubmitMove(move.FromFile, move.FromRank, move.ToFile, move.ToRank, (int)move.Promotion);
                Debug.Log($"[Network] Sent move to server: {move.FromFile},{move.FromRank} -> {move.ToFile},{move.ToRank}");
            }, "Network_SendMove");
        }

        // Simulates receiving a move from the network
        public void ReceiveMoveFromServer(int f, int r, int tf, int tr, int promotionIndex)
        {
            Stability.StabilityManager.Instance.SafeExecute(() =>
            {
                PieceType promo = (PieceType)promotionIndex;
                Move networkMove = new Move(f, r, tf, tr, promo);

                Debug.Log($"[Network] Received move from server: {f},{r} -> {tf},{tr}");
                OnNetworkMoveReceived?.Invoke(networkMove);

            }, "Network_ReceiveMove");
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
                GameManager.Instance.OnMoveMade -= HandleLocalMoveMade;
        }
    }
}
