using UnityEngine;

namespace UnityChess.Gameplay
{
    public class GameModeManager : MonoBehaviour
    {
        public static GameModeManager Instance { get; private set; }

        public int CurrentMode { get; private set; } // 0: Pass & Play, 1: Vs AI, 2: Online

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        public void StartGameMode(int mode)
        {
            CurrentMode = mode;
            Debug.Log($"[GameModeManager] Starting Game Mode: {mode}");
            
            // Re-initialize Board and enable AI/Network if needed
            if (GameManager.Instance != null)
            {
                // Hook into GameManager if needed
            }
        }
    }
}
