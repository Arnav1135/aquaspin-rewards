using System;
using UnityEngine;

namespace UnityChess.Tests
{
    public class StabilityManagerTests : MonoBehaviour
    {
        private void Start()
        {
            // Register for recovery events
            Stability.StabilityManager.Instance.OnErrorRecovered += OnRecovered;
            
            RunTests();
        }

        private void RunTests()
        {
            Debug.Log("[Test] Starting StabilityManager Fault Injection Tests...");

            // Test 1: Safe execution of a failing void action
            Stability.StabilityManager.Instance.SafeExecute(() => 
            {
                Debug.Log("[Test] Simulating a NullReferenceException in MovePiece animation...");
                string fakePiece = null;
                int len = fakePiece.Length; // Throws NullReferenceException
            }, "AnimatePieceMove");

            // Test 2: Safe execution of a failing function returning a fallback value
            int result = Stability.StabilityManager.Instance.SafeExecute<int>(() => 
            {
                Debug.Log("[Test] Simulating an IndexOutOfRangeException during Board Evaluation...");
                int[] fakeBoard = new int[64];
                return fakeBoard[100]; // Throws IndexOutOfRangeException
            }, -1, "EvaluateBoardState");

            Debug.Log($"[Test] Function with fallback returned: {result} (Expected: -1)");
        }

        private void OnRecovered(string operation)
        {
            Debug.Log($"[Test Listener] Successfully received recovery notification for: {operation}");
        }

        private void OnDestroy()
        {
            if (Stability.StabilityManager.Instance != null)
                Stability.StabilityManager.Instance.OnErrorRecovered -= OnRecovered;
        }
    }
}
