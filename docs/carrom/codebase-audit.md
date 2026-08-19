# Codebase Audit: Aqua Spin Rewards (Carrom 3D Integration)

## 1. Engine & Rendering
- **React Three Fiber (@react-three/fiber):** The core 3D integration layer inside the React ecosystem.
- **Three.js (v0.185.1):** The underlying 3D graphics rendering engine.
- **Drei (@react-three/drei):** Provides reusable 3D helpers (cameras, controls, loaders, environment HDR, shadows, etc.).
- **Postprocessing (@react-three/postprocessing):** Advanced effects like Bloom, SSAO, and Vignette are available.

## 2. Physics Libraries Available
- **@react-three/rapier & @dimforge/rapier3d-compat:** Robust, deterministic physics engine with built-in CCD (Continuous Collision Detection). Extremely well-suited for fast-moving coins and strikers.
- **@react-three/cannon & cannon-es:** Alternative lightweight physics. (Less suitable for CCD requirements compared to Rapier).

## 3. State Management
- **Zustand:** Ideal for high-performance, decoupled game state (turn management, score, current player) independent of React's render cycle.

## 4. Animation & VFX
- **GSAP & Framer Motion:** Good for UI and non-critical interpolations, but not recommended for physics-critical visual updates.
- **Three.js Instancing & Particles:** Must be built natively or utilizing `drei`'s `Instances` for pooled VFX (dust, sparks).

## 5. Existing Reusable Systems
- The `src/engine/` folder contains infrastructure for `input`, `audio`, `vfx`, `analytics`, `debug`, and `state`.
- **Note:** Carrom specific logic should be heavily isolated in `src/games/carrom/` to prevent contaminating other games, but should hook into `engine/audio` or `engine/analytics` where appropriate.

## Conclusion & Strategy
We will use **Rapier (@react-three/rapier)** for the physics engine because it supports robust Continuous Collision Detection (CCD), which is critical to prevent coins or strikers from tunneling through the board walls at high speeds. The architecture will follow a strict MVC-like separation, where the physics simulation drives the logical state, and the renderer merely interpolates and displays the results.
