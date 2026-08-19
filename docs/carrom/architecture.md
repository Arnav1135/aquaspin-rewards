# Carrom Architecture Design

## Core Philosophy
The Carrom game uses a strictly deterministic simulation approach. The logical game state and physics simulation are fully decoupled from the visual rendering layer.

## Module Structure (`src/games/carrom/`)

### 1. State & Logic
- **`CarromState` (Zustand):** Holds turn, score, players, game over status, and current active mode.
- **`CarromTurnManager`:** Handles the state machine (Aiming -> Power -> Shooting -> Physics -> Resolving -> Next Turn).
- **`CarromRulesEngine`:** Enforces fouls, queen mechanics, pocketing legalities.

### 2. Physics & Simulation (Rapier 3D)
- **`CarromPhysicsEngine`:** Manages Rapier world, rigid bodies, colliders, friction, and restitution.
- **`CarromCollisionSystem`:** Intercepts contact events to trigger audio and VFX. Uses CCD (Continuous Collision Detection) for striker and coins.

### 3. Controllers
- **`CarromInputController`:** Handles drag-to-aim, power selection, and striker horizontal placement.
- **`CarromShotController`:** Translates user input into physical impulse and angular velocity (spin).
- **`CarromCameraController`:** Manages transitions between Top-Down, Gameplay, Aim, and Shot cameras.

### 4. Rendering & Visuals
- **`CarromRenderer`:** The root React Three Fiber canvas component.
- **`CarromMaterialSystem`:** Centralized factory for Wood, Polished Ivory, Polymer, and Metal PBR materials.
- **`CarromVFXSystem`:** Instanced particle pools for collisions and pocket events.
- **`CarromAnimationSystem`:** Handles non-physics interpolations (like pocket sinking and net deformation).

### 5. Quality & Diagnostics
- **`CarromPerformanceManager`:** Monitors FPS and downgrades shadows/postprocessing dynamically.
- **`CarromRenderGuard`:** Handles WebGL context loss recovery and shader fallbacks.
