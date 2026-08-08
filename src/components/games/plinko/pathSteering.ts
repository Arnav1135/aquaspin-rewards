

export interface PathSteeringState {
  path: ('L' | 'R')[];
  currentRow: number; // No longer just an index incremented on hit
  lastSteeredRow: number;
  targetBucket: number;
  totalRows: number;
}

const PEG_SPACING_Y = 0.8;

export function getBiasImpulse(
  state: PathSteeringState,
  ballY: number,
  boardOriginY: number
): { x: number, y: number, z: number } | null {
  // Calculate logical row based on Y position.
  // Board origin Y is where the top peg is.
  // ballY - boardOriginY is 0 for the first row, -0.8 for the second, etc.
  const relativeY = boardOriginY - ballY;
  const logicalRow = Math.max(0, Math.floor((relativeY + PEG_SPACING_Y / 2) / PEG_SPACING_Y));
  
  if (logicalRow >= state.totalRows) return null;
  if (logicalRow <= state.lastSteeredRow) return null; // already steered this row
  
  state.lastSteeredRow = logicalRow;
  state.currentRow = logicalRow + 1;
  
  const direction = state.path[logicalRow];
  
  // Smooth bounded steering. Max steering force remains within normal bounds.
  // We use a gentle constant magnitude. No overpowering final rows.
  const magnitude = 0.05 + (logicalRow / state.totalRows) * 0.02; // Slightly scales down but never snaps
  
  const impulseX = direction === 'R' ? magnitude : -magnitude;
  
  return { x: impulseX, y: 0, z: 0 };
}
