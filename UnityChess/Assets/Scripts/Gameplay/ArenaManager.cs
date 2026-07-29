using UnityEngine;

namespace UnityChess.Gameplay
{
    public class ArenaManager : MonoBehaviour
    {
        private void Start()
        {
            GenerateArena();
        }

        private void GenerateArena()
        {
            // 1. Setup dark background color
            Camera.main.clearFlags = CameraClearFlags.SolidColor;
            Camera.main.backgroundColor = new Color(0.02f, 0.02f, 0.03f, 1f); // Darker cinematic void

            // 2. 3-Point Lighting Rig
            // Key Light
            GameObject keyLightGo = new GameObject("KeyLight");
            Light keyLight = keyLightGo.AddComponent<Light>();
            keyLight.type = LightType.Spot;
            keyLight.spotAngle = 70f;
            keyLight.intensity = 1.5f;
            keyLight.color = new Color(1f, 0.95f, 0.9f); // Warm
            keyLight.shadows = LightShadows.Soft; // Enable soft shadows
            keyLightGo.transform.position = new Vector3(8f, 12f, -4f); 
            keyLightGo.transform.LookAt(new Vector3(3.5f, 0, 3.5f));

            // Fill Light
            GameObject fillLightGo = new GameObject("FillLight");
            Light fillLight = fillLightGo.AddComponent<Light>();
            fillLight.type = LightType.Spot;
            fillLight.spotAngle = 90f;
            fillLight.intensity = 0.5f;
            fillLight.color = new Color(0.8f, 0.9f, 1f); // Cool
            fillLightGo.transform.position = new Vector3(-4f, 8f, 10f);
            fillLightGo.transform.LookAt(new Vector3(3.5f, 0, 3.5f));

            // Rim Light
            GameObject rimLightGo = new GameObject("RimLight");
            Light rimLight = rimLightGo.AddComponent<Light>();
            rimLight.type = LightType.Spot;
            rimLight.spotAngle = 50f;
            rimLight.intensity = 1.2f;
            rimLight.color = new Color(0.9f, 0.9f, 1f);
            rimLightGo.transform.position = new Vector3(3.5f, 5f, 12f);
            rimLightGo.transform.LookAt(new Vector3(3.5f, 0, 3.5f));

            // 3. Board Base (Raised)
            GameObject boardBase = GameObject.CreatePrimitive(PrimitiveType.Cube);
            boardBase.name = "BoardBase";
            boardBase.transform.position = new Vector3(3.5f, -0.25f, 3.5f);
            boardBase.transform.localScale = new Vector3(8.5f, 0.5f, 8.5f);
            
            Material baseMat = new Material(Shader.Find("Standard"));
            baseMat.color = new Color(0.2f, 0.15f, 0.1f); // Wood-like dark brown
            baseMat.SetFloat("_Glossiness", 0.4f); 
            boardBase.GetComponent<MeshRenderer>().material = baseMat;

            // 4. Procedural Floor (The Void)
            GameObject floor = GameObject.CreatePrimitive(PrimitiveType.Plane);
            floor.name = "ArenaFloor";
            floor.transform.position = new Vector3(3.5f, -1f, 3.5f);
            floor.transform.localScale = new Vector3(20, 1, 20);
            
            Material floorMat = new Material(Shader.Find("Standard"));
            floorMat.color = new Color(0.05f, 0.05f, 0.06f);
            floorMat.SetFloat("_Glossiness", 0.95f); // ultra reflective mirror floor
            floorMat.SetFloat("_Metallic", 0.9f);
            floor.GetComponent<MeshRenderer>().material = floorMat;
        }
    }
}
