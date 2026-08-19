# Carrom Upgrade Safety

## Isolation Principle
The physical simulation (`src/games/carrom/physics`) is strictly isolated from the visual rendering (`src/games/carrom/rendering`). Upgrading visual assets, lighting rigs, or UI will never alter the trajectory of a shot.

## Versioning
Configuration constants are versioned. If a physics update is shipped, older replay data will still use the legacy constants to guarantee exact playback.
