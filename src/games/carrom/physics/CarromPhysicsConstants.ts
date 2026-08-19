export const CARROM_PHYSICS = {
  BOARD: {
    WIDTH: 0.74, // Standard 74cm playing surface
    BORDER_WIDTH: 0.05, // 5cm wooden border
    FRICTION: 0.15, // Extremely smooth playing surface (boric powder)
    RESTITUTION: 0.2, // Board surface doesn't bounce
    EDGE_RESTITUTION: 0.85, // Highly elastic wooden rails
    EDGE_FRICTION: 0.1, // Low friction on the rails
  },
  COIN: {
    RADIUS: 0.0159, // Standard 3.18cm diameter
    HEIGHT: 0.008, // Standard 8mm thickness
    MASS: 0.005, // 5 grams
    FRICTION: 0.1, // Smooth wooden/plastic coins
    RESTITUTION: 0.8, // Bouncy collisions between coins
    LINEAR_DAMPING: 0.4, // Gradual slowdown from friction
    ANGULAR_DAMPING: 0.5, // Spin slowdown
  },
  STRIKER: {
    RADIUS: 0.0206, // Standard 4.13cm diameter
    HEIGHT: 0.008, // 8mm thickness
    MASS: 0.015, // 15 grams (3x heavier than coin)
    FRICTION: 0.08, // Ultra smooth polymer
    RESTITUTION: 0.85, // Bouncy collisions
    LINEAR_DAMPING: 0.35, // Glides slightly better than coins
    ANGULAR_DAMPING: 0.4,
  },
  PHYSICS: {
    TIME_STEP: 1 / 120, // 120Hz deterministic step
    CCD_ENABLED: true, // Continuous Collision Detection
    MAX_VELOCITY: 5.0, // Terminal velocity limit
    SLEEP_THRESHOLD: 0.01,
  },
  POCKET: {
    RADIUS: 0.0222, // 4.45cm diameter (generous)
    DEPTH: 0.02,
  }
};
