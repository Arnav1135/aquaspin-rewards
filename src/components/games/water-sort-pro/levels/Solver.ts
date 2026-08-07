// A lightweight puzzle state solver for Water Sort

export interface TubeState {
  colors: number[];
  capacity: number;
}

export class Solver {
  /**
   * Applies random valid reverse moves from a solved state
   * to guarantee the generated level is mathematically solvable.
   */
  static generateReversedState(numColors: number, numEmpty: number, capacity: number, shuffleDepth: number): number[][] {
    const totalTubes = numColors + numEmpty;
    const state: TubeState[] = Array.from({ length: totalTubes }, (_, i) => ({
      colors: i < numColors ? Array(capacity).fill(i + 1) : [],
      capacity
    }));

    let moves = 0;
    while (moves < shuffleDepth) {
      // Find a random valid reverse move
      // A reverse move is: taking top color of tube A and moving it to tube B
      // Conditions:
      // 1. Tube A has at least one color.
      // 2. Tube B is not full.
      // 3. (Optional to avoid trivial loops) Don't immediately undo the last move
      
      const nonEmptyTubes = state.filter(t => t.colors.length > 0);
      const notFullTubes = state.filter(t => t.colors.length < t.capacity);
      
      if (nonEmptyTubes.length === 0 || notFullTubes.length === 0) break;

      const src = nonEmptyTubes[Math.floor(Math.random() * nonEmptyTubes.length)];
      let dest = notFullTubes[Math.floor(Math.random() * notFullTubes.length)];
      
      // Ensure we don't just pour back into the same tube
      if (src === dest) continue;

      const color = src.colors.pop()!;
      dest.colors.push(color);
      moves++;
    }

    return state.map(t => [...t.colors]);
  }
}
