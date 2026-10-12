# Aqua Blue Game Reverse-Engineering & Integration Protocol

This repository is equipped with an autonomous **Reverse-Engineering & Game Integration Pipeline** configured to port, adapt, and harden any game repository (including projects from [github.com/topics/reverse-engineering](https://github.com/topics/reverse-engineering), HTML5/Canvas/WebGL games, Three.js, Phaser, or React games) directly into the Aqua Blue web app.

---

## How It Works

Next time you want to integrate any game into the web app, simply prompt with the GitHub repository URL or game concept:
> *"Integrate this game repo into my web app: https://github.com/[author]/[repo]"*

The assistant will autonomously execute the **4-Phase Reverse-Engineering Protocol**:

### Phase 1: Deep Reverse Engineering
- **Game Loop & Tick Extraction**: Decomposes `requestAnimationFrame`, fixed update ticks, and physics updates.
- **Math & Mechanics Extraction**: Extracts odds tables, multipliers, RNG distribution, and collision equations.
- **State Machine Deconstruction**: Maps states (`IDLE`, `BETTING`, `ACTIVE`, `SETTLING`, `PAYOUT`).
- **Aesthetic Refinement**: Upgrades visuals to Aqua Blue's signature luxury casino palette (obsidian, mahogany, brushed gold, emerald green — no garish neon).

### Phase 2: Architecture & Security Adapter Integration
Located in `src/engine/reverse_engineering/ReverseEngineeringAdapter.ts`:
- **`ReverseEngineEconomyBridge`**: Upfront bet deduction (`secureUpdateTokens`) and tamper-resistant payout settlement (`secureRecordGameResult`) with 0 duplicate deductions and full anti-cheat hardening.
- **`ReverseEngineGameLoop`**: High-precision frame loop with delta-time clamping (prevents spiral of death on tab unfocus).
- **`ReverseEngineInputNormalizer`**: Touch & mouse coordinate normalization with Retina / HiDPI support.
- **`useReverseEngineLifecycle`**: Safe timeouts, animation tween cleanup, and unmounted state guards.
- **3D / 2D Context Safety**: Encapsulated in `<ErrorBoundary>` with 2D fallbacks; R3F hooks kept strictly within Canvas.

### Phase 3: Catalog & Router Integration
- Automatically registered in `factory/games/registry/games.json`.
- Integrated into `src/pages/MiniGames.tsx` and modal game shells.

### Phase 4: Verification & Live Production Deployment
- Verified via `npx tsc --noEmit` (0 errors required).
- Built via `npm run build`.
- Committed to `main`, pushed to GitHub, and deployed live to Vercel production.
