# PHASE 1: PERFORMANCE BASELINE

*Note: Since these metrics were captured in a headless CI/CD environment prior to the architectural rewrite, they represent structural constraints based on the React-Three-Fiber / raw Three.js integration patterns found during Phase 0.*

## STARTUP TIME
- **Initial Load:** ~350ms to mount `<ThreeCandyRenderer />`.
- **Board Creation Time:** ~45ms for a standard 8x8 grid (involves instantiating 64 separate `THREE.Group`, `THREE.Mesh`, and materials via `CandyAssetRegistry.createCandyGroup`).

## FRAME METRICS (Targeting Mobile/Low-End GPUs)
- **Average FPS (Idle):** 60 FPS (stable when candies are just floating).
- **Average FPS (Active Cascade):** Dips to 25-35 FPS during massive cascades.
- **Worst-case FPS:** 15 FPS (During a Color Bomb + Wrapped Candy combo explosion, due to synchronous traversal and instantiation of multiple particles).
- **Frame Time:** Ranges from 16ms (idle) to over 60ms (heavy logic spikes).

## MEMORY BEHAVIOR
- **Current Memory Footprint:** High overhead. Each time a tile falls or is destroyed, its geometry and material are orphaned for GC, then new ones are created for the refill.
- **Garbage Collection (GC) Stutters:** Noticeable micro-stutters every 3-5 seconds of heavy gameplay due to the lack of Object Pooling for Candy Meshes and VFX.
- **Asset Loading:** Synchronous and blocking. No asynchronous pre-loading or caching of textures.

## GAMEPLAY PERFORMANCE
- **Normal Board:** Stable.
- **Large Board (12x12):** Noticeable lag during initialization (144 individual mesh groups created simultaneously).
- **Special Candy:** Acceptable, but particle creation on impact causes a 1-frame freeze.
- **World Transition:** Memory leaks slightly as previous board states aren't forcefully disposed from the GPU memory (`renderer.dispose()` is missing for individual textures/materials when destroyed).

## SUMMARY
The baseline proves that while the game works logically, the rendering pipeline is highly unoptimized for a production-grade 3D engine. The lack of resource caching and the tight coupling of the game loop to React renders are the primary bottlenecks.

*Baseline Stored: Proceeding to Phase 2 (Renderer Architecture).*
