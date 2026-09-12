export const CARROM_PHYSICS = {
  BOARD: {
    WIDTH: 0.74, 
    BORDER_WIDTH: 0.05, 
    FRICTION: 0.15, 
    RESTITUTION: 0.2, 
    EDGE_RESTITUTION: 0.85, 
    EDGE_FRICTION: 0.1, 
  },
  COIN: {
    RADIUS: 0.0159, 
    HEIGHT: 0.008, 
    MASS: 0.005, 
    FRICTION: 0.1, 
    RESTITUTION: 0.8, 
    LINEAR_DAMPING: 0.6, // Increased for realistic drag
    ANGULAR_DAMPING: 0.7, // Increased for realistic drag
  },
  STRIKER: {
    RADIUS: 0.0206, 
    HEIGHT: 0.008, 
    MASS: 0.015, 
    FRICTION: 0.08, 
    RESTITUTION: 0.85, 
    LINEAR_DAMPING: 0.5, // Increased slightly
    ANGULAR_DAMPING: 0.6,
  },
  PHYSICS: {
    TIME_STEP: 1 / 120, // Strictly governed fixed timestep at 120Hz
    CCD_ENABLED: true, 
    MAX_VELOCITY: 5.0, 
    SLEEP_THRESHOLD: 0.01,
    RENDER_INDEPENDENT: true, 
    INTERPOLATION_FACTOR: 0.15, 
  },
  POCKET: {
    RADIUS: 0.0222, 
    DEPTH: 0.02,
  }
};
