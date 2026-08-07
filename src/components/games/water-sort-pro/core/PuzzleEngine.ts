export type TubeId = number;
export type ColorId = number;

export interface Move {
  source: TubeId;
  destination: TubeId;
  amount: number;
}

export interface GameState {
  levelId: string;
  generatorVersion: string;
  seed: string;
  tubes: ColorId[][]; // Array of tubes, where each tube is an array of colors from bottom to top
  tubeCapacity: number;
  selectedTube: TubeId | null;
  moveHistory: Move[];
  undoStack: GameState[];
  redoStack: GameState[];
  moveCount: number;
  elapsedTime: number;
  hintsUsed: number;
  undosUsed: number;
  status: 'IDLE' | 'TUBE_SELECTED' | 'POURING' | 'MOVE_COMPLETED' | 'LEVEL_COMPLETED' | 'PAUSED' | 'RESTARTING';
}

export class PuzzleEngine {
  /**
   * Validate if a pour is legal.
   */
  public static canPour(state: GameState, sourceId: TubeId, destId: TubeId): boolean {
    if (sourceId === destId) return false;
    
    const sourceTube = state.tubes[sourceId];
    const destTube = state.tubes[destId];
    
    if (!sourceTube || !destTube) return false;
    if (sourceTube.length === 0) return false;
    if (destTube.length >= state.tubeCapacity) return false;
    
    if (destTube.length > 0) {
      const sourceTop = sourceTube[sourceTube.length - 1];
      const destTop = destTube[destTube.length - 1];
      if (sourceTop !== destTop) return false;
    }
    
    return true;
  }

  /**
   * Calculate exact number of layers that will transfer.
   */
  public static getPourAmount(state: GameState, sourceId: TubeId, destId: TubeId): number {
    if (!this.canPour(state, sourceId, destId)) return 0;

    const sourceTube = state.tubes[sourceId];
    const destTube = state.tubes[destId];
    
    const topColor = sourceTube[sourceTube.length - 1];
    let matchingLayers = 0;
    
    // Count contiguous matching layers at top of source
    for (let i = sourceTube.length - 1; i >= 0; i--) {
      if (sourceTube[i] === topColor) matchingLayers++;
      else break;
    }

    const spaceInDest = state.tubeCapacity - destTube.length;
    return Math.min(matchingLayers, spaceInDest);
  }

  /**
   * Apply move deterministically
   */
  public static applyMove(state: GameState, sourceId: TubeId, destId: TubeId): GameState {
    const amount = this.getPourAmount(state, sourceId, destId);
    if (amount === 0) return state;

    // Clone state immutably (shallow clone arrays for performance)
    const newState = { 
      ...state, 
      tubes: state.tubes.map(t => [...t]),
      moveHistory: [...state.moveHistory],
      undoStack: [...state.undoStack, state],
      redoStack: []
    };

    const sourceTube = newState.tubes[sourceId];
    const destTube = newState.tubes[destId];

    // Transfer
    const transferred = sourceTube.splice(sourceTube.length - amount, amount);
    destTube.push(...transferred);

    newState.moveHistory.push({ source: sourceId, destination: destId, amount });
    newState.moveCount++;
    newState.selectedTube = null;

    if (this.isSolved(newState)) {
      newState.status = 'LEVEL_COMPLETED';
    } else {
      newState.status = 'MOVE_COMPLETED';
    }

    return newState;
  }

  /**
   * Check if level is solved
   */
  public static isSolved(state: GameState): boolean {
    return state.tubes.every(tube => 
      tube.length === 0 || (tube.length === state.tubeCapacity && tube.every(c => c === tube[0]))
    );
  }
}
