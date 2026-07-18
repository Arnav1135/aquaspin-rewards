import { MatchDetector } from './MatchDetector.js';
import { GravityEngine } from './GravityEngine.js';
import { CELL_TYPES, CANDY_TYPES, LAYER_TYPES } from './Constants.js';

export class CascadePredictor {
  /**
   * Performs a simulation of a swap to predict the cascade depth and score.
   */
  static predict(board, fromIdx, toIdx, levelConfig, spawnerColorFn) {
    // Save state
    const originalState = board.serializeState();

    const fromCell = board.cells[fromIdx];
    const toCell = board.cells[toIdx];

    // Swap candy properties
    const tempColor = fromCell.candyColor;
    const tempType = fromCell.candyType;
    fromCell.candyColor = toCell.candyColor;
    fromCell.candyType = toCell.candyType;
    toCell.candyColor = tempColor;
    toCell.candyType = tempType;

    let totalMatchesCount = 0;
    let cascadeDepth = 0;
    let predictedScore = 0;
    let active = true;

    while (active) {
      const matches = MatchDetector.detect(board);
      if (matches.length > 0) {
        cascadeDepth++;
        totalMatchesCount += matches.length;
        
        // Calculate predicted score increment
        matches.forEach(m => {
          predictedScore += m.cells.length * 60 * cascadeDepth;
        });

        // Simulate clear (just clear the candies in model)
        matches.forEach(m => {
          m.cells.forEach(c => {
            c.candyColor = null;
            c.candyType = CANDY_TYPES.NORMAL;
          });
        });

        // Simulate gravity and spawner fill
        GravityEngine.resolve(board, levelConfig, (cell) => {
          cell.type = CELL_TYPES.NORMAL;
          cell.candyColor = spawnerColorFn();
          cell.candyType = CANDY_TYPES.NORMAL;
        });
      } else {
        active = false;
      }
    }

    // Restore state
    board.deserializeState(originalState);

    return {
      cascadeDepth,
      totalMatchesCount,
      predictedScore
    };
  }
}

export class EventQueue {
  constructor(controller) {
    this.controller = controller;
    this.queue = [];
    this.isRunning = false;
  }

  enqueue(actionFn) {
    this.queue.push(actionFn);
    this.runNext();
  }

  runNext() {
    if (this.isRunning || this.queue.length === 0) return;
    this.isRunning = true;
    const nextAction = this.queue.shift();
    
    // Execute action; we assume it returns a Promise or is synchronous
    Promise.resolve(nextAction())
      .then(() => {
        this.isRunning = false;
        this.runNext();
      })
      .catch((err) => {
        console.error('EventQueue action failed:', err);
        this.isRunning = false;
        this.runNext();
      });
  }

  clear() {
    this.queue = [];
    this.isRunning = false;
  }
}
