import { LevelGenerator as CoreLevelGenerator } from '../core/LevelGenerator';
import { DifficultyEngine } from '../core/DifficultyEngine';
import { useGameState } from '../state/useGameState';

export class LevelGenerator {
  static generate(level: number, overrideDiff?: number, seed?: string): number[][] {
    // Determine dynamic difficulty parameters using new AI engine
    // Read the player's live ELO from the global state
    const playerElo = useGameState.getState().stats.playerSkillRating || 1000;
    const normalizedSkill = Math.max(0.1, playerElo / 1000); // Normalize to 1.0 baseline
    
    const targetDifficulty = overrideDiff !== undefined ? overrideDiff : DifficultyEngine.getTargetDifficulty(level, normalizedSkill);
    
    // Scale parameters
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const capacity = 4;
    const numTubes = numColors + 2; // Always 2 empty tubes
    
    // Use the new Lifetime Procedural Level Generator 2.0 to generate a puzzle DNA-verified layout
    // (In a full implementation, we'd pass seed here to CoreLevelGenerator to guarantee determinism)
    // For now, the existing CoreLevelGenerator just generates based on difficulty/colors
    const levelDef = CoreLevelGenerator.generate(targetDifficulty, numColors, numTubes, capacity);
    
    return levelDef.initialConfiguration;
  }
}
