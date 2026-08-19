# Water Sort 3D - Render Graph Audit (Phase 10)

## Current Render Graph Status
As part of the Phase 10 visual & architectural upgrades, the Water Sort 3D rendering pipeline has been thoroughly audited.

### Identified Bottlenecks & Inefficiencies:
1. **Unnecessary Draw Calls:** Currently, each color segment of liquid is rendered as an independent `mesh` (`LiquidSegment`) inside `Tube3D`. A single 14-tube level with 4 segments each produces up to 56 separate liquid draw calls, scaling poorly on lower-end mobile devices.
2. **Duplicate Materials:** The `LiquidVisualEngine` uses a hash map (`baseColor_opacity_ior`) to share materials, which effectively deduplicates standard materials. However, React Spring animations (`uSloshX`, `uSloshZ`) are mapped per-mesh via `onBeforeCompile`, forcing some uniform duplication instead of fully exploiting GPU instancing attributes.
3. **Expensive Transparent Objects:** The glass tubes are rendered with `transmission: 1.0` and `thickness: 0.2` via `MeshPhysicalMaterial`. Stacking 14 highly refractive, high-IOR (1.52) glass objects in front of each other triggers expensive multi-pass fragment shading and overdraw.
4. **Environment Shadows:** While `ContactShadows` are performant, the actual tube casting creates redundant soft shadow passes if not carefully LOD-culled in the distance.
5. **Per-Frame Allocations:** During the physics calculations (`LiquidSurfaceSolver`) and animation loops (spring evaluations), we are creating new closure values. Fortunately, `THREE.Vector3` instances have been heavily localized.

## Optimized Strategy (GPU-First Roadmap)
To scale this into a "Premium Physically Convincing 3D Liquid Puzzle World" without melting mobile GPUs, the following optimizations are mandated for Phase 10+:

### 1. Liquid Instancing (Phases 2 & 3)
- **Target:** Reduce 56 liquid draw calls to **1 draw call** (or 1 per color).
- **Execution:** Migrate `LiquidSegment` meshes into a global `InstancedMesh`. Instead of modifying uniforms via `userData.shader`, pass `surfaceHeight`, `surfaceTilt`, `uIsFrozen`, and `uIsTopLayer` as custom `InstancedBufferAttribute`s. The `LiquidVisualEngine` vertex shader will intercept these instance attributes.

### 2. Glass Quality Manager (Phases 11 & 12)
- **Target:** Maintain 60 FPS on mobile.
- **Execution:** Cap the `MeshPhysicalMaterial` transmission bounces. Distant tubes should fallback to an `alphaTest`/`opacity` proxy glass rather than full optical transmission and thickness volume.

### 3. Reusable Spatial Fields (Phases 18 & 19)
- **Target:** Remove distinct `ParticleSystem` allocators for every droplet.
- **Execution:** Introduce a shared, global `SplashField` and `RippleField`. Instead of spawning and garbage-collecting React components for every droplet, we write impact energies to a global buffer and let a single GPU particle shader evaluate the trajectories.

## Metrics
| Metric | Current | Optimized Target |
| :--- | :--- | :--- |
| **Draw Calls (Liquid)** | ~56 | ~1-5 |
| **Draw Calls (Glass)** | 14 | 14 (w/ LOD material) |
| **VFX Garbage Collection** | High (Per event component) | Zero (Global Splash Field Buffer) |
| **Base Material Complexity**| High (Transmission + SSS) | Scalable (Quality Tiers) |
