# Carrom Rendering Architecture

## React Three Fiber
The core renderer is driven by `@react-three/fiber` which wraps Three.js.

## Rendering Loop
The render loop (`useFrame`) runs asynchronously from the physics loop. Visual transforms are interpolated by Rapier automatically.

## Lighting
The scene uses a mixture of physically coherent lights:
- Soft Ambient Light
- Key Directional Light (casting shadows)
- Image-Based Lighting (HDR Environment Map) for accurate PBR reflections.

## Quality Tiers
We implement a `PerformanceGovernor` that scales rendering quality dynamically:
- Postprocessing (Bloom, AO) is disabled on low-end devices.
- Shadow map resolution is reduced to `512x512` or `1024x1024` on mobile.
- `dpr` (device pixel ratio) is clamped.
