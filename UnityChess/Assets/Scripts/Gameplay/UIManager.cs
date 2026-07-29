using System;
using UnityEngine;
using UnityEngine.UI;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    public class UIManager : MonoBehaviour
    {
        public static UIManager Instance { get; private set; }

        private Canvas mainCanvas;
        
        // Promotion UI
        private GameObject promotionPanel;
        public Action<PieceType> OnPromotionSelected;

        // Game Over UI
        private GameObject gameOverPanel;
        private Text gameOverText;

        // Game Modes UI
        private GameObject mainMenuPanel;

        private void Awake()
        {
            if (Instance == null)
            {
                Instance = this;
                CreateProceduralUI();
            }
            else
            {
                Destroy(gameObject);
            }
        }

        private void CreateProceduralUI()
        {
            // 1. Create Canvas
            GameObject canvasGo = new GameObject("MainCanvas");
            mainCanvas = canvasGo.AddComponent<Canvas>();
            mainCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            canvasGo.AddComponent<CanvasScaler>().uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            canvasGo.AddComponent<GraphicRaycaster>();
            
            // Add EventSystem if not exists
            if (FindObjectOfType<UnityEngine.EventSystems.EventSystem>() == null)
            {
                GameObject eventSystem = new GameObject("EventSystem");
                eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
            }

            // 2. Create Main Menu
            mainMenuPanel = CreatePanel(canvasGo.transform, "MainMenuPanel", new Color(0.1f, 0.1f, 0.15f, 1f));
            CreateText(mainMenuPanel.transform, "Title", "UNITY CHESS ARENA", 48, new Vector2(0, 150));
            
            CreateButton(mainMenuPanel.transform, "BtnPassPlay", "Pass & Play", new Vector2(0, 50), () => SelectGameMode(0), new Vector2(200, 50));
            CreateButton(mainMenuPanel.transform, "BtnVsAI", "Player vs AI", new Vector2(0, -20), () => SelectGameMode(1), new Vector2(200, 50));
            CreateButton(mainMenuPanel.transform, "BtnOnline", "Online (Stub)", new Vector2(0, -90), () => SelectGameMode(2), new Vector2(200, 50));

            // 3. Create Promotion Panel
            promotionPanel = CreatePanel(canvasGo.transform, "PromotionPanel", new Color(0, 0, 0, 0.8f));
            promotionPanel.SetActive(false);
            
            Text promoTitle = CreateText(promotionPanel.transform, "Title", "Choose Promotion", 32, new Vector2(0, 100));
            
            CreateButton(promotionPanel.transform, "QueenBtn", "Queen", new Vector2(-150, 0), () => SelectPromotion(PieceType.Queen), new Vector2(90, 40));
            CreateButton(promotionPanel.transform, "RookBtn", "Rook", new Vector2(-50, 0), () => SelectPromotion(PieceType.Rook), new Vector2(90, 40));
            CreateButton(promotionPanel.transform, "BishopBtn", "Bishop", new Vector2(50, 0), () => SelectPromotion(PieceType.Bishop), new Vector2(90, 40));
            CreateButton(promotionPanel.transform, "KnightBtn", "Knight", new Vector2(150, 0), () => SelectPromotion(PieceType.Knight), new Vector2(90, 40));

            // 4. Create Game Over Panel
            gameOverPanel = CreatePanel(canvasGo.transform, "GameOverPanel", new Color(0, 0, 0, 0.9f));
            gameOverPanel.SetActive(false);

            gameOverText = CreateText(gameOverPanel.transform, "ResultText", "Game Over", 48, new Vector2(0, 50));
            CreateButton(gameOverPanel.transform, "RestartBtn", "Restart Game", new Vector2(0, -50), RestartGame, new Vector2(150, 40));
        }

        private void SelectGameMode(int mode)
        {
            mainMenuPanel.SetActive(false);
            if (GameModeManager.Instance != null)
            {
                GameModeManager.Instance.StartGameMode(mode);
            }
        }

        private GameObject CreatePanel(Transform parent, string name, Color bgColor)
        {
            GameObject panel = new GameObject(name);
            panel.transform.SetParent(parent, false);
            RectTransform rt = panel.AddComponent<RectTransform>();
            rt.anchorMin = Vector2.zero;
            rt.anchorMax = Vector2.one;
            rt.sizeDelta = Vector2.zero;
            
            Image img = panel.AddComponent<Image>();
            img.color = bgColor;
            return panel;
        }

        private Text CreateText(Transform parent, string name, string content, int fontSize, Vector2 anchoredPosition)
        {
            GameObject textGo = new GameObject(name);
            textGo.transform.SetParent(parent, false);
            Text txt = textGo.AddComponent<Text>();
            txt.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
            txt.text = content;
            txt.fontSize = fontSize;
            txt.alignment = TextAnchor.MiddleCenter;
            txt.color = Color.white;
            
            RectTransform rt = textGo.GetComponent<RectTransform>();
            rt.anchoredPosition = anchoredPosition;
            rt.sizeDelta = new Vector2(400, 100);
            return txt;
        }

        private void CreateButton(Transform parent, string name, string label, Vector2 position, UnityEngine.Events.UnityAction onClick, Vector2 size)
        {
            GameObject btnGo = new GameObject(name);
            btnGo.transform.SetParent(parent, false);
            
            RectTransform rt = btnGo.AddComponent<RectTransform>();
            rt.anchoredPosition = position;
            rt.sizeDelta = size;
            
            Image img = btnGo.AddComponent<Image>();
            img.color = new Color(0.2f, 0.6f, 1f);
            
            Button btn = btnGo.AddComponent<Button>();
            btn.onClick.AddListener(onClick);
            
            CreateText(btnGo.transform, "Text", label, 18, Vector2.zero).color = Color.white;
        }

        public void ShowPromotionUI(Action<PieceType> callback)
        {
            OnPromotionSelected = callback;
            promotionPanel.SetActive(true);
        }

        private void SelectPromotion(PieceType type)
        {
            promotionPanel.SetActive(false);
            OnPromotionSelected?.Invoke(type);
        }

        public void ShowGameOver(GameState state)
        {
            if (state == GameState.Checkmate)
                gameOverText.text = GameManager.Instance.Board.CurrentTurn == PieceColor.White ? "Checkmate!\nBlack Wins" : "Checkmate!\nWhite Wins";
            else
                gameOverText.text = "Draw!\n" + state.ToString();
                
            gameOverPanel.SetActive(true);
        }

        private void RestartGame()
        {
            // Simple restart by reloading scene
            UnityEngine.SceneManagement.SceneManager.LoadScene(UnityEngine.SceneManagement.SceneManager.GetActiveScene().buildIndex);
        }
    }
}
