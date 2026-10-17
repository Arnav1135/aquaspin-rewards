# Performance & Rendering Baseline

## Target Performance Budgets
- **Frame Rate:** Stable 60 FPS on desktop (Chrome/Firefox/Edge/Safari) and modern mobile devices (iOS Safari, Android Chrome).
- **Bundle Impact:** Upgrades must maintain minimal bundle overhead (< 15 kB uncompressed per game module).
- **Canvas Draw Overhead:** Canvas loop execution time < 4ms per frame.
- **Memory Footprint:** Clean disposal of canvas objects and intervals on component unmount (no memory leaks).

## Current Benchmarks (Verified 2026-10-17)

| Game | Viewport | Target FPS | Canvas / Render Overhead | Build Status |
|---|---|---|---|---|
| Plinko (Upgraded) | 420x430 | 60 FPS | ~1.8ms per tick | PASS |
| Roulette | Responsive | 60 FPS | CSS/SVG transforms | PASS |
| CoinFlip | Responsive | 60 FPS | 3D CSS matrix | PASS |
| Mines | Responsive | 60 FPS | DOM / Framer Motion | PASS |
