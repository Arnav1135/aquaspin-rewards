# Animation System

Carrom uses physics-driven animation.
Instead of arbitrary timelines, components read the physical state (e.g., velocity, angular velocity) to determine visual presentation.

- **Coins**: Rotation visually aligns exactly with their physics body quaternion.
- **Pockets**: Cloth deformation is calculated based on the impact energy of a coin hitting the pocket sensor.
