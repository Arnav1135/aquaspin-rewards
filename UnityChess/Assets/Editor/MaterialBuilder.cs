using UnityEditor;
using UnityEngine;
using System.IO;

namespace UnityChess.Editor
{
    public class MaterialBuilder
    {
        [MenuItem("UnityChess/Generate Procedural Materials")]
        public static void GenerateMaterials()
        {
            string folderPath = "Assets/Materials";
            if (!AssetDatabase.IsValidFolder(folderPath))
            {
                AssetDatabase.CreateFolder("Assets", "Materials");
            }

            CreateMaterial(folderPath + "/LightSquare.mat", new Color(0.9f, 0.85f, 0.8f), 0.1f, 0.8f); // Polished marble look
            CreateMaterial(folderPath + "/DarkSquare.mat", new Color(0.2f, 0.2f, 0.25f), 0.1f, 0.8f);  // Dark obsidian look
            CreateMaterial(folderPath + "/WhitePiece.mat", new Color(1f, 1f, 1f), 0.2f, 0.5f);       // Ivory/Bone
            CreateMaterial(folderPath + "/BlackPiece.mat", new Color(0.1f, 0.1f, 0.1f), 0.2f, 0.5f);   // Ebony/Onyx
            
            // Highlight Glassmorphism style
            Material highlightMat = new Material(Shader.Find("Standard"));
            highlightMat.color = new Color(0.2f, 0.8f, 1.0f, 0.4f);
            highlightMat.SetFloat("_Mode", 3); // Transparent
            highlightMat.SetInt("_SrcBlend", (int)UnityEngine.Rendering.BlendMode.One);
            highlightMat.SetInt("_DstBlend", (int)UnityEngine.Rendering.BlendMode.OneMinusSrcAlpha);
            highlightMat.SetInt("_ZWrite", 0);
            highlightMat.DisableKeyword("_ALPHATEST_ON");
            highlightMat.DisableKeyword("_ALPHABLEND_ON");
            highlightMat.EnableKeyword("_ALPHAPREMULTIPLY_ON");
            highlightMat.renderQueue = 3000;
            AssetDatabase.CreateAsset(highlightMat, folderPath + "/Highlight.mat");

            AssetDatabase.SaveAssets();
            Debug.Log("[MaterialBuilder] PBR Materials generated successfully.");
        }

        private static void CreateMaterial(string path, Color color, float metallic, float smoothness)
        {
            Material mat = new Material(Shader.Find("Standard"));
            mat.color = color;
            mat.SetFloat("_Metallic", metallic);
            mat.SetFloat("_Glossiness", smoothness);
            AssetDatabase.CreateAsset(mat, path);
        }
    }
}
