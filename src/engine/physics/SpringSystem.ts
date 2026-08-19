export interface SpringState {
  current: number;
  target: number;
  velocity: number;
}

export class SpringSystem {
  /**
   * Phase 9: Second-Order Damped Spring Physics Evaluator
   * Solves F = -k*x - c*v for continuous, non-linear physical motion.
   */
  public static update(
    state: SpringState,
    stiffness: number = 180,
    damping: number = 12,
    deltaTime: number = 0.016
  ): number {
    const displacement = state.current - state.target;
    const springForce = -stiffness * displacement;
    const dampingForce = -damping * state.velocity;
    const acceleration = springForce + dampingForce;

    state.velocity += acceleration * deltaTime;
    state.current += state.velocity * deltaTime;

    return state.current;
  }

  /**
   * Applies impulse velocity to a spring system for reactive micro-impacts
   */
  public static applyImpulse(state: SpringState, impulse: number) {
    state.velocity += impulse;
  }
}
