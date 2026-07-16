// 60 Level Configuration System for Candy Crush–style Match-3 Game
import { LevelConfig } from '@/games/match3/types';

/**
 * Generate all 60 levels with progressive difficulty
 * Levels 1-10: Tutorial (Easy)
 * Levels 11-30: Intermediate
 * Levels 31-50: Hard
 * Levels 51-60: Expert
 */
export function generateLevels(): LevelConfig[] {
  const levels: LevelConfig[] = [];

  // Levels 1-10: Tutorial World - "Candy Garden"
  for (let i = 1; i <= 10; i++) {
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 8,
      height: 8,
      moveLimit: 20 + (i * 2),
      objectiveType: 'score',
      objectiveTarget: 5000 + (i * 500),
      starThresholds: [
        5000 + (i * 500),
        7000 + (i * 500),
        10000 + (i * 500),
      ],
      difficulty: 'easy',
      world: 1,
    });
  }

  // Levels 11-20: Intermediate World - "Chocolate Canyon"
  for (let i = 11; i <= 20; i++) {
    const offset = i - 10;
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 8,
      height: 8,
      moveLimit: 18 + (offset * 1),
      objectiveType: 'score',
      objectiveTarget: 12000 + (offset * 1000),
      starThresholds: [
        12000 + (offset * 1000),
        16000 + (offset * 1000),
        20000 + (offset * 1000),
      ],
      difficulty: 'medium',
      world: 2,
    });
  }

  // Levels 21-30: Intermediate World - "Gummy Ocean"
  for (let i = 21; i <= 30; i++) {
    const offset = i - 20;
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 8,
      height: 9,
      moveLimit: 16 + (offset * 1),
      objectiveType: 'score',
      objectiveTarget: 22000 + (offset * 1000),
      starThresholds: [
        22000 + (offset * 1000),
        28000 + (offset * 1000),
        35000 + (offset * 1000),
      ],
      difficulty: 'medium',
      world: 3,
    });
  }

  // Levels 31-40: Hard World - "Licorice Mountain"
  for (let i = 31; i <= 40; i++) {
    const offset = i - 30;
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 8,
      height: 8,
      moveLimit: 14 + (offset * 0.5),
      objectiveType: 'score',
      objectiveTarget: 32000 + (offset * 1500),
      starThresholds: [
        32000 + (offset * 1500),
        40000 + (offset * 1500),
        50000 + (offset * 1500),
      ],
      difficulty: 'hard',
      world: 4,
    });
  }

  // Levels 41-50: Hard World - "Frosting Forest"
  for (let i = 41; i <= 50; i++) {
    const offset = i - 40;
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 9,
      height: 9,
      moveLimit: 12 + (offset * 0.5),
      objectiveType: 'score',
      objectiveTarget: 45000 + (offset * 2000),
      starThresholds: [
        45000 + (offset * 2000),
        55000 + (offset * 2000),
        70000 + (offset * 2000),
      ],
      difficulty: 'hard',
      world: 5,
    });
  }

  // Levels 51-60: Expert World - "Sugar Volcano"
  for (let i = 51; i <= 60; i++) {
    const offset = i - 50;
    levels.push({
      id: i,
      name: `Level ${i}`,
      width: 9,
      height: 9,
      moveLimit: 10 + (offset * 0.25),
      objectiveType: 'score',
      objectiveTarget: 60000 + (offset * 3000),
      starThresholds: [
        60000 + (offset * 3000),
        75000 + (offset * 3000),
        95000 + (offset * 3000),
      ],
      difficulty: 'expert',
      world: 6,
    });
  }

  return levels;
}

export const LEVELS = generateLevels();

/**
 * Get level by ID
 */
export function getLevelById(id: number): LevelConfig | undefined {
  return LEVELS.find(level => level.id === id);
}

/**
 * Get levels by world
 */
export function getLevelsByWorld(world: number): LevelConfig[] {
  return LEVELS.filter(level => level.world === world);
}

/**
 * Get next level
 */
export function getNextLevel(levelId: number): LevelConfig | undefined {
  return LEVELS.find(level => level.id === levelId + 1);
}
