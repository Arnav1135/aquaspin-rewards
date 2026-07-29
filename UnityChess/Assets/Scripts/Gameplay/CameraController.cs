using System.Collections;
using UnityEngine;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    public class CameraController : MonoBehaviour
    {
        public Camera MainCamera;
        public Transform BoardCenter;
        public float TransitionDuration = 1.0f;

        private Vector3 whitePosition = new Vector3(3.5f, 7.5f, -5.5f);
        private Vector3 blackPosition = new Vector3(3.5f, 7.5f, 12.5f);
        
        private Quaternion whiteRotation;
        private Quaternion blackRotation;

        private bool isTransitioning = false;

        private void Start()
        {
            if (MainCamera == null) MainCamera = Camera.main;
            
            // Calculate look rotations
            if (BoardCenter == null)
            {
                // Default center is around (3.5, 0, 3.5) based on our generation
                BoardCenter = new GameObject("BoardCenter").transform;
                BoardCenter.position = new Vector3(3.5f, 0, 3.5f);
            }

            whiteRotation = Quaternion.LookRotation(BoardCenter.position - whitePosition);
            blackRotation = Quaternion.LookRotation(BoardCenter.position - blackPosition);

            // Default to white
            MainCamera.transform.position = whitePosition;
            MainCamera.transform.rotation = whiteRotation;

            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMoveMade += HandleMoveMade;
            }
        }

        private void HandleMoveMade(Move move)
        {
            // For pass and play, we switch camera view after each move
            PieceColor nextTurn = GameManager.Instance.Board.CurrentTurn;
            
            if (!isTransitioning)
            {
                StartCoroutine(TransitionCamera(nextTurn));
            }
        }

        private IEnumerator TransitionCamera(PieceColor targetTurn)
        {
            isTransitioning = true;
            
            Vector3 startPos = MainCamera.transform.position;
            Quaternion startRot = MainCamera.transform.rotation;
            
            Vector3 targetPos = targetTurn == PieceColor.White ? whitePosition : blackPosition;
            Quaternion targetRot = targetTurn == PieceColor.White ? whiteRotation : blackRotation;

            float elapsed = 0;
            while (elapsed < TransitionDuration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / TransitionDuration;
                
                // SmoothInOut
                float smoothT = t * t * (3f - 2f * t);

                MainCamera.transform.position = Vector3.Lerp(startPos, targetPos, smoothT);
                MainCamera.transform.rotation = Quaternion.Slerp(startRot, targetRot, smoothT);

                yield return null;
            }

            MainCamera.transform.position = targetPos;
            MainCamera.transform.rotation = targetRot;
            
            isTransitioning = false;
        }

        private void OnDestroy()
        {
            if (GameManager.Instance != null)
            {
                GameManager.Instance.OnMoveMade -= HandleMoveMade;
            }
        }
    }
}
