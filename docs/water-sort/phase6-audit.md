# Phase 6 — Water Sort Audit

## Overview
This document audits the current state of the Water Sort implementations (`WaterSort3D.tsx`, `water-sort-pro`, etc.) against the Phase 6 Hyper-Realistic Liquid Simulation requirements. The goal is to identify duplicated logic, placeholder visuals, and systems ready for migration to the Aqua Spin Universal Ecosystem.

---

## Logic & Gameplay Core

| Subsystem | Status | Notes |
| :--- | :--- | :--- |
| **Game Rules (PuzzleEngine)** | `IMPLEMENTED` | `water-sort-pro` handles valid pour checks, win states, and move limits accurately. |
| **Level Generation** | `DUPLICATED` | `WaterSort3D.tsx` contains a naive reverse-move generator. `water-sort-pro/core/LevelGenerator.ts` contains the robust procedural generator. The naive one must be removed. |
| **Solver (BFS Hybrid)** | `IMPLEMENTED` | `water-sort-pro/core/Solver.ts` is robust (handles state hashing, transposition tables, deadlock detection). Ready for integration. |
| **Difficulty Engine** | `IMPLEMENTED` | Exists in `water-sort-pro`. It scores based on color count, depth, and branching factor. |
| **Hint Engine** | `IMPLEMENTED` | Exists in `water-sort-pro`. It classifies moves using the solver. `WaterSort3D.tsx` uses a placeholder hint loop. |
| **Level Novelty** | `PARTIAL` | `AntiRepetitionEngine.ts` exists but needs hooking into the main generation pipeline. |

---

## Visual Presentation (`WaterSort3D.tsx`)

| Subsystem | Status | Notes |
| :--- | :--- | :--- |
| **Liquid Renderer** | `PLACEHOLDER` | Currently uses flat `<cylinderGeometry>` segments stacked on top of each other. High draw calls. Flat `MeshPhysicalMaterial`. Lacks surface curvature, depth shading, meniscus, or realistic boundaries. |
| **Glass Renderer** | `PARTIAL` | Uses a basic double-sided cylinder with high transmission and a gold torus rim. It lacks rim/base thickness, Fresnel, refractive distortions, and procedural imperfections. |
| **Pour Animation** | `PLACEHOLDER` | Uses a basic 300ms `setTimeout` to snap state. The tube tilts via `useSpring` but there is no stream, no droplets, no physical flow interpolation. |
| **Liquid Surface / Inertia** | `PLACEHOLDER` | Does not exist. Liquid segments are completely rigid and do not slosh, tilt, or ripple. |
| **Table / Environment** | `PLACEHOLDER` | Currently a massive flat plane (`<planeGeometry args={[100, 100]}>`). Lacks high-quality PBR wood materials or environment mapping context. |

---

## Simulation & Physical Effects

| Subsystem | Status | Notes |
| :--- | :--- | :--- |
| **Droplet Physics** | `PLACEHOLDER` | Does not exist. Requires pooled particles reacting to gravity/drag. |
| **Splash & Foam** | `PLACEHOLDER` | Does not exist. |
| **Liquid Mixing** | `PLACEHOLDER` | Instant color replacement. Lacks visual gradient/diffusion. |
| **Physical Event Graph** | `PARTIAL` | Game state isn't emitting universal `POUR_STARTED`, `POUR_IMPACT` events yet. |
| **Audio** | `PARTIAL` | `audioManager.ts` plays basic sounds. Lacks dynamic flow-rate mapping, impact differentiation, or seamless loops. |

---

## Next Steps

1. **Purge Duplication**: Strip `WaterSort3D.tsx` of its naive generator and hint system. Wire it directly to `water-sort-pro/core` systems.
2. **Migrate Liquid**: Remove cylinder stacks. Introduce `LiquidVisualEngine` compatibility and create `WaterSortLiquidProfile`.
3. **Upgrade Materials**: Convert the Glass Tube to a highly refractive, physically thick material using the universal material factory.
4. **Build Stream Solver**: Create the visual pour stream interpolation.
