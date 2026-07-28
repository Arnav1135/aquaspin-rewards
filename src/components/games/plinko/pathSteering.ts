

export interface PathSteeringState {
  path: ('L' | 'R')[];
  currentRow: number;
  targetBucket: number;
  totalRows: number;
}

export function getBiasImpulse(
  state: PathSteeringState
): { x: number, y: number, z: number } {
  // Estimate which row we are hitting based on Y position.
  // The pegs are at Y = -r * PEG_SPACING_Y, where r is 0 to rows.
  // Board origin is [0,4,0] but the game engine might have its own offsets.
  // Assuming the Y positions of pegs are around 0, -1, -2, etc. relative to the board origin.
  // It's safer to just increment currentRow when Y passes a threshold, but the physics can be jittery.
  
  // Actually, we can just look at the path index.
  const row = state.currentRow;
  if (row >= state.path.length) return { x: 0, y: 0, z: 0 };
  
  const direction = state.path[row];
  state.currentRow++; // advance to next row for the next collision
  
  // Calculate base impulse magnitude
  let magnitude = 0.08; 
  
  // Corrective settle window (last 2 rows)
  if (row >= state.totalRows - 2) {
    magnitude = 0.15; // Stronger bias to ensure it lands in the right bucket
  }
  
  const impulseX = direction === 'R' ? magnitude : -magnitude;
  
  // Additionally, apply a small damping to Y velocity if it's too fast? 
  // We'll leave Y alone for natural bouncing, just bias X.
  
  return { x: impulseX, y: 0, z: 0 };
}
