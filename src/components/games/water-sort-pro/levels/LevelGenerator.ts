import { LevelGenerator as CoreLevelGenerator } from '../core/LevelGenerator';
import { DifficultyEngine } from '../core/DifficultyEngine';
import { useGameState } from '../state/useGameState';
import { AiLevelCritic } from '../core/AiLevelCritic';

export class LevelGenerator {
  static generate(level: number, overrideDiff?: number, seed?: string): number[][] {
    const playerElo = useGameState.getState().stats.playerSkillRating || 1000;
    const normalizedSkill = Math.max(0.1, playerElo / 1000);
    
    const targetDifficulty = overrideDiff !== undefined ? overrideDiff : DifficultyEngine.getTargetDifficulty(level, normalizedSkill);
    
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const capacity = 4;
    const numTubes = numColors + 2;
    
    let currentSeed = seed || `global_${level}_v2.0`;
    let attempts = 0;
    let bestConfig: number[][] | null = null;
    let bestScore = -1;

    // Phase 51: AI Level Critic Validation Loop
    // Generate up to 5 candidates, keeping the one that passes or has the highest score
    while (attempts < 5) {
      const levelDef = CoreLevelGenerator.generate(targetDifficulty, numColors, numTubes, capacity, currentSeed);
      const config = levelDef.initialConfiguration;
      
      const critique = AiLevelCritic.evaluateLevel(config, targetDifficulty);
      
      if (critique.status === 'PASS') {
        return config; // Perfect candidate found
      }
      
      if (critique.score > bestScore) {
        bestScore = critique.score;
        bestConfig = config;
      }
      
      attempts++;
      currentSeed = `${currentSeed}_retry_${attempts}`;
    }
    
    // Fallback to the best candidate we found
    return bestConfig || CoreLevelGenerator.generate(targetDifficulty, numColors, numTubes, capacity, seed || `global_${level}_v2.0`).initialConfiguration;
  }

  static async generateAsync(level: number, overrideDiff?: number, seed?: string): Promise<number[][]> {
    const playerElo = useGameState.getState().stats.playerSkillRating || 1000;
    const normalizedSkill = Math.max(0.1, playerElo / 1000);
    const targetDifficulty = overrideDiff !== undefined ? overrideDiff : DifficultyEngine.getTargetDifficulty(level, normalizedSkill);
    
    const numColors = Math.min(3 + Math.floor(level / 3), 10);
    const capacity = 4;
    const numTubes = numColors + 2;

    let currentSeed = seed || `global_${level}_v2.0`;

    // Wrapping the worker call to allow for AI Validation retries
    const attemptGeneration = async (attemptSeed: string): Promise<{config: number[][], score: number, status: string}> => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('../workers/LevelGenerator.worker.ts', import.meta.url), { type: 'module' });
        const id = Date.now().toString();

        worker.onmessage = (e) => {
          const { id: responseId, type, payload, error } = e.data;
          if (responseId === id) {
            if (type === 'GENERATE_SUCCESS') {
              const config = payload.initialConfiguration;
              const critique = AiLevelCritic.evaluateLevel(config, targetDifficulty);
              resolve({ config, score: critique.score, status: critique.status });
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
          payload: { targetDifficulty, colorCount: numColors, tubeCount: numTubes, tubeCapacity: capacity, seedString: attemptSeed }
        });
      });
    };

    let attempts = 0;
    let bestConfig: number[][] | null = null;
    let bestScore = -1;

    while (attempts < 5) {
      try {
        const result = await attemptGeneration(currentSeed);
        if (result.status === 'PASS') {
          return result.config;
        }
        if (result.score > bestScore) {
          bestScore = result.score;
          bestConfig = result.config;
        }
      } catch (err) {
        console.error("Worker generation failed:", err);
      }
      attempts++;
      currentSeed = `${currentSeed}_retry_${attempts}`;
    }

    if (!bestConfig) throw new Error("Failed to generate valid level after 5 attempts");
    return bestConfig;
  }
}
