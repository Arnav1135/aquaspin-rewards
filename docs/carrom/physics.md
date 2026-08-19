# Carrom Physics Architecture

## Engine
We use `@react-three/rapier` which binds to the deterministic Rapier 3D physics engine via WASM.

## Determinism
The physics engine is configured with a fixed time step (`1 / 120`). Render frames are interpolated, but the underlying physics simulation always advances in deterministic increments. This allows replay systems to perfectly recreate a shot given the same initial state and input impulse.

## Sub-stepping and CCD
Continuous Collision Detection (CCD) is enabled on high-velocity dynamic bodies (Striker, Coins) to prevent tunneling through the board rails or other coins at high speeds. 

## Physical Properties
All friction, restitution (bounciness), and mass values are centralized in `CarromPhysicsConstants.ts` to ensure consistent tuning.

- **Board Friction:** Very low (simulating boric powder).
- **Edge Restitution:** High (elastic rails).
- **Coin Mass:** Standardized relative to the Striker to ensure realistic momentum transfer.
