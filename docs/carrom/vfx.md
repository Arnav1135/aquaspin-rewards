# Carrom VFX Architecture

## Instanced Particles
To maintain high performance, all collision sparks, board dust, and pocket bursts are managed via instanced meshes or pre-allocated object pools.

## Physics-Driven Effects
Visual effects are directly proportional to collision impulses:
- **Low Impulse:** No VFX.
- **Medium Impulse:** Slight dust.
- **High Impulse:** Distinct directional particle burst along the collision normal.

## Decals
Impact marks on the rails are temporary and pooled to prevent memory leaks over long sessions.
