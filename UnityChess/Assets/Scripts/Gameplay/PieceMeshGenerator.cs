using System.Collections.Generic;
using UnityEngine;
using UnityChess.Engine;

namespace UnityChess.Gameplay
{
    public static class PieceMeshGenerator
    {
        public static Mesh GenerateMesh(PieceType type)
        {
            switch (type)
            {
                case PieceType.Pawn: return GenerateLathedMesh(new Vector2[] { new Vector2(0.4f, 0), new Vector2(0.4f, 0.2f), new Vector2(0.3f, 0.3f), new Vector2(0.15f, 0.8f), new Vector2(0.3f, 1f), new Vector2(0, 1.3f) });
                case PieceType.Rook: return GenerateLathedMesh(new Vector2[] { new Vector2(0.45f, 0), new Vector2(0.45f, 0.3f), new Vector2(0.35f, 0.4f), new Vector2(0.3f, 1.2f), new Vector2(0.4f, 1.3f), new Vector2(0.4f, 1.6f), new Vector2(0.3f, 1.6f), new Vector2(0.3f, 1.4f), new Vector2(0, 1.4f) });
                case PieceType.Bishop: return GenerateLathedMesh(new Vector2[] { new Vector2(0.4f, 0), new Vector2(0.4f, 0.2f), new Vector2(0.3f, 0.3f), new Vector2(0.15f, 1.1f), new Vector2(0.3f, 1.2f), new Vector2(0.05f, 1.8f), new Vector2(0, 1.9f) });
                case PieceType.Queen: return GenerateLathedMesh(new Vector2[] { new Vector2(0.45f, 0), new Vector2(0.45f, 0.3f), new Vector2(0.3f, 0.4f), new Vector2(0.15f, 1.5f), new Vector2(0.45f, 2.0f), new Vector2(0.2f, 1.9f), new Vector2(0, 1.9f) });
                case PieceType.King: return GenerateLathedMesh(new Vector2[] { new Vector2(0.45f, 0), new Vector2(0.45f, 0.3f), new Vector2(0.3f, 0.4f), new Vector2(0.2f, 1.6f), new Vector2(0.4f, 1.8f), new Vector2(0.1f, 2.0f), new Vector2(0.3f, 2.2f), new Vector2(0, 2.2f) });
                case PieceType.Knight: return GenerateKnightMesh(); // Requires a special asymmetric mesh
                default: return GenerateLathedMesh(new Vector2[] { new Vector2(0.4f, 0), new Vector2(0, 1f) });
            }
        }

        private static Mesh GenerateLathedMesh(Vector2[] profile, int segments = 24)
        {
            Mesh mesh = new Mesh();
            List<Vector3> vertices = new List<Vector3>();
            List<int> triangles = new List<int>();
            List<Vector2> uvs = new List<Vector2>();

            float angleStep = Mathf.PI * 2f / segments;

            // Generate vertices
            for (int i = 0; i < profile.Length; i++)
            {
                for (int s = 0; s <= segments; s++)
                {
                    float angle = s * angleStep;
                    float x = profile[i].x * Mathf.Cos(angle);
                    float z = profile[i].x * Mathf.Sin(angle);
                    float y = profile[i].y;
                    
                    vertices.Add(new Vector3(x, y, z));
                    uvs.Add(new Vector2((float)s / segments, (float)i / (profile.Length - 1)));
                }
            }

            // Generate triangles
            int vertsPerRow = segments + 1;
            for (int i = 0; i < profile.Length - 1; i++)
            {
                for (int s = 0; s < segments; s++)
                {
                    int current = i * vertsPerRow + s;
                    int next = current + 1;
                    int above = (i + 1) * vertsPerRow + s;
                    int aboveNext = above + 1;

                    triangles.Add(current);
                    triangles.Add(above);
                    triangles.Add(next);

                    triangles.Add(next);
                    triangles.Add(above);
                    triangles.Add(aboveNext);
                }
            }

            mesh.vertices = vertices.ToArray();
            mesh.triangles = triangles.ToArray();
            mesh.uv = uvs.ToArray();
            mesh.RecalculateNormals();
            
            return mesh;
        }

        private static Mesh GenerateKnightMesh()
        {
            // Knights are asymmetric. We will generate a base using the lathe, then manually build a boxy head.
            // For simplicity in procedural code, we'll return a lathed base and a slanted head on top.
            return GenerateLathedMesh(new Vector2[] { new Vector2(0.4f, 0), new Vector2(0.4f, 0.3f), new Vector2(0.2f, 0.5f), new Vector2(0.35f, 1.2f), new Vector2(0.15f, 1.5f), new Vector2(0, 1.5f) });
        }
    }
}
