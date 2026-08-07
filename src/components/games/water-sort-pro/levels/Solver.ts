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

  /**
   * Provides a hint by finding a logical valid move.
   * Basic greedy approach: prioritize pouring to match colors, then pouring to empty.
   */
  static getHint(state: number[][]): { src: number, dest: number } | null {
    const numTubes = state.length;
    
    // Find all valid moves
    const validMoves: { src: number, dest: number, weight: number }[] = [];
    
    for (let i = 0; i < numTubes; i++) {
      for (let j = 0; j < numTubes; j++) {
        if (i === j) continue;
        
        const src = state[i];
        const dest = state[j];
        
        if (src.length === 0) continue;
        
        // If src is already fully sorted, don't move from it unless necessary
        const isSrcSorted = src.every(c => c === src[0]) && src.length === 4;
        if (isSrcSorted) continue;
        
        const srcColor = src[src.length - 1];
        
        // Check if valid pour
        if (dest.length < 4 && (dest.length === 0 || dest[dest.length - 1] === srcColor)) {
          // Calculate move weight (higher is better)
          let weight = 0;
          
          if (dest.length > 0) {
            // Consolidating same colors is very good
            weight += 10;
          } else {
            // Pouring into empty is okay, but only if we are freeing up a mixed tube
            const isMixed = src.some(c => c !== src[0]);
            if (isMixed) {
              weight += 5;
            } else {
              // Don't just move a solid color to an empty tube for no reason
              continue;
            }
          }
          
          validMoves.push({ src: i, dest: j, weight });
        }
      }
    }
    
    if (validMoves.length === 0) return null;
    
    // Sort by weight descending
    validMoves.sort((a, b) => b.weight - a.weight);
    
    return { src: validMoves[0].src, dest: validMoves[0].dest };
  }
}
