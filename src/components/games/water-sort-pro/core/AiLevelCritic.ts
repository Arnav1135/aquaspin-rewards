import { GameState } from './PuzzleEngine';

export interface CritiqueReport {
  status: 'PASS' | 'WARNING' | 'FAIL';
  score: number; // 0.0 to 1.0 fairness/quality score
  feedback: string[];
}

export class AiLevelCritic {
  /**
   * Phase 51: Evaluates a procedurally generated level for logic and fairness.
   */
  static evaluateLevel(initialConfig: number[][], targetDifficulty: number): CritiqueReport {
    const feedback: string[] = [];
    let score = 1.0;
    
    // 1. Analyze Empty Tubes
    const emptyTubes = initialConfig.filter(t => t.length === 0).length;
    if (emptyTubes < 1) {
      feedback.push('CRITICAL: Level has no empty tubes, unsolvable.');
      return { status: 'FAIL', score: 0.0, feedback };
    }

    // 2. Analyze Color Complexity & Depth
    const colorMap = new Map<number, number>();
    initialConfig.forEach(tube => {
      tube.forEach(color => {
        colorMap.set(color, (colorMap.get(color) || 0) + 1);
      });
    });

    const uniqueColors = colorMap.size;
    let missingColors = false;
    colorMap.forEach((count, color) => {
      if (count !== 4) {
        feedback.push(`WARNING: Color ${color} has ${count} units instead of 4.`);
        missingColors = true;
        score -= 0.5;
      }
    });

    if (missingColors) {
      return { status: 'FAIL', score, feedback };
    }

    // 3. Analyze Initial Deadlock Pressure
    let initialMovableBlocks = 0;
    initialConfig.forEach(sourceTube => {
      if (sourceTube.length === 0) return;
      const topColor = sourceTube[sourceTube.length - 1];
      
      let canMove = false;
      initialConfig.forEach(targetTube => {
        if (sourceTube === targetTube) return;
        if (targetTube.length === 0) canMove = true;
        else if (targetTube.length < 4 && targetTube[targetTube.length - 1] === topColor) canMove = true;
      });
      if (canMove) initialMovableBlocks++;
    });

    if (initialMovableBlocks === 0) {
      feedback.push('CRITICAL: Level starts in an immediate deadlock.');
      return { status: 'FAIL', score: 0.0, feedback };
    }

    // 4. Compare Complexity against Target Difficulty
    // A highly fractured level (many alternating colors in tubes) is much harder.
    let fractureScore = 0;
    initialConfig.forEach(tube => {
      for (let i = 1; i < tube.length; i++) {
        if (tube[i] !== tube[i - 1]) fractureScore++;
      }
    });

    // Roughly normalize fracture score based on unique colors
    // High difficulty = more fractures. Low difficulty = fewer fractures (mostly pre-sorted).
    const expectedFractures = Math.min(uniqueColors * 2 * targetDifficulty, uniqueColors * 3);
    const fractureDelta = Math.abs(fractureScore - expectedFractures);

    if (fractureDelta > uniqueColors * 1.5) {
      feedback.push(`WARNING: Level fracture complexity (${fractureScore}) deviates too far from target difficulty (${targetDifficulty.toFixed(2)}).`);
      score -= 0.3;
    }

    if (score < 0.6) {
      return { status: 'WARNING', score, feedback };
    }

    feedback.push('Level successfully passed mathematical critique.');
    return { status: 'PASS', score, feedback };
  }
}
