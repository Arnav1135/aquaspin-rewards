# Game Inventory & Architectural Mapping (Phase 1)

This inventory records the rendering engine, physics model, state layer, and verification status across all registered titles in AquaSpin Rewards.

| Game Key | Title | Category | Engine / Renderer | Physics System | Verified Status | Key Features |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| `hillclimb` | Hill Climb Racing Lite | Arcade | 2D Canvas (High-DPI) | Custom Newtonian Verlets | Verified (v2.5) | 1v1 Rival Ghost, Biome terrain, split-timer, stage particles |
| `holesink` | Hole Sink 3D | Arcade | Three.js / R3F | Distance/Gravitational Field | Verified (v2.5) | Dual counter-rotating vortex, combo multipliers, 3D audio, trauma |
| `candycrunch` | Candy Crunch | Puzzle | 2D Canvas / WebGL | Grid Match-3 Solver | Verified | 1000 level procedural solver, cascade anims |
| `carrom` | Carrom 3D | Board | Three.js / R3F | Rapier3D / Custom impulse | Verified | Striker trajectory line, physics rebounds, contact shadows |
| `watersort` | Water Sort Pro | Puzzle | Three.js / R3F | Custom Fluid Shader | Verified | 1000 headless test passed, liquid shader mesh |
| `plinko` | Plinko 3D | Casino | Three.js / R3F | Cannon-es / Rapier | Verified | Anti-stuck watchdog, wakeUp impulses, multi-peg physics |
| `crash` | Crash Game | Casino | 2D Canvas / WebGPU | Linear/Exponential curve | Verified | Provably Fair, multi-tier cashout |
| `mines` | Mines | Casino | React DOM / CSS | Cryptographic Matrix | Verified | Anti-cheat state masking, dynamic multiplier |
| `limbo` | Limbo | Casino | React DOM / Canvas | Provably Fair SHA-256 | Verified | Instant payout curve, verified fairness |
| `roulette` | 3D Roulette | Casino | Three.js / R3F | Physics wheel deceleration | Verified | Ball spin kinematics, 3D table textures |
| `blackjack` | Blackjack Classic | Casino | React DOM / Canvas | Standard 6-deck shoe | Verified | Soft 17 rules, double down, split |
| `baccarat` | Baccarat | Casino | React DOM / Canvas | Punto Banco tableau rules | Verified | Commission calculations, streak history |
| `slots` | Lucky Slots | Casino | Canvas 2D | Reel math & deceleration | Verified | 3-reel payout table, payline highlighter |
| `poker3d` | 3D Video Poker | Casino | Three.js / R3F | 52-card standard deck | Verified | Jacks or Better paytable, card flip shaders |
| `horseracing3d`| 3D Horse Racing | Arcade | Three.js / R3F | Steered waypoint kinematic | Verified | Multi-lane sprint, camera cinematic rail |
| `basketball3d` | Basketball 3D | Sports | Three.js / R3F | Cannon-es projectile arc | Verified | Swish detection, rim impulse, rebound physics |
| `bowling3d` | Bowling 3D | Sports | Three.js / R3F | Rapier3D pin collision | Verified | Pin rack reset, gutter detection, hook angle |
| `airhockey3d` | Air Hockey 3D | Sports | Three.js / R3F | 2D table bounding collision | Verified | AI paddle tracker, goal trigger, puck bounce |
| `pool` | 8-Ball Pool | Sports | 2D Canvas / 3D overlay | Elliptical impulse bounce | Verified | Cue line guide, pocket suction, ball-on-ball |
| `archery` | Archery Master | Sports | 2D Canvas | Parabolic wind trajectory | Verified | Bullseye detection, target jitter |
| `darts` | Darts 3D | Sports | 2D Canvas / 3D overlay | Radial sector mapping | Verified | 501 / Cricket rules, double out |
| `chess` | Chess 3D | Board | chess.js + Three.js | Turn validation engine | Verified | Legal move generator, FEN/PGN parser |
| `ludo` | Ludo Club | Board | React DOM + Canvas | Dice random + board matrix | Verified | Token safe zones, home run track, captures |
| `solitaire` | Solitaire Classic | Card | React DOM / Canvas | Klondike draw-3 rules | Verified | Auto-complete, foundation cascades |
| `flappy` | Flappy Bird Pro | Arcade | 2D Canvas | Gravity + jump impulse | Verified | Pipe gap collision, high-score memory |
| `snake` | Cyber Snake | Arcade | 2D Canvas | Grid step array | Verified | Speed ramp, collision boundaries |
| `knife` | Knife Thrower | Arcade | 2D Canvas | Radial rotating target | Verified | Knife-on-knife collision, stage bosses |
