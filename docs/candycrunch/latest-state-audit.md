# Candy Crunch: Ultra Visual + VFX + Animation + Failure Engine Upgrade

## Current System State Audit

| System | Status | Notes |
| :--- | :--- | :--- |
| **Rendering Engine** | NEEDS_UPGRADE | Current ThreeCandyRenderer.tsx and AdvancedCandyRenderer.tsx are functional but lack AAA material physical models. |
| **Candy System** | NEEDS_UPGRADE | CandyIdentityRegistry.ts exists but uses identical shapes/silhouettes. Colors are distinct but materials are flat. |
| **Board System** | PARTIAL | BoardRenderer.ts is somewhat 3D but feels flat. Needs depth, shadows, parallax. |
| **Level Generator** | PARTIAL | LevelGenerator.ts generates levels but lacks ML/procedural infinite scaling difficulty. |
| **Special Candies** | MISSING | Premium unique models/materials for specials are absent (generic shapes used). |
| **Combo Engine** | PARTIAL | Match3Engine.ts handles logic but SpecialComboCinematics.ts lacks mega-explosion scaling and layered VFX. |
| **Animation Engine** | NEEDS_UPGRADE | AnimationEngine.ts uses linear swaps. Needs elastic anticipation, overshoot, and settle. |
| **VFX Engine** | NEEDS_UPGRADE | VFXManager.ts is basic. Needs Particle Engine V2 (GPU optimized), unique destruction. |
| **Audio Engine** | NEEDS_UPGRADE | soundEngine.ts is generic. Needs layered audio and audio physicality based on combo size. |
| **AI Systems** | PARTIAL | AILevelDirector.ts and AIAdvisorModal.tsx exist but AI difficulty learning is rudimentary. |
| **Performance Systems** | PARTIAL | QualityManager.ts is present but needs rigorous scaling (GPU pooling). |
| **Upgrade Safety Systems** | MISSING | CandyCrashGuard failure recovery is non-existent. |
| **Quality Governor** | MISSING | Needs visual regression AI and automatic screenshot checks. |
| **Asset Pipeline** | NEEDS_UPGRADE | Needs procedural unique geometry generation per candy family. |

## Mission Objective
Transform Candy Crunch into a PREMIUM AAA MATCH-3 GAME focusing on unique identities, satisfying destruction, and buttery-smooth elastic game feel.
