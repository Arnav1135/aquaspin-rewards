# Material System

The Carrom game uses a custom physics-driven material framework. Rather than blindly accepting imported materials (which often carry suboptimal shaders or non-PBR properties), the engine reconstructs them.

## Profiles

*   **Wood Board (`getWoodBoardMaterial`)**: Generates a high-quality wood finish featuring subtle pores, edge variation, clearcoat (0.3), and controlled roughness (0.6).
*   **Coins (`getCoinMaterial`)**: Generates an ivory or deep black polished finish. Metalness is kept low (0.1), while clearcoat gives the impression of a polished resin/wood surface.
*   **Queen (`getQueenMaterial`)**: A premium, deep red material featuring slight transmission (translucency) for a luxury appearance.
*   **Striker (`getStrikerMaterial`)**: Highly polished (roughness: 0.1, clearcoat: 1.0) meant to reflect the HDR environment map strongly.

All materials are standardized through the `CarromMaterialProfile` static class.
