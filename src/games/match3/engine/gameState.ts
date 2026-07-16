// Game State Management with Zustand - Enhanced with Animation Support
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { GameState, Position, LevelConfig, CandyType } from '@/games/match3/types';
import { Match3Engine } from '@/games/match3/engine/Match3Engine';
import { LEVELS } from '@/games/match3/levels/levelData';

interface Match3Store extends GameState {
  // Level management
  currentLevel: LevelConfig | null;
  loadLevel: (levelId: number) => void;
  
  // Game actions
  swapCandies: (pos1: Position, pos2: Position) => void;
  processMatches: () => void;
  resetLevel: () => void;
  levelComplete: () => void;
  levelFailed: () => void;
  
  // State queries
  canSwap: (pos1: Position, pos2: Position) => boolean;
  hasValidMoves: () => boolean;
  
  // Animation states
  animatingPositions: Set<string>;
  setAnimatingPositions: (positions: Set<string>) => void;
}

export const useMatch3Store = create<Match3Store>()(
  immer((set, get) => ({
    // Initial state
    levelId: 1,
    board: [],
    score: 0,
    movesRemaining: 20,
    matches: [],
    isAnimating: false,
    gameStatus: 'playing',
    starCount: 0,
    cascadeCount: 0,
    currentLevel: null,
    animatingPositions: new Set(),

    // Load a level
    loadLevel: (levelId: number) => {
      const level = LEVELS.find(l => l.id === levelId);
      if (!level) return;

      const board = Match3Engine.initializeBoard(level);
      
      set((state) => {
        state.levelId = levelId;
        state.currentLevel = level;
        state.board = board;
        state.score = 0;
        state.movesRemaining = level.moveLimit;
        state.matches = [];
        state.isAnimating = false;
        state.gameStatus = 'playing';
        state.starCount = 0;
        state.cascadeCount = 0;
        state.animatingPositions = new Set();
      });
    },

    // Check if a swap is valid
    canSwap: (pos1: Position, pos2: Position) => {
      const state = get();
      if (state.isAnimating || state.gameStatus !== 'playing') return false;
      
      return Match3Engine.isValidSwap(state.board, pos1, pos2);
    },

    // Perform a swap
    swapCandies: (pos1: Position, pos2: Position) => {
      const state = get();
      
      if (!state.canSwap(pos1, pos2)) {
        // Invalid swap - snap back with shake
        return;
      }

      set((draft) => {
        draft.isAnimating = true;
        draft.movesRemaining--;

        // Perform swap
        const temp = draft.board[pos1.row][pos1.col];
        draft.board[pos1.row][pos1.col] = draft.board[pos2.row][pos2.col];
        draft.board[pos2.row][pos2.col] = temp;

        // Mark positions as animating
        const animating = new Set<string>();
        animating.add(`${pos1.row}-${pos1.col}`);
        animating.add(`${pos2.row}-${pos2.col}`);
        draft.animatingPositions = animating;

        // Find and process matches after a delay (for animation)
        setTimeout(() => {
          get().processMatches();
        }, 300);
      });
    },

    // Process cascade until no more matches
    processMatches: () => {
      let board = get().board;
      let totalScore = 0;
      let cascadeCount = 0;

      set((draft) => {
        draft.cascadeCount = 0;
        draft.animatingPositions = new Set();
      });

      while (true) {
        const matches = Match3Engine.findMatches(board);
        if (matches.length === 0) break;

        cascadeCount++;

        // Mark matched positions as animating
        const animatingSet = new Set<string>();
        matches.forEach(match => {
          match.positions.forEach(pos => {
            animatingSet.add(`${pos.row}-${pos.col}`);
          });
        });

        set((draft) => {
          draft.animatingPositions = animatingSet;
        });

        // Clear matches
        const { board: clearedBoard, scorePoints: clearScore } =
          Match3Engine.clearMatches(board, matches);
        totalScore += clearScore;

        // Apply special candy effects
        const { board: specialBoard, scorePoints: specialScore } =
          Match3Engine.applySpecialCandies(clearedBoard, matches);
        totalScore += specialScore;

        // Apply gravity and refill
        const gravityBoard = Match3Engine.applyGravity(specialBoard);
        board = Match3Engine.refillBoard(gravityBoard);
      }

      set((draft) => {
        draft.board = board;
        draft.score += totalScore;
        draft.cascadeCount = cascadeCount;
        draft.isAnimating = false;
        draft.animatingPositions = new Set();

        // Check level completion
        if (draft.movesRemaining <= 0) {
          if (draft.score >= draft.currentLevel!.starThresholds[0]) {
            draft.gameStatus = 'levelComplete';
            draft.starCount = draft.score >= draft.currentLevel!.starThresholds[2]
              ? 3
              : draft.score >= draft.currentLevel!.starThresholds[1]
              ? 2
              : 1;
          } else {
            draft.gameStatus = 'levelFailed';
          }
        } else if (!Match3Engine.hasValidMoves(board)) {
          // Auto-shuffle if no valid moves
          draft.board = Match3Engine.shuffleBoard(board);
        }
      });
    },

    // Reset current level
    resetLevel: () => {
      const state = get();
      if (state.currentLevel) {
        get().loadLevel(state.levelId);
      }
    },

    // Mark level as complete
    levelComplete: () => {
      set((draft) => {
        draft.gameStatus = 'levelComplete';
      });
    },

    // Mark level as failed
    levelFailed: () => {
      set((draft) => {
        draft.gameStatus = 'levelFailed';
      });
    },

    // Check for valid moves
    hasValidMoves: () => {
      return Match3Engine.hasValidMoves(get().board);
    },

    // Set animating positions
    setAnimatingPositions: (positions: Set<string>) => {
      set((draft) => {
        draft.animatingPositions = positions;
      });
    },
  }))
);
