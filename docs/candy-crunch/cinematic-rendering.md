# Candy Crunch 3D — Cinematic Rendering Pipeline Architecture

## Overview
The Candy Crunch 3D presentation engine utilizes a physically based rendering (PBR) pipeline built on top of Three.js, optimized for 60fps across desktop and mobile browsers.

## Key Subsystems

### 1. Color Management & Tone Mapping (`GameRenderer.ts`)
- **Output Color Space**: `THREE.SRGBColorSpace`
- **Tone Mapping**: `THREE.ACESFilmicToneMapping` with exposure tuned dynamically to `1.2`.
- **Purpose**: Prevents blown-out specular highlights and delivers rich, cinematic colors across all candy materials.

### 2. 3-Point Cinematic Lighting & IBL (`EnvironmentManager.ts`)
- **Key Light**: Casts soft directional PCF shadows (`shadowMapSize = 2048`).
- **Fill Light**: Soft side light providing ambient color fill.
- **Rim Light**: Backlight highlighting candy silhouettes for visual separation.
- **Gameplay-Reactive Lighting**: Bursts dynamically on matches (`MATCH`, `COMBO`, `MEGA_COMBO`, `SPECIAL`, `VICTORY`).
- **Procedural IBL**: Generates an equirectangular environment texture at runtime without external asset downloads.

### 3. Physical Materials (`CandyMaterialFactory.ts`)
Preset materials using `MeshPhysicalMaterial`:
- `HARD_CANDY`: Clearcoat + subtle translucency (`ior: 1.52`).
- `GUMMY`: Soft roughness + volume transmission (`transmission: 0.65`).
- `JELLY`: High transmission glass effect (`transmission: 0.88`).
- `GLAZED`: Opaque base with glossy glaze coat.
- `CHOCOLATE`: High roughness with subtle clearcoat sheen.
- `CRYSTAL`: High index of refraction (`ior: 2.1`).

### 4. Board Depth & Contact Shadows (`BoardRenderer.ts`)
- Grid tiles feature beveled box geometries and PBR frosted glass finish.
- Per-tile contact shadow planes ground candies on the board.
