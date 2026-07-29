using UnityEditor;
using UnityEngine;
using UnityEditor.SceneManagement;
using UnityChess.Gameplay;
using UnityChess.Stability;

namespace UnityChess.Editor
{
    public class BuildScript
    {
        [MenuItem("UnityChess/Setup Scene and Build WebGL")]
        public static void SetupAndBuild()
        {
            // 1. Create a new Scene
            var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // Reverting broken URP asset creation that causes NRE loop
            UnityEngine.Rendering.GraphicsSettings.renderPipelineAsset = null;
            QualitySettings.renderPipeline = null;

            // 2. Setup Lighting
            GameObject lightGo = new GameObject("Directional Light");
            Light light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            lightGo.transform.rotation = Quaternion.Euler(50, -30, 0);

            // 3. Setup Camera
            GameObject camGo = new GameObject("Main Camera");
            Camera cam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
            CameraController camController = camGo.AddComponent<CameraController>();
            
            // 4. Setup Managers
            GameObject managers = new GameObject("Managers");
            
            StabilityManager stability = managers.AddComponent<StabilityManager>();
            GameManager gameManager = managers.AddComponent<GameManager>();
            GameModeManager modeManager = managers.AddComponent<GameModeManager>();
            ArenaManager arenaManager = managers.AddComponent<ArenaManager>();
            BoardManager boardManager = managers.AddComponent<BoardManager>();
            InputManager inputManager = managers.AddComponent<InputManager>();
            ChessAI ai = managers.AddComponent<ChessAI>();
            NetworkManager network = managers.AddComponent<NetworkManager>();
            UIManager uiManager = managers.AddComponent<UIManager>();
            AudioManager audioManager = managers.AddComponent<AudioManager>();

            // 5. Link References
            gameManager.BoardRenderer = boardManager;
            gameManager.InputHandler = inputManager;
            inputManager.MainCamera = cam;

            // 6. Generate Materials and link to BoardManager
            MaterialBuilder.GenerateMaterials();
            boardManager.LightSquareMaterial = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/LightSquare.mat");
            boardManager.DarkSquareMaterial = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/DarkSquare.mat");
            boardManager.HighlightMaterial = AssetDatabase.LoadAssetAtPath<Material>("Assets/Materials/Highlight.mat");
            
            // We'll let BoardManager fallback to primitives since we don't have high poly prefabs yet

            // 7. Save Scene
            string scenePath = "Assets/Scenes/ChessScene.unity";
            if (!AssetDatabase.IsValidFolder("Assets/Scenes"))
            {
                AssetDatabase.CreateFolder("Assets", "Scenes");
            }
            EditorSceneManager.SaveScene(scene, scenePath);

            // 8. Build WebGL
            PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
            PlayerSettings.SplashScreen.show = false;
            
            BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
            buildPlayerOptions.scenes = new[] { scenePath };
            // Ensure the build output is placed in the React public folder
            buildPlayerOptions.locationPathName = "../public/UnityChessBuild";
            buildPlayerOptions.target = BuildTarget.WebGL;
            buildPlayerOptions.options = BuildOptions.None;

            Debug.Log("[BuildScript] Starting WebGL Build...");
            var report = BuildPipeline.BuildPlayer(buildPlayerOptions);
            Debug.Log($"[BuildScript] Build result: {report.summary.result}");
        }
    }
}
