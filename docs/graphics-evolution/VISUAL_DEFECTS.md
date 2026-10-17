# Visual Defects & Rendering Weaknesses Registry

This document tracks unresolved rendering defects, visual weaknesses, and geometry/lighting limitations discovered during automated and manual repository inspections.

## Active Defects & Limitations

| Defect ID | Game / Area | Description | Severity | Target Recommendation |
|---|---|---|---|---|
| `DEF-ROULETTE-FLAT-RIM` | Roulette | Wheel perimeter lacks metallic depth, reflection highlights, and ball track ambient shadow. | Medium | `REC-ROULETTE-3D-PHYSICAL-WHEEL` |
| `DEF-COIN-LIGHT-GLINT` | CoinFlip | Coin faces lack dynamic anisotropic light sweep across faces during tumbling. | Low | `REC-COINFLIP-3D-PBR-TEXTURES` |
| `DEF-MINES-FLAT-TILES` | Mines | Uncovered tiles lack bevel depth; gems lack refraction shine. | Low | `REC-MINES-VOLUMETRIC-TILE-REVEAL` |

## Resolved Defects

| Defect ID | Game | Resolution | Date |
|---|---|---|---|
| `DEF-PLINKO-FLAT-PEGS` | Plinko | Replaced flat 2D peg circles with 3D radial metallic specular gradients, rebound shockwave rings, and illuminated neon multiplier pockets. | 2026-10-17 |
