import { LevelConfig, CandyColor, BlockerType } from '../types';
import { LevelValidator } from './LevelValidator';

export class LevelGenerator {
  /**
   * Automated Difficulty Scaler
   * Programmatically adjusts board dimensions, move limits, blocker density, color complexity,
   * and target score based on level number (1 through 300+) to guarantee a smooth, fun,
   * error-free progression curve.
   */
  public static getScaledLevelConfig(levelNum: number, baseConfig?: LevelConfig): LevelConfig {
    const config = baseConfig ? { ...baseConfig } : {
      levelNumber: levelNum,
      title: `Level ${levelNum}`,
      description: `Complete level targets!`,
      rows: 8,
      cols: 8,
      moves: 25,
      targetScore: 10000,
      objectiveType: 'score' as const,
      colorsAvailable: ['red', 'orange', 'yellow', 'green', 'blue'] as CandyColor[],
    };

    const tier = Math.min(300, Math.max(1, levelNum));
    const progressFactor = (tier - 1) / 299; // Normalized 0.0 to 1.0

    // 1. Programmatically calculate Board Dimensions (rows & cols)
    let rows = config.rows || 8;
    let cols = config.cols || 8;

    if (!baseConfig) {
      if (tier <= 25) {
        rows = 8;
        cols = 8;
      } else if (tier <= 80) {
        rows = tier % 3 === 0 ? 9 : 8;
        cols = tier % 2 === 0 ? 9 : 8;
      } else if (tier <= 180) {
        rows = tier % 4 === 0 ? 10 : tier % 2 === 0 ? 9 : 8;
        cols = tier % 4 === 0 ? 10 : tier % 2 === 0 ? 9 : 8;
      } else {
        rows = tier % 5 === 0 ? 10 : tier % 2 === 0 ? 9 : 10;
        cols = tier % 5 === 0 ? 10 : tier % 2 === 0 ? 10 : 9;
      }
    }

    // 2. Programmatically calculate Available Colors
    const colorsAvailable: CandyColor[] = [...(config.colorsAvailable || ['red', 'orange', 'yellow', 'green', 'blue'])];
    if (tier > 40 && !colorsAvailable.includes('purple')) {
      colorsAvailable.push('purple');
    }

    // 3. Programmatically calculate Move Budget & Target Score
    const cellCount = rows * cols;
    const baseMoves = Math.max(18, Math.round(32 - progressFactor * 12 + (cellCount > 64 ? 3 : 0)));
    const objectiveBonus = config.objectiveType === 'jelly' ? 5 : config.objectiveType === 'ingredients' ? 4 : config.objectiveType === 'orders' ? 3 : 0;
    const moves = baseConfig?.moves ? Math.max(15, baseConfig.moves) : baseMoves + objectiveBonus;

    const targetScore = baseConfig?.targetScore || Math.round(5000 + tier * 2500 + Math.pow(tier, 1.3) * 60);

    // 4. Programmatically calculate Blocker Density & Maps
    let blockerMap = config.blockerMap;
    let jellyMap = config.jellyMap;

    if (!baseConfig) {
      const blockerDensity = Math.min(0.32, 0.05 + progressFactor * 0.27);
      const blockerTypesList: BlockerType[] = [
        'frosting-1',
        'frosting-2',
        'frosting-3',
        'marmalade',
        'licorice-lock',
        'licorice-swirl',
        'chocolate',
        'candy-cane-fence',
      ];

      const maxBlockerIdx = Math.min(blockerTypesList.length - 1, Math.floor(1 + progressFactor * 7));
      const activeBlockers = blockerTypesList.slice(0, maxBlockerIdx + 1);

      let validConfigFound = false;
      let seedOffset = 0;
      let generatedConfig: any;

      while (!validConfigFound && seedOffset < 20) {
        blockerMap = Array.from({ length: rows }, (_, r) =>
          Array.from({ length: cols }, (_, c) => {
            const midR = Math.floor(rows / 2);
            const midC = Math.floor(cols / 2);
            if (Math.abs(r - midR) <= 0 && Math.abs(c - midC) <= 0) {
              return 'none';
            }

            const rand = (Math.sin(r * 12.9898 + c * 78.233 + tier * 43.12 + seedOffset * 10) + 1) / 2;
            if (rand < blockerDensity) {
              const bIdx = Math.floor(rand * 100) % activeBlockers.length;
              return activeBlockers[bIdx];
            }
            return 'none';
          })
        );

        if (config.objectiveType === 'jelly') {
          jellyMap = Array.from({ length: rows }, (_, r) =>
            Array.from({ length: cols }, (_, c) => {
              const rand = (Math.cos(r * 31.11 + c * 17.89 + tier * 91.3 + seedOffset * 10) + 1) / 2;
              if (tier > 80 && rand > 0.65) return 2;
              if (rand > 0.3) return 1;
              return 0;
            })
          );
        }

        generatedConfig = {
          ...config,
          rows,
          cols,
          moves,
          targetScore,
          colorsAvailable,
          blockerMap,
          jellyMap,
        };

        if (LevelValidator.validate(generatedConfig)) {
          validConfigFound = true;
        } else {
          seedOffset++;
        }
      }
      return generatedConfig || { ...config, rows, cols, moves, targetScore, colorsAvailable, blockerMap, jellyMap };
    }
    return { ...config, rows, cols, moves, targetScore, colorsAvailable, blockerMap, jellyMap };
  }
}
