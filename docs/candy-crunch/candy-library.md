# Candy Crunch 3D Visual Library System

## Overview
The Candy Crunch Visual Library is a robust, modular, and performant 3D asset system that replaces hard-coded geometric primitives with a reusable **Candy Design System**. This system is responsible for rendering all candies, matching animations, special overlays, and destruction VFX while maintaining optimal performance.

## 1. Six-Color Palette
The base candy set strictly adheres to six primary colors, each physically modeled with corresponding emission, shadow, highlights, and rim lighting:
- **Red:** Deep gummy-red (`0xe62e2e`) with a pinkish-white highlight (`0xff8888`) and intense selection glow.
- **Orange:** Vibrant citrus orange (`0xf97316`) with warm highlights (`0xffcc99`) and deep brown-orange shadows.
- **Yellow:** Bright golden yellow (`0xffcc00`) with pure white highlights (`0xffffff`) and amber emissive properties.
- **Green:** Crisp emerald green (`0x22c55e`) with minty highlights (`0x88ffaa`).
- **Blue:** Vibrant royal blue (`0x2563eb`) with icy blue highlights (`0x99ccff`).
- **Purple:** Deep violet (`0x9333ea`) with magenta rims (`0xcc66ff`).

## 2. Shapes
The `CandyShapeFactory` handles standardizing and instantiating 3D geometries. Available shapes:
- **jelly-bean:** A curved 3D torus geometry forming a jelly bean arc.
- **lozenge:** A soft rounded capsule.
- **teardrop:** A rounded cone shape representing a lemon-drop or dew drop.
- **square:** A slightly softened bevelled box.
- **circle:** A flattened cylinder/disc shape.
- **cluster:** A dodecahedron or multi-sphere cluster (berry-like).
- **fish:** A customized rounded body with an attached tail fin mesh.

## 3. Dimensions (CandyScaleProfile)
To prevent clipping and ensure grid alignment, candies use standardized size classes with `1.0` corresponding to one board cell:
- **SMALL:** Lightweight variants and decorators (0.65 x 0.65 x 0.45, Base Scale: 0.85).
- **STANDARD:** The standard playable candy size (0.82 x 0.82 x 0.55, Base Scale: 1.0).
- **LARGE:** Special items requiring visual presence (0.95 x 0.95 x 0.70, Base Scale: 1.15).

## 4. Materials (CandyMaterialFactory)
Materials are cached and generated as high-quality `MeshPhysicalMaterial` instances. 
- **GUMMY:** Highly translucent, rougher clearcoat, deeper emission.
- **HARD_CANDY:** Slightly translucent, highly glossy clearcoat.
- **JELLY:** Almost glass-like transparency with intense internal glowing (IOR 1.4).
- **GLAZED:** Completely opaque with a thick, smooth sugar glaze reflection.
- **CHOCOLATE:** Dark, rough surface with low reflectivity.
- **CRYSTAL:** High index of refraction (IOR 2.0) with strong highlighting and transmission.
- **WRAPPER:** Transparent cellophane (Opacity 0.85).
- **STRIPE:** Pure white glossy decal material.

## 5. Special Candies
Special items are composed via `CandyAssetRegistry.applySpecialOverlays()`:
- **Striped (H/V):** A glossy white cylinder ring intersects the base candy to form an integrated stripe.
- **Wrapped:** The standard candy is enclosed in a double-sided translucent cellophane cylinder/box (`WRAPPER` material).
- **Color Bomb:** The base mesh is replaced entirely by a dark `CHOCOLATE` sphere covered deterministically in 24 colorful sugar sprinkles (using a Fibonacci sphere/golden ratio distribution).

## 6. Animation Profiles
Subtle environmental animations are calculated natively using `requestAnimationFrame` and delta timing:
- **Idle Breathing:** Candies exhibit a slow, sinusoidal bob and rotation to feel "alive".
- **Selection:** Selected candies scale up by `1.25x` and remain highlighted.
- **AI Suggestion:** Hinted candies scale up slightly (`1.15x`).

## 7. VFX Profiles (CandyVFXProfile)
Candy destruction and matching utilize a custom particle pool:
- When matched, the system spawns 8 small colored 3D cubes.
- Particles use a simple verlet physics simulation (gravity + randomized velocity).
- Materials are cached by hex color and smoothly fade out over 0.5 seconds based on delta timing.

## 8. Performance Strategy
- **Geometry Caching:** `CandyShapeFactory.geometryCache` guarantees a single `BufferGeometry` instance is shared across all candies of the same shape.
- **Material Caching:** `CandyMaterialFactory.materialCache` reuses physically based materials (e.g., all Red Hard Candies use the exact same material reference in memory).
- **VFX Pooling:** The particle system modifies standard meshes instead of regenerating them, updating their properties directly in the `useFrame` render loop.
- **Deterministic Spawning:** Sprinkle generation for Color Bombs uses fixed golden-ratio mathematics rather than costly random calculations per frame.

## 9. Asset Strategy
Rather than hardcoding arbitrary geometries throughout the codebase, the entire system relies on the `CandyAssetRegistry`. This central registry composes the candy visually by querying factories.

## 10. How to Add Future Candy Types
To add a new color or shape:
1. **New Color:** Add the profile to `CANDY_COLOR_PALETTE` in `CandyColorPalette.ts`.
2. **New Shape:** Add the geometry generation logic to `createGeometry()` in `CandyShapeFactory.ts`.
3. **New Material:** Add the case to `createMaterial()` in `CandyMaterialFactory.ts`.
4. **Integration:** Update `defaultMaterialMapping` inside `CandyAssetRegistry.ts` if adding a new color.

To debug and test your changes, launch the internal React component `<CandyGallery />` to view the 3D asset in isolation with interactive lighting controls.
