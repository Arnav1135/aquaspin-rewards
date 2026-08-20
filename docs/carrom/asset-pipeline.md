# Asset Pipeline

The Carrom Asset Pipeline is designed to ingest, validate, and optimize 3D assets to ensure high performance and resilience.

## Core Features
1. **Validation**: All geometry is checked for NaN vertices and invalid attributes to prevent WebGL crashes.
2. **Normalization**: Pivots for coins and strikers are automatically centered based on their bounding boxes.
3. **Graceful Fallbacks**: If an asset fails validation or is missing, the system uses robust procedural fallbacks (generated at runtime) to ensure gameplay is never blocked.
4. **Prewarming**: Critical hero assets are loaded asynchronously into memory before gameplay starts.
5. **Draco Compression**: The pipeline leverages `DRACOLoader` via `three-stdlib` for efficient transmission.
