# Candy Crunch Diversity Audit

## Existing Design System
Currently, the candies are constructed using the `CandyAssetRegistry.ts`, `CandyShapeFactory.ts`, and `CandyMaterialFactory.ts`.

### Existing Candy Shapes
- **jelly-bean**: Flat torus (donut-like shape).
- **lozenge**: High-quality rounded capsule/pill.
- **teardrop**: Cone with softened tip and base.
- **square**: Procedural beveled box using ExtrudeGeometry.
- **circle**: Flattened spheroid.
- **cluster**: Dodecahedron with sine-wave deformation.
- **fish**: Scaled sphere with a cone tail.
- **default**: Standard sphere.

### Existing Materials
- **HARD_CANDY**: Emissive, low roughness, slight transmission, micro-bump.
- **GUMMY**: Higher roughness, higher transmission, thicker, micro-bump.
- **JELLY**: Highly transparent, low roughness, glowing emission.
- **GLAZED**: Low emission, medium roughness, clearcoat.
- **CHOCOLATE**: Opaque brown, high roughness.
- **CRYSTAL**: Emissive base, high transmission, high IOR (refractive).
- **WRAPPER**: Transparent double-sided thin clearcoat.
- **STRIPE**: Solid white, high clearcoat.

### Default Color-to-Material Mapping
Currently, the system rigidly maps colors to materials and shapes in `CandyAssetRegistry.ts`:
- Red -> GUMMY
- Orange -> HARD_CANDY
- Yellow -> JELLY
- Green -> GLAZED
- Blue -> HARD_CANDY
- Purple -> CRYSTAL

### Problems
1. **Coupling**: Color is permanently coupled to material in `CandyAssetRegistry.ts`, preventing procedural variants (e.g., Red Crystal, Orange Gummy).
2. **Animation**: Candies share a uniform animation system (same scale punches, falling speed, and sine-wave rotation). There are no distinct animation profiles per candy.
3. **Destruction**: VFX is generic. A blue candy and a red candy burst using the same particle logic, just tinted.
4. **Visual Readability**: While shapes exist, the silhouette distinctions are weak. If colors were stripped away, some candies (circle vs jelly-bean vs fish body) are too similar.
5. **Special Candies**: Wrapped candies use a generic box wrapper (`BoxGeometry(0.75, 0.75, 0.5)`). Striped candies use a generic cylinder ring (`CylinderGeometry(0.42, 0.42, 0.08)`). They don't conform to the actual base shape of the candy.

## Goal
Decouple the properties into a `CandyVisualIdentity` system where every candy has a distinct silhouette, surface, proportion, animation, and destruction profile, satisfying the 43-phase mandate.
