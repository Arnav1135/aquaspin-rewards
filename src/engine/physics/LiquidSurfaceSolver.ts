/**
 * Phase 8/9: Deterministic Liquid Surface Solver
 * No React. No Three.js. Pure math and physics.
 */

export interface SurfaceSolverInputs {
  rotationZ: number; // Tube tilt angle
  angularVelocity: number; // Speed of tilt
  fillPercentage: number; // 0.0 to 1.0
  viscosity: number; // Fluid resistance
  gravity: number; // Usually 9.8
  deltaTime: number; // Time step
}

export interface SurfaceSolverOutputs {
  surfaceTilt: number; // The actual angle of the liquid surface
  waveAmplitude: number; // Current wave height
  waveFrequency: number; // Sloshing frequency
  surfaceVelocity: number; // Surface movement speed
}

export class LiquidSurfaceSolver {
  private currentTilt: number = 0;
  private currentAmplitude: number = 0;
  private currentVelocity: number = 0;
  private sloshPhase: number = 0;

  // Spring constants for the surface seeking gravity
  private stiffness: number = 150.0;
  private dampingBase: number = 10.0;

  public reset() {
    this.currentTilt = 0;
    this.currentAmplitude = 0;
    this.currentVelocity = 0;
    this.sloshPhase = 0;
  }

  public step(inputs: SurfaceSolverInputs): SurfaceSolverOutputs {
    // 1. Surface Tilt lagging behind rotation
    // The surface always wants to remain horizontal (0 tilt in world space),
    // relative to the tube's local rotation.
    // So the target tilt of the liquid relative to the tube is -inputs.rotationZ.
    const targetTilt = -inputs.rotationZ;
    
    // Viscosity adds damping. Gravity increases restoring force.
    const effectiveStiffness = this.stiffness * (inputs.gravity / 9.8);
    const effectiveDamping = this.dampingBase + (inputs.viscosity * 20.0);

    const tiltForce = (targetTilt - this.currentTilt) * effectiveStiffness;
    const dampingForce = -this.currentVelocity * effectiveDamping;
    const acceleration = tiltForce + dampingForce;

    this.currentVelocity += acceleration * inputs.deltaTime;
    this.currentTilt += this.currentVelocity * inputs.deltaTime;

    // 2. Wave Amplitude & Frequency (Sloshing)
    // Rapid angular velocity or sudden acceleration causes waves.
    const sloshExcitation = Math.abs(inputs.angularVelocity) * 0.1;
    this.currentAmplitude += sloshExcitation;

    // Decay amplitude over time due to viscosity
    this.currentAmplitude *= Math.max(0, 1.0 - (inputs.viscosity + 0.5) * inputs.deltaTime * 5.0);
    if (this.currentAmplitude < 0.001) this.currentAmplitude = 0;

    // Frequency changes based on fill volume (less liquid = faster slosh)
    const baseFrequency = 15.0;
    const frequency = baseFrequency + (1.0 - inputs.fillPercentage) * 10.0;
    
    this.sloshPhase += frequency * inputs.deltaTime;

    return {
      surfaceTilt: this.currentTilt,
      waveAmplitude: this.currentAmplitude,
      waveFrequency: frequency,
      surfaceVelocity: this.currentVelocity
    };
  }
}
