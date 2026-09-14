export const CARROM_PHYSICS = {
  BOARD: {
    WIDTH: 0.74, 
    BORDER_WIDTH: 0.076, 
    FRICTION: 0.08, 
    RESTITUTION: 0.1, 
    EDGE_RESTITUTION: 0.92, 
    EDGE_FRICTION: 0.05, 
    THICKNESS: 0.016, // 16mm ply
  },
  COIN: {
    RADIUS: 0.0159, 
    HEIGHT: 0.008, 
    MASS: 0.0055, 
    FRICTION: 0.08, 
    RESTITUTION: 0.9, 
    LINEAR_DAMPING: 0.45,
    ANGULAR_DAMPING: 0.6,
  },
  STRIKER: {
    RADIUS: 0.02065, 
    HEIGHT: 0.008, 
    MASS: 0.015, 
    FRICTION: 0.05, 
    RESTITUTION: 0.9, 
    LINEAR_DAMPING: 0.35,
    ANGULAR_DAMPING: 0.5,
  },
  PHYSICS: {
    TIME_STEP: 1 / 240, // Bump to 240Hz for precise high-speed collisions
    CCD_ENABLED: true, 
    MAX_VELOCITY: 8.0, 
    SLEEP_THRESHOLD: 0.005,
    RENDER_INDEPENDENT: true, 
    INTERPOLATION_FACTOR: 0.2, 
  },
  POCKET: {
    RADIUS: 0.0222, 
    DEPTH: 0.04,
  }
};
