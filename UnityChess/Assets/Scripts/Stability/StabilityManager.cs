using System;
using System.Collections.Generic;
using UnityEngine;

namespace UnityChess.Stability
{
    public class StabilityManager : MonoBehaviour
    {
        public static StabilityManager Instance { get; private set; }

        public bool EnableSelfHealing = true;
        public int TargetFPS = 60;
        public float CriticalFrameTime = 0.05f; // 50ms (drops below 20 FPS)

        public event Action<string> OnErrorRecovered;
        
        private Queue<float> frameTimes = new Queue<float>();
        private int qualityLevel;
        private bool isDegraded = false;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                DontDestroyOnLoad(gameObject);
                qualityLevel = QualitySettings.GetQualityLevel();
                Application.targetFrameRate = TargetFPS;
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void Update()
        {
            if (!EnableSelfHealing) return;

            MonitorPerformance();
        }

        private void MonitorPerformance()
        {
            frameTimes.Enqueue(Time.deltaTime);
            if (frameTimes.Count > 30) frameTimes.Dequeue();

            float avgFrameTime = 0;
            foreach (var ft in frameTimes) avgFrameTime += ft;
            avgFrameTime /= frameTimes.Count;

            if (avgFrameTime > CriticalFrameTime && !isDegraded)
            {
                // Degrade graphics quality dynamically if dropping frames
                if (qualityLevel > 0)
                {
                    qualityLevel--;
                    QualitySettings.SetQualityLevel(qualityLevel, true);
                    isDegraded = true;
                    Debug.LogWarning($"[StabilityManager] Critical frame drop detected (Avg: {avgFrameTime:F3}s). Decreased quality to level {qualityLevel}");
                }
            }
            else if (avgFrameTime < (1f / TargetFPS) * 1.1f && isDegraded)
            {
                // Gradually restore quality if performance recovers and stays stable
                isDegraded = false;
            }
        }

        public void SafeExecute(Action action, string operationName = "Unknown Operation")
        {
            try
            {
                action?.Invoke();
            }
            catch (Exception ex)
            {
                HandleException(ex, operationName);
            }
        }

        public T SafeExecute<T>(Func<T> func, T fallback, string operationName = "Unknown Operation")
        {
            try
            {
                return func != null ? func.Invoke() : fallback;
            }
            catch (Exception ex)
            {
                HandleException(ex, operationName);
                return fallback;
            }
        }

        private void HandleException(Exception ex, string operationName)
        {
            Debug.LogError($"[StabilityManager] Recovered from exception during '{operationName}': {ex.Message}\n{ex.StackTrace}");
            OnErrorRecovered?.Invoke(operationName);

            if (EnableSelfHealing)
            {
                // Implement state reset or animation cancellation logic here if needed
                // E.g., force piece back to starting square if move animation fails
            }
        }
    }
}
