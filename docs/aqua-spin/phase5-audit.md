# Phase 5 — Procedural Rendering & Shader Simulation Audit

## Subsystem Matrix

### Geometry & Procedural Shapes
- **CandyShapeFactory**: `PARTIAL` - Exists but currently uses basic Three.js primitives (Cylinder, Sphere). Silhouette quality and procedural rounded bevels need implementation.
- **ProceduralGeometrySystem**: `UNUSED` - No dedicated caching or LOD switching for procedural meshes.
- **GeometryLODManager**: `UNUSED` - Not implemented. High poly counts remain static.

### Shaders & Materials
- **CandyMaterialFactory**: `PARTIAL` - PBR materials are present, but lack advanced micro-surface (dust, wear), heat, or wetness shader inputs.
- **SurfaceDetailShader**: `UNUSED` - No reusable shader block for wetness/dust/heat.
- **Glass / Liquid Interaction**: `PARTIAL` - `GlassInteractionSystem` and `LiquidInteractionSystem` have basic optical parameters and point-cloud particle physics, but no dedicated multi-scale wave shader or liquid depth coloring.

### Simulation & Instancing
- **Instanced Geometry**: `INEFFICIENT` - Many particles and repeated board items (candies, droplets, debris) currently allocate independent `THREE.Mesh` or non-optimized attributes. Need wider `InstancedMesh` adoption for debris/fractures.
- **Fracture Geometry**: `UNUSED` - Fracture pooling relies solely on particles instead of bounded fragment geometry.

### Post-Processing & Cinematics
- **Post-Processing Stack**: `PLACEHOLDER` - Tying bloom and tonemapping to renderer, but no composited, scalable stack (DOF, Vignette, Screen Impact, Dynamic Color Grade).
- **Cinematic DOF / Lighting Volumes**: `UNUSED`.

### Memory & Prediction
- **Shader Material Cache**: `PARTIAL` - Basic caching, but complex combinations (wet + hot + glassy) might leak if not pooled correctly.
- **Visual Test Chamber**: `UNUSED` - No dedicated sandbox for material/quality calibration.

## Conclusion
The physical interaction pipeline (Phase 1-4) is robust and events flow correctly into the engine. Phase 5 must now replace basic visual endpoints (e.g., simple meshes, basic PBR, simple particle scales) with advanced shader materials, instanced LOD geometry, scalable post-processing stacks, and procedural micro-details.
