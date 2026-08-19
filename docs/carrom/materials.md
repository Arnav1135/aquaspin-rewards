# Carrom Material Architecture

## Physically Based Rendering (PBR)
All gameplay objects use `meshPhysicalMaterial` or `meshStandardMaterial` to respond correctly to the environment lighting.

## Material Profiles
- **Wood (Board Rails):** High roughness, subtle normal mapping, no clearcoat.
- **Polished Ivory (White Coins):** Low roughness, slight clearcoat.
- **Polished Black (Black Coins):** Low roughness, slight clearcoat.
- **Queen Red (Queen):** Metallic flake appearance with clearcoat.
- **Polymer (Striker):** Ultra-smooth, high clearcoat, distinct micro-surface.

## Fallback System
If a texture or complex shader fails to compile, the system automatically falls back to basic `meshStandardMaterial` using solid colors to guarantee the game remains playable.
