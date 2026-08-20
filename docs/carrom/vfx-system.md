# VFX System

The VFX system is heavily tied into the deterministic physics engine.

- **Collision Sparks**: Spawned dynamically based on relative velocity and impulse energy at the contact point.
- **Dust**: Heavy impacts on the wood board displace subtle instanced particle dust.
- **Pooling**: All particles are instantiated once and pooled, utilizing `InstancedMesh` for rendering to ensure zero allocation overhead during runtime.
