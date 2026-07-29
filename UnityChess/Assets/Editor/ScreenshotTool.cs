using UnityEngine;
using UnityEditor;
using System.IO;

public class ScreenshotTool
{
    [MenuItem("UnityChess/Take Screenshot")]
    public static void TakeScreenshot()
    {
        // Find the main camera
        Camera cam = Camera.main;
        if (cam == null)
        {
            var cameras = Object.FindObjectsOfType<Camera>();
            if (cameras.Length > 0) cam = cameras[0];
            else 
            {
                Debug.LogError("No camera found!");
                return;
            }
        }

        // Create a render texture
        RenderTexture rt = new RenderTexture(1920, 1080, 24);
        cam.targetTexture = rt;
        Texture2D screenShot = new Texture2D(1920, 1080, TextureFormat.RGB24, false);
        cam.Render();
        RenderTexture.active = rt;
        screenShot.ReadPixels(new Rect(0, 0, 1920, 1080), 0, 0);
        cam.targetTexture = null;
        RenderTexture.active = null; 
        Object.DestroyImmediate(rt);

        byte[] bytes = screenShot.EncodeToPNG();
        string filename = "d:/Web App - Aqua Blue/screenshot.png";
        File.WriteAllBytes(filename, bytes);
        Debug.Log(string.Format("Took screenshot to: {0}", filename));
    }

    [MenuItem("UnityChess/Setup and Screenshot")]
    public static void SetupAndTakeScreenshot()
    {
        UnityChess.Editor.BuildScript.SetupAndBuild();
        TakeScreenshot();
    }
}
