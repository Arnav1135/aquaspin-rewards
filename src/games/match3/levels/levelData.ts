// 60 Realistic Level Configuration System - Candy Crush–style Match-3
import { LevelConfig, CandyType, ObstacleType } from '@/games/match3/types';

/**
 * Generate all 60 levels with realistic objectives and progressive difficulty
 * Each level has unique mechanics and challenges
 */
export function generateLevels(): LevelConfig[] {
  const levels: LevelConfig[] = [];

  // ===== WORLD 1: CANDY GARDEN (Levels 1-10) - Tutorial =====
  // Objective: Learn basic mechanics
  levels.push(
    // 1: Basic match-3
    {
      id: 1,
      name: 'Welcome to Candy Garden',
      width: 8,
      height: 8,
      moveLimit: 25,
      objectiveType: 'score',
      objectiveTarget: 4000,
      starThresholds: [4000, 6000, 8000],
      difficulty: 'easy',
      world: 1,
    },
    // 2: Slightly harder score
    {
      id: 2,
      name: 'Sweet Victory',
      width: 8,
      height: 8,
      moveLimit: 23,
      objectiveType: 'score',
      objectiveTarget: 5000,
      starThresholds: [5000, 7000, 10000],
      difficulty: 'easy',
      world: 1,
    },
    // 3: Introduce jelly
    {
      id: 3,
      name: 'Jelly Jungle',
      width: 8,
      height: 8,
      moveLimit: 22,
      objectiveType: 'jelly',
      objectiveTarget: 8, // Clear 8 jelly tiles
      starThresholds: [6000, 8000, 10000],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 2, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 6, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 3, type: ObstacleType.JELLY, health: 1 },
        { row: 5, col: 4, type: ObstacleType.JELLY, health: 1 },
      ],
    },
    // 4: Collect specific candy
    {
      id: 4,
      name: 'Red Rush',
      width: 8,
      height: 8,
      moveLimit: 20,
      objectiveType: 'collect',
      objectiveTarget: 10,
      collectTarget: CandyType.RED,
      starThresholds: [6000, 8000, 11000],
      difficulty: 'easy',
      world: 1,
    },
    // 5: More jelly + score
    {
      id: 5,
      name: 'Double Trouble',
      width: 8,
      height: 8,
      moveLimit: 21,
      objectiveType: 'jelly',
      objectiveTarget: 12,
      starThresholds: [7000, 9000, 12000],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 1, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 1, col: 6, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 5, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 5, col: 6, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 0, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 7, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 3, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 3, type: ObstacleType.JELLY, health: 1 },
      ],
    },
    // 6: Chocolate spreader intro
    {
      id: 6,
      name: 'Chocolate Chaos',
      width: 8,
      height: 8,
      moveLimit: 19,
      objectiveType: 'score',
      objectiveTarget: 8000,
      starThresholds: [8000, 10000, 13000],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 4, col: 3, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 4, col: 4, type: ObstacleType.CHOCOLATE, health: 2 },
      ],
    },
    // 7: Multiple objective types
    {
      id: 7,
      name: 'Fruity Mix',
      width: 8,
      height: 8,
      moveLimit: 20,
      objectiveType: 'collect',
      objectiveTarget: 15,
      collectTarget: CandyType.BLUE,
      starThresholds: [7000, 9000, 12000],
      difficulty: 'easy',
      world: 1,
    },
    // 8: Licorice lock intro
    {
      id: 8,
      name: 'Locked & Loaded',
      width: 8,
      height: 8,
      moveLimit: 18,
      objectiveType: 'score',
      objectiveTarget: 8500,
      starThresholds: [8500, 11000, 14000],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 3, col: 2, type: ObstacleType.LICORICE },
        { row: 3, col: 5, type: ObstacleType.LICORICE },
        { row: 5, col: 2, type: ObstacleType.LICORICE },
        { row: 5, col: 5, type: ObstacleType.LICORICE },
      ],
    },
    // 9: Mixed jellies
    {
      id: 9,
      name: 'Jelly Paradise',
      width: 8,
      height: 8,
      moveLimit: 22,
      objectiveType: 'jelly',
      objectiveTarget: 16,
      starThresholds: [8000, 10500, 13500],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 1, col: 3, type: ObstacleType.JELLY, health: 1 },
        { row: 1, col: 4, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 6, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 3, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 4, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 0, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 7, type: ObstacleType.JELLY, health: 1 },
        { row: 5, col: 0, type: ObstacleType.JELLY, health: 1 },
        { row: 5, col: 7, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 7, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 0, type: ObstacleType.JELLY, health: 1 },
      ],
    },
    // 10: World 1 boss - multiple objectives
    {
      id: 10,
      name: 'Candy King Boss',
      width: 8,
      height: 8,
      moveLimit: 20,
      objectiveType: 'score',
      objectiveTarget: 12000,
      starThresholds: [12000, 15000, 18000],
      difficulty: 'easy',
      world: 1,
      obstacles: [
        { row: 2, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 6, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 3, type: ObstacleType.CHOCOLATE, health: 1 },
        { row: 4, col: 4, type: ObstacleType.CHOCOLATE, health: 1 },
        { row: 6, col: 1, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 6, type: ObstacleType.JELLY, health: 1 },
      ],
    }
  );

  // ===== WORLD 2: CHOCOLATE CANYON (Levels 11-20) =====
  for (let i = 11; i <= 20; i++) {
    const offset = i - 10;
    const isCollect = i % 3 === 0;
    const isJelly = i % 3 === 1;

    levels.push({
      id: i,
      name: `Chocolate Canyon ${offset}`,
      width: 8,
      height: 8,
      moveLimit: 20 - offset,
      objectiveType: isJelly ? 'jelly' : isCollect ? 'collect' : 'score',
      objectiveTarget: isJelly ? 10 + offset * 2 : isCollect ? 12 + offset : 12000 + offset * 1000,
      collectTarget: isCollect ? ([CandyType.RED, CandyType.BLUE, CandyType.GREEN][offset % 3] as CandyType) : undefined,
      starThresholds: [
        10000 + offset * 800,
        13000 + offset * 800,
        16000 + offset * 800,
      ],
      difficulty: 'medium',
      world: 2,
      obstacles: offset > 3 ? [
        { row: 2, col: 2, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 2, col: 5, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 5, col: 2, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 5, col: 5, type: ObstacleType.CHOCOLATE, health: 2 },
      ] : undefined,
    });
  }

  // ===== WORLD 3: GUMMY OCEAN (Levels 21-30) =====
  for (let i = 21; i <= 30; i++) {
    const offset = i - 20;
    const objective = ['jelly', 'collect', 'score'][offset % 3];

    levels.push({
      id: i,
      name: `Gummy Ocean ${offset}`,
      width: 8,
      height: 9,
      moveLimit: 18 - Math.floor(offset / 2),
      objectiveType: objective as any,
      objectiveTarget: objective === 'jelly' ? 12 + offset * 2 : objective === 'collect' ? 14 + offset : 15000 + offset * 1000,
      collectTarget: objective === 'collect' ? ([CandyType.PURPLE, CandyType.YELLOW, CandyType.ORANGE][offset % 3] as CandyType) : undefined,
      starThresholds: [
        14000 + offset * 1000,
        18000 + offset * 1000,
        23000 + offset * 1000,
      ],
      difficulty: 'medium',
      world: 3,
      obstacles: offset > 2 ? [
        { row: 1, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 1, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 3, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 3, col: 4, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 5, col: 2, type: ObstacleType.LICORICE },
        { row: 5, col: 5, type: ObstacleType.LICORICE },
        { row: 7, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 5, type: ObstacleType.JELLY, health: 1 },
      ] : [],
    });
  }

  // ===== WORLD 4: LICORICE MOUNTAIN (Levels 31-40) =====
  for (let i = 31; i <= 40; i++) {
    const offset = i - 30;

    levels.push({
      id: i,
      name: `Licorice Mountain ${offset}`,
      width: 8,
      height: 8,
      moveLimit: 16 - Math.floor(offset / 2),
      objectiveType: offset % 2 === 0 ? 'jelly' : 'score',
      objectiveTarget: offset % 2 === 0 ? 16 + offset * 2 : 20000 + offset * 1500,
      starThresholds: [
        18000 + offset * 1500,
        23000 + offset * 1500,
        30000 + offset * 1500,
      ],
      difficulty: 'hard',
      world: 4,
      obstacles: [
        { row: 0, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 0, col: 5, type: ObstacleType.JELLY, health: 1 },
        { row: 2, col: 1, type: ObstacleType.LICORICE },
        { row: 2, col: 3, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 2, col: 4, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 2, col: 6, type: ObstacleType.LICORICE },
        { row: 4, col: 0, type: ObstacleType.JELLY, health: 1 },
        { row: 4, col: 7, type: ObstacleType.JELLY, health: 1 },
        { row: 6, col: 2, type: ObstacleType.LICORICE },
        { row: 6, col: 5, type: ObstacleType.LICORICE },
        { row: 7, col: 3, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 4, type: ObstacleType.JELLY, health: 1 },
      ],
    });
  }

  // ===== WORLD 5: FROSTING FOREST (Levels 41-50) =====
  for (let i = 41; i <= 50; i++) {
    const offset = i - 40;

    levels.push({
      id: i,
      name: `Frosting Forest ${offset}`,
      width: 9,
      height: 9,
      moveLimit: 14 - Math.floor(offset / 3),
      objectiveType: offset % 3 === 0 ? 'collect' : offset % 3 === 1 ? 'jelly' : 'score',
      objectiveTarget: offset % 3 === 0 ? 16 + offset : offset % 3 === 1 ? 18 + offset * 2 : 28000 + offset * 1500,
      collectTarget: offset % 3 === 0 ? ([CandyType.RED, CandyType.GREEN, CandyType.BLUE][offset % 3] as CandyType) : undefined,
      starThresholds: [
        25000 + offset * 2000,
        32000 + offset * 2000,
        42000 + offset * 2000,
      ],
      difficulty: 'hard',
      world: 5,
      obstacles: [
        { row: 1, col: 1, type: ObstacleType.FROSTING, health: 2 },
        { row: 1, col: 7, type: ObstacleType.FROSTING, health: 2 },
        { row: 3, col: 2, type: ObstacleType.JELLY, health: 1 },
        { row: 3, col: 4, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 3, col: 6, type: ObstacleType.LICORICE },
        { row: 5, col: 0, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 5, col: 8, type: ObstacleType.CHOCOLATE, health: 2 },
        { row: 7, col: 2, type: ObstacleType.FROSTING, health: 2 },
        { row: 7, col: 4, type: ObstacleType.JELLY, health: 1 },
        { row: 7, col: 6, type: ObstacleType.FROSTING, health: 2 },
      ],
    });
  }

  // ===== WORLD 6: SUGAR VOLCANO (Levels 51-60) - Expert =====
  for (let i = 51; i <= 60; i++) {
    const offset = i - 50;
    const isBoss = i === 60;

    levels.push({
      id: i,
      name: isBoss ? 'Sugar Volcano - FINAL BOSS' : `Sugar Volcano ${offset}`,
      width: 9,
      height: 9,
      moveLimit: isBoss ? 12 : 12 - Math.floor(offset / 4),
      objectiveType: isBoss ? 'score' : offset % 2 === 0 ? 'collect' : 'jelly',
      objectiveTarget: isBoss ? 50000 : offset % 2 === 0 ? 18 + offset : 20 + offset * 2,
      collectTarget: offset % 2 === 0 && !isBoss ? ([CandyType.RED, CandyType.PURPLE, CandyType.YELLOW][offset % 3] as CandyType) : undefined,
      starThresholds: [
        isBoss ? 50000 : 35000 + offset * 2000,
        isBoss ? 65000 : 45000 + offset * 2000,
        isBoss ? 80000 : 60000 + offset * 2000,
      ],
      difficulty: 'expert',
      world: 6,
      obstacles: [
        { row: 0, col: 1, type: ObstacleType.FROSTING, health: 3 },
        { row: 0, col: 7, type: ObstacleType.FROSTING, health: 3 },
        { row: 2, col: 0, type: ObstacleType.CHOCOLATE, health: 3 },
        { row: 2, col: 4, type: ObstacleType.JELLY, health: 2 },
        { row: 2, col: 8, type: ObstacleType.CHOCOLATE, health: 3 },
        { row: 4, col: 2, type: ObstacleType.LICORICE },
        { row: 4, col: 4, type: ObstacleType.FROSTING, health: 3 },
        { row: 4, col: 6, type: ObstacleType.LICORICE },
        { row: 6, col: 0, type: ObstacleType.CHOCOLATE, health: 3 },
        { row: 6, col: 4, type: ObstacleType.JELLY, health: 2 },
        { row: 6, col: 8, type: ObstacleType.CHOCOLATE, health: 3 },
        { row: 8, col: 1, type: ObstacleType.FROSTING, health: 3 },
        { row: 8, col: 7, type: ObstacleType.FROSTING, health: 3 },
      ],
    });
  }

  return levels;
}

export const LEVELS = generateLevels();

export function getLevelById(id: number): LevelConfig | undefined {
  return LEVELS.find(level => level.id === id);
}

export function getLevelsByWorld(world: number): LevelConfig[] {
  return LEVELS.filter(level => level.world === world);
}

export function getNextLevel(levelId: number): LevelConfig | undefined {
  return LEVELS.find(level => level.id === levelId + 1);
}
