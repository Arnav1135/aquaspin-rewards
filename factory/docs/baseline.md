# AQUA SPIN REWARDS - ARCHITECTURE BASELINE

## Repository Architecture
- **Framework**: React 18 with Vite (TypeScript).
- **Routing**: React Router DOM (Single Page Application).
- **Styling**: Tailwind CSS.
- **State Management**: Zustand (App UI/Auth), TanStack Query (Data Fetching).
- **Backend / Database**: Supabase (PostgreSQL, Edge Functions, Auth).
- **Service Worker / PWA**: Vite PWA plugin with Workbox.

## Current Game Inventory & Architecture
- Games are dynamically lazy-loaded components in `src/pages/MiniGames.tsx`.
- They are imported dynamically using `lazy()`.
- **Game Engine Landscape**:
  - React/DOM native: e.g. TicTacToe, MemoryGame, LudoGame, ClickerGame.
  - PixiJS: WaterSortPro (using Pixi v8).
  - WebGL/ThreeJS/Babylon: e.g. Chess3D, Bowling3D, Plinko.
- **Audio Integration**: Web Audio API inside individual game mixers (e.g. `AudioMixer.ts` in WaterSortPro).
- **Assets**: Stored in `public/` and game-specific folders.

## Current Build & Deployment Process
- **Build System**: `tsc && vite build`.
- **Deployment Platform**: Vercel.
- **CI/CD**: GitHub pushes to `main` trigger Vercel deployments.
- **Testing**: Minimal local unit tests observed; heavily reliant on manual testing. No extensive visual regression suite setup out-of-the-box.

## Critical & High-Risk Files
- `src/App.tsx` and `src/main.tsx`: Entry points; risk of breaking the entire app structure.
- `src/pages/MiniGames.tsx`: The primary catalog entry. Modifying this directly without an automated registry might break lazy loading.
- `supabase/migrations/*`: Breaking database changes can destroy production data.

## Initial Factory Transformation Strategy (Milestones 1 & 2)
To convert this to a factory model without destroying the current setup:
1. Establish a clear `factory/` tooling repository adjacent to `src/`.
2. Extract the hardcoded `lazy` loading in `MiniGames.tsx` to read from a dynamically generated or statically maintained `manifest.json`.
3. Scaffold automated build checks (lint, typescript) for incoming games.
