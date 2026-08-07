import { LevelGenerator as CoreLevelGenerator } from '../core/LevelGenerator';
import { DifficultyEngine } from '../core/DifficultyEngine';

export class LevelGenerator {
  static generate(level: number): number[][] {
    // Determine dynamic difficulty parameters using new AI engine
    // We assume a base player rating of 1.0 for now until full integration
    const targetDifficulty = DifficultyEngine.getTargetDifficulty(level, 1.0);
    
    // Scale parameters
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const capacity = 4;
    const numTubes = numColors + 2; // Always 2 empty tubes
    
    // Use the new Lifetime Procedural Level Generator 2.0 to generate a puzzle DNA-verified layout
    const levelDef = CoreLevelGenerator.generate(targetDifficulty, numColors, numTubes, capacity);
    
    return levelDef.initialConfiguration;
  }
}
