# Candy Crunch 3D — Layered VFX System

## Overview
The VFX Manager handles high-performance, pooled particle effects categorized into three distinct visual tiers.

## VFX Tiers

### 1. MICRO Tier
- Floating sugar dust and ambient sparkles (`Points` system).
- Constantly drifting in 3D space to provide atmospheric depth.

### 2. IMPACT Tier
- Instanced particle explosion system (`InstancedMesh`, up to 2000 pooled instances).
- Color-reactive particle palettes (`RED`, `ORANGE`, `YELLOW`, `GREEN`, `BLUE`, `PURPLE`).
- Velocity, gravity, and drag physics calculated in real-time.

### 3. CINEMATIC Tier
- **Shockwave Rings**: Expanding wireframe torus meshes.
- **Energy Ribbons**: Laser beam geometries for Striped Candies.
- **Starburst Explosions**: Multicolored particle bursts for Color Bomb combinations.
