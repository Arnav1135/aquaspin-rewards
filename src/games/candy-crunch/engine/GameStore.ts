import { create } from 'zustand';
import { TileData, LevelConfig, BoosterType } from '../types';
import { Match3Engine } from './Match3Engine';
import { soundEngine } from '../audio/soundEngine';
import { getLevelConfig } from '../data/levels';

interface ExplosionData {
  id: string;
  row: number;
  col: number;
  colorHex: number;
}

interface GameState {
  // Config
  levelNumber: number;
  levelConfig: LevelConfig;
  
  // Game State
  board: TileData[][];
  explosions: ExplosionData[];
  score: number;
  movesLeft: number;
  stars: number;
  jellyCount: number;
  ingredientCount: number;
  
  // Interactions
  selectedCell: { row: number; col: number } | null;
  activeBooster: BoosterType | null;
  boosterCounts: Record<BoosterType, number>;
  aiSuggestedSwap: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null;
  
  // UI & Flow
  isProcessing: boolean;
  announcerText: string | null;
  showWorldMap: boolean;
  showAIAdvisor: boolean;
  showSettings: boolean;
  showVictory: boolean;
  showDefeat: boolean;
  levelStarsMap: Record<number, number>;
  isMuted: boolean;

  // Actions
  loadLevel: (lvlNum: number, customConfig?: LevelConfig) => void;
  handleTileClick: (row: number, col: number) => void;
  handleTileDragSwap: (fromRow: number, fromCol: number, toRow: number, toCol: number) => void;
  applyBooster: (type: BoosterType, row: number, col: number) => void;
  setMuted: (muted: boolean) => void;
  triggerAnnouncer: (text: string) => void;
  
  // Modals
  setShowWorldMap: (show: boolean) => void;
  setShowAIAdvisor: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
  setShowVictory: (show: boolean) => void;
  setShowDefeat: (show: boolean) => void;
  setAiSuggestedSwap: (swap: { fromRow: number; fromCol: number; toRow: number; toCol: number } | null) => void;
  setActiveBooster: (booster: BoosterType | null) => void;
  setMovesLeft: (moves: number) => void;
  addExplosion: (row: number, col: number, colorHex: number) => void;
  removeExplosion: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  levelNumber: 1,
  levelConfig: getLevelConfig(1),
  board: [],
  explosions: [],
  score: 0,
  movesLeft: 20,
  stars: 0,
  jellyCount: 0,
  ingredientCount: 0,
  selectedCell: null,
  activeBooster: null,
  boosterCounts: {
    'lollipop-hammer': 3,
    'hand-switch': 2,
    'extra-moves': 2,
    'ufo': 1,
    'party-booster': 1,
  },
  aiSuggestedSwap: null,
  isProcessing: false,
  announcerText: null,
  showWorldMap: false,
  showAIAdvisor: false,
  showSettings: false,
  showVictory: false,
  showDefeat: false,
  levelStarsMap: {},
  isMuted: false,

  setMuted: (muted) => set({ isMuted: muted }),
  setShowWorldMap: (show) => set({ showWorldMap: show }),
  setShowAIAdvisor: (show) => set({ showAIAdvisor: show }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowVictory: (show) => set({ showVictory: show }),
  setShowDefeat: (show) => set({ showDefeat: show }),
  setAiSuggestedSwap: (swap) => set({ aiSuggestedSwap: swap }),
  setActiveBooster: (booster) => set({ activeBooster: booster }),
  setMovesLeft: (moves) => set({ movesLeft: moves }),

  addExplosion: (row: number, col: number, colorHex: number) => {
    const id = `exp-${Date.now()}-${Math.random()}`;
    set((state) => ({ explosions: [...state.explosions, { id, row, col, colorHex }] }));
  },
  
  removeExplosion: (id: string) => {
    set((state) => ({ explosions: state.explosions.filter(e => e.id !== id) }));
  },

  triggerAnnouncer: (text: string) => {
    set({ announcerText: text });
    setTimeout(() => {
      set((state) => (state.announcerText === text ? { announcerText: null } : state));
    }, 1800);
  },

  loadLevel: (lvlNum: number, customConfig?: LevelConfig) => {
    const config = customConfig || getLevelConfig(lvlNum);
    const initialBoard = Match3Engine.createInitialBoard(config);
    
    let initialJellies = 0;
    initialBoard.forEach((row) =>
      row.forEach((t) => {
        initialJellies += t.jellyLayers;
      })
    );

    set({
      levelNumber: lvlNum,
      levelConfig: config,
      board: initialBoard,
      score: 0,
      movesLeft: config.moves,
      stars: 0,
      jellyCount: initialJellies,
      selectedCell: null,
      aiSuggestedSwap: null,
      showVictory: false,
      showDefeat: false,
      isProcessing: false,
    });
    soundEngine.playSelect();
  },

  handleTileClick: (row: number, col: number) => {
    const state = get();
    if (state.isProcessing) return;

    if (state.activeBooster) {
      state.applyBooster(state.activeBooster, row, col);
      set({ activeBooster: null });
      return;
    }

    if (!state.selectedCell) {
      set({ selectedCell: { row, col } });
      soundEngine.playSelect();
      return;
    }

    if (state.selectedCell.row === row && state.selectedCell.col === col) {
      set({ selectedCell: null });
      return;
    }

    if (Match3Engine.isAdjacent(state.selectedCell.row, state.selectedCell.col, row, col)) {
      handleSwap(state.selectedCell.row, state.selectedCell.col, row, col, set, get);
      set({ selectedCell: null });
    } else {
      set({ selectedCell: { row, col } });
      soundEngine.playSelect();
    }
  },

  handleTileDragSwap: (fromRow: number, fromCol: number, toRow: number, toCol: number) => {
    const state = get();
    if (state.isProcessing) return;
    if (Match3Engine.isAdjacent(fromRow, fromCol, toRow, toCol)) {
      handleSwap(fromRow, fromCol, toRow, toCol, set, get);
      set({ selectedCell: null });
    }
  },

  applyBooster: (type: BoosterType, r: number, c: number) => {
    const state = get();
    if (state.boosterCounts[type] <= 0) return;

    set((s) => ({ boosterCounts: { ...s.boosterCounts, [type]: s.boosterCounts[type] - 1 } }));
    
    let newBoard = Match3Engine.cloneBoard(state.board);
    
    if (type === 'lollipop-hammer') {
      soundEngine.playExplosion();
      newBoard[r][c].isMatched = true;
      set({ board: newBoard });
      processBoardCascade(newBoard, 1, set, get);
    } else if (type === 'extra-moves') {
      soundEngine.playFanfare();
      set((s) => ({ movesLeft: s.movesLeft + 5 }));
    } else if (type === 'ufo') {
      soundEngine.playColorBomb();
      const bRows = newBoard.length;
      const bCols = newBoard[0]?.length || 8;
      for (let i = 0; i < 3; i++) {
        const randR = Math.floor(Math.random() * bRows);
        const randC = Math.floor(Math.random() * bCols);
        newBoard[randR][randC].special = 'wrapped';
      }
      set({ board: newBoard });
      processBoardCascade(newBoard, 1, set, get);
    } else if (type === 'party-booster') {
      soundEngine.playExplosion();
      const bRows = newBoard.length;
      const bCols = newBoard[0]?.length || 8;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < bRows && nc >= 0 && nc < bCols) {
            newBoard[nr][nc].isMatched = true;
          }
        }
      }
      set({ board: newBoard });
      processBoardCascade(newBoard, 1, set, get);
    }
  }
}));

const handleSwap = async (
  r1: number, c1: number, r2: number, c2: number,
  set: any, get: any
) => {
  set({ isProcessing: true, aiSuggestedSwap: null });
  soundEngine.playSwap();

  const state = get();
  let newBoard = Match3Engine.cloneBoard(state.board);
  const tile1 = newBoard[r1][c1];
  const tile2 = newBoard[r2][c2];

  newBoard[r1][c1] = { ...tile2, row: r1, col: c1 };
  newBoard[r2][c2] = { ...tile1, row: r2, col: c2 };

  const isSpecialCombo = Match3Engine.handleSpecialSwapCombo(newBoard, r1, c1, r2, c2);
  const matchesResult = Match3Engine.findMatches(newBoard);

  if (matchesResult.matchedTiles.length === 0 && !isSpecialCombo) {
    soundEngine.playInvalid();
    // revert
    set({ isProcessing: false });
    return;
  }

  if (isSpecialCombo) {
    soundEngine.playExplosion();
    get().triggerAnnouncer('SUPER COMBO!');
  }

  set({ movesLeft: state.movesLeft - 1, board: newBoard });
  await processBoardCascade(newBoard, 1, set, get);
  set({ isProcessing: false });
};

const processBoardCascade = async (currentBoard: TileData[][], cascadeLevel: number, set: any, get: any) => {
  let boardState = Match3Engine.cloneBoard(currentBoard);
  const matchData = Match3Engine.findMatches(boardState);

  matchData.matchedTiles.forEach((mTile) => {
    const bTile = boardState[mTile.row][mTile.col];
    
    // Spawn 3D particle explosion
    const colorHexMap: Record<string, number> = {
      red: 0xef4444, orange: 0xf97316, yellow: 0xeab308,
      green: 0x22c55e, blue: 0x3b82f6, purple: 0xa855f7,
    };
    const cHex = colorHexMap[bTile.color] || 0xef4444;
    get().addExplosion(mTile.row, mTile.col, cHex);

    if (bTile.special !== 'none') {
      Match3Engine.activateSpecialCandy(boardState, mTile.row, mTile.col, bTile.special, bTile.color);
      soundEngine.playExplosion();
    }
  });

  Match3Engine.damageAdjacentBlockers(boardState);

  if (matchData.matchedTiles.length === 0) {
    boardState = Match3Engine.processChocolateSpread(boardState);
    set({ board: boardState });

    if (!Match3Engine.hasLegalMoves(boardState)) {
      get().triggerAnnouncer('SHUFFLING BOARD!');
      boardState = Match3Engine.shuffleBoard(boardState, get().levelConfig.colorsAvailable);
      set({ board: boardState });
    }

    checkGameEndConditions(boardState, get().movesLeft, set, get);
    return;
  }

  soundEngine.playPop(cascadeLevel);

  const ptsGained = matchData.matchedTiles.length * 100 * cascadeLevel;
  const state = get();
  const newScore = state.score + ptsGained;
  let newStars = state.stars;
  
  if (newScore >= state.levelConfig.targetScore * 1.5) newStars = 3;
  else if (newScore >= state.levelConfig.targetScore) newStars = 2;
  else if (newScore >= state.levelConfig.targetScore * 0.5) newStars = 1;

  let jelliesCleared = 0;
  matchData.matchedTiles.forEach((tile) => {
    const bTile = boardState[tile.row][tile.col];
    bTile.isMatched = true;
    if (bTile.jellyLayers > 0) {
      bTile.jellyLayers--;
      jelliesCleared++;
    }
  });

  let newJellyCount = state.jellyCount;
  if (jelliesCleared > 0) {
    newJellyCount = Math.max(0, state.jellyCount - jelliesCleared);
    soundEngine.playBlockerDamage();
  }

  matchData.specialCreations.forEach((sc) => {
    boardState[sc.row][sc.col] = {
      ...boardState[sc.row][sc.col],
      special: sc.special,
      isMatched: false,
    };
  });

  set({ board: Match3Engine.cloneBoard(boardState), score: newScore, stars: newStars, jellyCount: newJellyCount });

  await new Promise((resolve) => setTimeout(resolve, 250));

  const gravityResult = Match3Engine.applyGravity(boardState, state.levelConfig.colorsAvailable, state.levelConfig.gravityDir);
  boardState = gravityResult.board;
  set({ board: Match3Engine.cloneBoard(boardState) });

  if (cascadeLevel === 2) get().triggerAnnouncer('SWEET!');
  else if (cascadeLevel === 3) get().triggerAnnouncer('TASTY!');
  else if (cascadeLevel === 4) get().triggerAnnouncer('DELICIOUS!');
  else if (cascadeLevel >= 5) get().triggerAnnouncer('DIVINE!');

  await new Promise((resolve) => setTimeout(resolve, 200));

  await processBoardCascade(boardState, cascadeLevel + 1, set, get);
};

const checkGameEndConditions = (currentBoard: TileData[][], remainingMoves: number, set: any, get: any) => {
  const state = get();
  let currentJelly = 0;
  currentBoard.forEach((row) => row.forEach((t) => { currentJelly += t.jellyLayers; }));

  const isObjectiveMet = state.levelConfig.objectiveType === 'jelly'
    ? currentJelly === 0
    : state.score >= state.levelConfig.targetScore;

  if (isObjectiveMet) {
    state.triggerAnnouncer('SUGAR CRUSH!');
    set((s: any) => ({
      levelStarsMap: { ...s.levelStarsMap, [s.levelNumber]: Math.max(s.stars || 1, s.levelStarsMap[s.levelNumber] || 0) },
      showVictory: true
    }));
  } else if (remainingMoves <= 0) {
    set({ showDefeat: true });
  }
};
