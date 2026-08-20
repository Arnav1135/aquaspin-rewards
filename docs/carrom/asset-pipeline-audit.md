# Carrom 3D - Asset Pipeline Audit

## 1. Repository Scan Results

**Status:** Scan Complete. 
**Date:** 2026-08-19

I have performed a full scan of the repository looking for the following file formats:
`.glb`, `.gltf`, `.obj`, `.fbx`, `.hdr`, `.png`, `.jpg`

**Findings:**
Currently, there are **no professional 3D hero assets (GLB/GLTF/FBX/OBJ) provided** specifically for the Carrom game in the repository (e.g., within `public/assets`, `public/models`, or `src/games/carrom/assets`).

The existing Carrom 3D game strictly utilizes programmatic/procedural generation (via `@react-three/fiber` primitives such as `boxGeometry`, `cylinderGeometry`) and procedural materials (e.g., `ProceduralWood.ts`).

## 2. Asset Pipeline Integration Strategy

Because the professional 3D assets will be provided in the future, the **CarromAssetPipeline** will be designed as a robust, future-proof ingestion and management system that automatically upgrades the procedural fallbacks to the high-quality Hero Assets as soon as they are placed in the designated `public/models/carrom/` directory.

### Target Asset Matrix (To Be Ingested)

When assets are provided, the pipeline expects the following structure to validate:

| Asset Type | Format Expectation | Pivot Requirement | LOD Requirement | Physical Property |
| :--- | :--- | :--- | :--- | :--- |
| **Board** | GLB / GLTF | Centered (0,0,0) | LOD0, LOD1, LOD2 | Rigid, Static, Wood Material |
| **Striker** | GLB / GLTF | Physical Center | LOD0, LOD1, LOD2 | High-Gloss, High-Mass |
| **Queen** | GLB / GLTF | Physical Center | LOD0, LOD1 | Premium Translucency / Gloss |
| **Black/White Coins** | GLB / GLTF | Physical Center | LOD0, LOD1 | Matte/Satin Finish, Standard Mass |
| **Pocket Nets** | GLB / GLTF | Origin at Rim | LOD0 | Fabric/Net deformation |
| **Environment HDR** | .HDR / .EXR | N/A | N/A | High Dynamic Range Lighting |

### 3. Normalization and QA Requirements

All incoming assets will pass through the automated `CarromAssetPipeline` to guarantee they meet the physics engine's strict parameters. Any asset containing NaN vertices, inverted normals, missing UVs, or un-normalized pivots will trigger an isolated rendering error guard, falling back smoothly to the existing procedural assets while alerting the developer.

*Note: This audit document will be updated dynamically via the `CarromAutomatedQA` system once the assets are detected in the build folder.*
