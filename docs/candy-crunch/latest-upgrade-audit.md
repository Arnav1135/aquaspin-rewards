# CANDY CRUNCH 3D EXPERIENCE ENGINE: CURRENT-STATE AUDIT

## CURRENT IMPLEMENTATION
The project is currently a functional React-based Match-3 puzzle game (`Candy Crunch`). The repository leverages `React`, `Three.js` (via a monolithic `ThreeCandyRenderer.tsx`), `Vite`, and `TailwindCSS`. The gameplay logic is handled entirely by `Match3Engine.ts` and React state via Zustand (`GameStore.ts`). 

## WHAT WAS ALREADY UPGRADED
- **Dynamic Difficulty & Level Generation:** 31 episodes and logic to support levels up to 300+ using `getScaledLevelConfig`.
- **Renderer Inclusion:** A basic Three.js renderer (`ThreeCandyRenderer.tsx`) was introduced to render 3D candy shapes and basic falling physics over a 2D DOM/Tailwind HUD.
- **Fairness & Logic Engine:** Implemented algorithms like DFS island detection and choke-point analysis in `FairnessEvaluator.ts`.
- **AI Modal:** A basic `AIAdvisorModal` exists which calculates advice via a fallback tactical AI engine (`getBestMoveAdvice` in `Match3Engine.ts`).

## WHAT IS STRONG
- **Core Rules Engine:** The Match-3 logic (`Match3Engine.ts`) is robust, handling cascades, special candies, blockers (frosting, chocolate, licorice), and gravity correctly.
- **Level Ecosystem:** The game already has a deep level library (31 episodes, 300+ procedural scaling) and supports multiple objective types (score, jelly, ingredients, orders).
- **Zustand State:** Game state is centralized and efficiently decoupled from direct DOM manipulation.

## WHAT IS STILL WEAK
- **Rule/Renderer Coupling:** The `ThreeCandyRenderer.tsx` reads directly from the React `board` state array in a `useEffect` dependency array, rather than responding to fine-grained gameplay events (e.g., `MATCH_CREATED`, `CASCADE_STARTED`). This causes sync issues and prevents complex, sequenced animations.
- **Monolithic Renderer:** The entire Three.js setup (Scene, Camera, Renderer, Mesh Generation, Animation Loop, Input handling) is crammed into one massive React component (`ThreeCandyRenderer.tsx`).
- **Resource Management:** Geometry and Materials are created per tile dynamically without a centralized cache/pool, leading to high memory overhead and GC pauses.
- **Procedural Hardcoding:** Despite dynamic scaling, there are still implicit 8x8 assumptions in camera zoom calculations and board background generation logic.

## TECHNICAL DEBT
- Event emission architecture is missing. Gameplay state doesn't wait for animations or VFX to complete.
- `CandyCrunchApp.tsx` contains hardcoded `fetch` calls for AI generation instead of utilizing a dedicated API service layer.
- `Match3Engine.ts` is becoming a "God Class" that handles logic, AI advice, level validation, and initialization.

## VISUAL LIMITATIONS
- Materials are basic `MeshStandardMaterial` or `MeshBasicMaterial`. No physically based rendering (PBR) features like transmission (glass/gummy feel), clearcoat, or subsurface scattering.
- The environment is simply a flat directional light and point light over a generic grid background. No HDR environment maps.
- No dynamic lighting responses (bloom, screen-space reflections, tone mapping).

## ANIMATION LIMITATIONS
- Animations are purely rudimentary frame-delta lerping (`position.y += velocityY * delta`) injected directly into the monolithic render loop.
- No tweening engine for squashing, stretching, bouncing, or bezier path motion.
- Special candy activations lack cinematic camera focus or detailed destruction timelines.

## VFX LIMITATIONS
- `CandyVFXProfile.updateParticles` exists, but lacks a robust `VFXManager`.
- No color-aware particle systems or specialized combo effects (e.g., Striped + Wrapped giant cross blast just "happens" instantly on the logical board without visual sequence).
- Lack of object pooling leads to frame drops during large cascades.

## RENDERER LIMITATIONS
- Quality is hardcoded. It uses a fixed `devicePixelRatio` clamp and hardcoded shadow map resolutions.
- No adaptive resolution scaling or LOD for mobile devices.
- No post-processing pipeline (EffectComposer) established.

## SIMULATOR LIMITATIONS
- The current simulator (`LevelValidator` / `FairnessEvaluator`) only validates the *initial* board state for islands/choke points. It does not run Monte Carlo simulations to estimate true difficulty through deep gameplay trees.

## AI LIMITATIONS
- `AIAdvisorModal` merely calls a hardcoded brute-force 1-step lookahead algorithm (`getBestMoveAdvice` in `Match3Engine.ts`) rather than utilizing an LLM or deep reinforcement learning for genuine contextual advice.
- AI level generation is completely detached from the fairness simulator; it blindly generates a JSON config without verifying if it's fun or playable.

## PERFORMANCE RISKS
- Creating new `THREE.Mesh` and `THREE.BoxGeometry` for every tile on every board refill will crater FPS on mobile devices during large cascades due to garbage collection.
- Absence of animation pooling.
- Massive React re-renders triggered by the `board` state array changing every frame during gravity cascades.

## RECOMMENDED IMPLEMENTATION ORDER
1. **BASELINE (Phase 1):** Record current performance metrics.
2. **RENDERER ARCHITECTURE (Phase 2 & 3):** Break `ThreeCandyRenderer.tsx` into `renderer/` folder (SceneManager, CameraManager, etc.).
3. **RESOURCE CACHING (Phase 6):** Implement `GeometryCache`, `MaterialCache`.
4. **CANDY RENDERER & MATERIALS (Phase 7 & 8):** Implement PBR gummy/glossy materials.
5. **ANIMATION & VFX ENGINE (Phase 12 & 17):** Decouple animation from the main game loop using a Tweening engine.
6. **RULE/RENDERER SEPARATION (Phase 34):** Implement an Event Bus so the renderer reacts to `MATCH_CREATED` rather than array mutations.
7. **SIMULATOR & AI (Phases 22-31):** Deepen the Monte Carlo simulator and connect the AI Level Director to it.
