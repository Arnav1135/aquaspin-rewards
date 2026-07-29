import os
import trimesh

directory = r"d:\Web App - Aqua Blue\UnityChess\Assets\Models\Pieces"
for filename in os.listdir(directory):
    if filename.endswith(".stl"):
        path = os.path.join(directory, filename)
        mesh = trimesh.load(path)
        out_path = os.path.join(directory, filename.replace(".stl", ".obj"))
        mesh.export(out_path)
        print(f"Converted {filename} to .obj")
