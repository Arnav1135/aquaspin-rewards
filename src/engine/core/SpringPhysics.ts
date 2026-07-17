// src/engine/core/SpringPhysics.ts
export class SpringPhysics {
  mass: number;
  stiffness: number;
  damping: number;
  position: number;
  velocity: number;
  target: number;

  constructor({ mass = 1, stiffness = 170, damping = 26, initialPosition = 0 }) {
    this.mass = mass;
    this.stiffness = stiffness;
    this.damping = damping;
    this.position = initialPosition;
    this.velocity = 0;
    this.target = initialPosition;
  }

  setTarget(target: number) {
    this.target = target;
  }

  setVelocity(velocity: number) {
    this.velocity = velocity;
  }

  tick(deltaTime: number): boolean {
    // DeltaTime is assumed to be in seconds. Cap to avoid exploding physics on lag spikes.
    const dt = Math.min(deltaTime, 0.064);

    const force = -this.stiffness * (this.position - this.target) - this.damping * this.velocity;
    const acceleration = force / this.mass;

    // Euler integration
    this.velocity += acceleration * dt;
    this.position += this.velocity * dt;

    // Check if settled
    const isAtRest = Math.abs(this.velocity) < 0.01;
    const isAtTarget = Math.abs(this.position - this.target) < 0.01;

    if (isAtRest && isAtTarget) {
      this.position = this.target;
      this.velocity = 0;
      return true; // Settled
    }

    return false; // Still moving
  }
}
