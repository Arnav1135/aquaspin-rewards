import { TileData, LevelConfig } from '../types';
import { Match3Engine } from './Match3Engine';

export interface QAReport {
  defectDetected: boolean;
  defectType?: 'DEADLOCK' | 'NO_MATCHES' | 'SHUFFLE_FAILED' | 'RENDERING_STALL';
  attemptCount: number;
  patchedBoard?: TileData[][];
  message: string;
}

export class AIQAEngine {
  private static MAX_AUTO_FIX_ATTEMPTS = 3;

  /**
   * Phase 28: AI QA & Self-Healing Engine
   * Detects deadlock/unplayable states and automatically applies self-healing board mutations
   */
  public static inspectAndHealBoard(
    board: TileData[][],
    config: LevelConfig,
    attempt: number = 1
  ): QAReport {
    if (attempt > this.MAX_AUTO_FIX_ATTEMPTS) {
      return {
        defectDetected: true,
        defectType: 'SHUFFLE_FAILED',
        attemptCount: attempt,
        message: 'Exceeded maximum auto-fix attempts (3). Escalate to manual reset.'
      };
    }

    const hasLegal = Match3Engine.hasLegalMoves(board);

    if (!hasLegal) {
      // Self-healing attempt: Shuffle board with color distribution check
      const healedBoard = Match3Engine.shuffleBoard(board, config.colorsAvailable);

      if (Match3Engine.hasLegalMoves(healedBoard)) {
        return {
          defectDetected: true,
          defectType: 'DEADLOCK',
          attemptCount: attempt,
          patchedBoard: healedBoard,
          message: `Defect auto-healed on attempt ${attempt}: Legal moves restored via AI QA pattern.`
        };
      } else {
        // Recursive attempt up to MAX_AUTO_FIX_ATTEMPTS
        return this.inspectAndHealBoard(healedBoard, config, attempt + 1);
      }
    }

    return {
      defectDetected: false,
      attemptCount: 0,
      patchedBoard: board,
      message: 'Board state clean. No defects detected.'
    };
  }
}
