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

  static async generateAsync(level: number, overrideDiff?: number, seed?: string): Promise<number[][]> {
    const playerElo = useGameState.getState().stats.playerSkillRating || 1000;
    const normalizedSkill = Math.max(0.1, playerElo / 1000);
    const targetDifficulty = overrideDiff !== undefined ? overrideDiff : DifficultyEngine.getTargetDifficulty(level, normalizedSkill);
    
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const capacity = 4;
    const numTubes = numColors + 2;

    return new Promise((resolve, reject) => {
      // Create worker instance
      const worker = new Worker(new URL('../workers/LevelGenerator.worker.ts', import.meta.url), { type: 'module' });
      const id = Date.now().toString();

      worker.onmessage = (e) => {
        const { id: responseId, type, payload, error } = e.data;
        if (responseId === id) {
          if (type === 'GENERATE_SUCCESS') {
            resolve(payload.initialConfiguration);
          } else {
            reject(new Error(error));
          }
          worker.terminate();
        }
      };

      worker.onerror = (err) => {
        reject(err);
        worker.terminate();
      };

      worker.postMessage({
        id,
        type: 'GENERATE',
        payload: { targetDifficulty, colorCount: numColors, tubeCount: numTubes, tubeCapacity: capacity }
      });
    });
  }
}
