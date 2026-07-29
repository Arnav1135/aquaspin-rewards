using System;
using UnityEngine;

namespace UnityChess.Gameplay
{
    public class InputManager : MonoBehaviour
    {
        public Camera MainCamera;
        public float SquareSize = 1.0f;
        
        public event Action<int, int> OnSquareSelected;

        private void Update()
        {
            if (Input.GetMouseButtonDown(0))
            {
                HandleClick();
            }
        }

        private void HandleClick()
        {
            if (MainCamera == null) MainCamera = Camera.main;
            if (MainCamera == null) return;

            Ray ray = MainCamera.ScreenPointToRay(Input.mousePosition);
            if (Physics.Raycast(ray, out RaycastHit hit))
            {
                // Simple conversion from world position to board coordinates
                // Assuming board is at (0,0,0) and square centers are at (file * SquareSize, 0, rank * SquareSize)
                // Offset by half a square size for proper centering, but since our generation put quads at exact integer grid points:
                float rawFile = hit.point.x / SquareSize;
                float rawRank = hit.point.z / SquareSize;

                // Round to nearest integer (since squares were spawned exactly on integers)
                int file = Mathf.RoundToInt(rawFile);
                int rank = Mathf.RoundToInt(rawRank);

                if (file >= 0 && file <= 7 && rank >= 0 && rank <= 7)
                {
                    OnSquareSelected?.Invoke(file, rank);
                }
            }
        }
    }
}
