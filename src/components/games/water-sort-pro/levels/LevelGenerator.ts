import { Solver } from './Solver';

export class LevelGenerator {
  static generate(level: number): number[][] {
    // Difficulty scaling logic based on level
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const numEmpty = 2; // Always 2 empty tubes
    const capacity = 4;
    // Higher levels get more intense shuffling
    const shuffleDepth = numColors * capacity * (2 + Math.floor(level / 5));
    
    return Solver.generateReversedState(numColors, numEmpty, capacity, shuffleDepth);
  }
}
