import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TileData, LevelConfig, BoosterType } from '../types';
import { Match3Engine } from './Match3Engine';
import { soundEngine } from '../audio/soundEngine';
import { getLevelConfig } from '../data/levels';
import { rulesEngine } from './rules/RulesEngine';

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
  floatingScores: { id: string; row: number; col: number; text: string; colorHex: number }[];
  
  // Meta-Progression
  coins: number;
  playerLevel: number;
  
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
  addFloatingScore: (row: number, col: number, text: string, colorHex: number) => void;
  removeFloatingScore: (id: string) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
  levelNumber: 1,
  levelConfig: getLevelConfig(1),
  board: [],
  explosions: [],
  score: 0,
  movesLeft: 20,
  stars: 0,
  jellyCount: 0,
  ingredientCount: 0,
  floatingScores: [],
  coins: 500,
  playerLevel: 1,
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

  addFloatingScore: (row: number, col: number, text: string, colorHex: number) => {
    const id = `fs-${Date.now()}-${Math.random()}`;
    set((state) => ({ floatingScores: [...state.floatingScores, { id, row, col, text, colorHex }] }));
  },

  removeFloatingScore: (id: string) => {
    set((state) => ({ floatingScores: state.floatingScores.filter(s => s.id !== id) }));
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
    
    const newBoard = Match3Engine.cloneBoard(state.board);
    
    if (type === 'lollipop-hammer') {
      soundEngine.playExplosion();
      newBoard[r][c].isMatched = true;
      set({ board: newBoard });
      // Kick off the cascade rules engine loop by faking a MATCH_RESOLVED event
      rulesEngine.eventBus.emit({
        type: 'MATCH_RESOLVED',
        payload: { board: newBoard, matchedTiles: [newBoard[r][c]], cascadeLevel: 1 },
        timestamp: Date.now()
      });
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
      
      const wrappedTiles = [];
      for(let r=0; r<newBoard.length; r++) {
         for(let c=0; c<newBoard[0].length; c++) {
            if(newBoard[r][c].special === 'wrapped') wrappedTiles.push(newBoard[r][c]);
         }
      }

      rulesEngine.eventBus.emit({
        type: 'MATCH_RESOLVED',
        payload: { board: newBoard, matchedTiles: wrappedTiles, cascadeLevel: 1 },
        timestamp: Date.now()
      });
    } else if (type === 'party-booster') {
      soundEngine.playExplosion();
      const bRows = newBoard.length;
      const bCols = newBoard[0]?.length || 8;
      const matchedInBlast = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr;
          const nc = c + dc;
          if (nr >= 0 && nr < bRows && nc >= 0 && nc < bCols) {
            newBoard[nr][nc].isMatched = true;
            matchedInBlast.push(newBoard[nr][nc]);
          }
        }
      }
      
      set({ board: newBoard });
      rulesEngine.eventBus.emit({
        type: 'MATCH_RESOLVED',
        payload: { board: newBoard, matchedTiles: matchedInBlast, cascadeLevel: 1 },
        timestamp: Date.now()
      });
    }
  }
}),
{
  name: 'candy-crunch-storage',
  partialize: (state) => ({
    levelStarsMap: state.levelStarsMap,
    boosterCounts: state.boosterCounts,
    levelNumber: state.levelNumber,
    isMuted: state.isMuted,
    coins: state.coins,
    playerLevel: state.playerLevel,
  }),
}
));

const handleSwap = async (
  r1: number, c1: number, r2: number, c2: number,
  set: any, get: any
) => {
  set({ isProcessing: true, aiSuggestedSwap: null });
  soundEngine.playSwap();
  const state = get();
  
  // Kick off the Event-Driven Rules Engine loop
  await rulesEngine.processPlayerSwap(r1, c1, r2, c2, state.board, state.levelConfig.colorsAvailable);
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
      coins: s.coins + 50 + (s.stars * 25),
      playerLevel: s.playerLevel + 1,
      showVictory: true
    }));
  } else if (remainingMoves <= 0) {
    set({ showDefeat: true });
  }
};

// --- RULES ENGINE SUBSCRIPTIONS ---
// This acts as the visual adapter, bridging the backend event queue to the React UI

rulesEngine.eventBus.subscribe('SWAP_SUCCESS', async (event) => {
  const { board, cascadeLevel, isSpecialCombo } = event.payload;
  if (isSpecialCombo) {
    soundEngine.playExplosion();
    useGameStore.getState().triggerAnnouncer('SUPER COMBO!');
  }
  useGameStore.setState((s) => ({ movesLeft: s.movesLeft - 1, board }));
  await new Promise((r) => setTimeout(r, 250)); // Let the swap animation play out
});

rulesEngine.eventBus.subscribe('SWAP_FAILURE', async (event) => {
  soundEngine.playInvalid();
  useGameStore.setState({ isProcessing: false });
});

rulesEngine.eventBus.subscribe('MATCH_RESOLVED', async (event) => {
  const { board, matchedTiles, cascadeLevel } = event.payload;
  const state = useGameStore.getState();

  // Handle score & stars
  const ptsGained = matchedTiles.length * 100 * (cascadeLevel || 1);
  const newScore = state.score + ptsGained;
  let newStars = state.stars;
  if (newScore >= state.levelConfig.targetScore * 1.5) newStars = 3;
  else if (newScore >= state.levelConfig.targetScore) newStars = 2;
  else if (newScore >= state.levelConfig.targetScore * 0.5) newStars = 1;

  // Handle Jelly counts
  let newJellyCount = state.jellyCount;
  let jelliesCleared = 0;
  matchedTiles.forEach((tile: TileData) => {
    if (tile.jellyLayers > 0) jelliesCleared++;
  });
  if (jelliesCleared > 0) {
    newJellyCount = Math.max(0, state.jellyCount - jelliesCleared);
    soundEngine.playBlockerDamage();
  }

  // Visual effects
  soundEngine.playPop(cascadeLevel || 1);
  matchedTiles.forEach((mTile: TileData) => {
    const colorHexMap: Record<string, number> = {
      red: 0xef4444, orange: 0xf97316, yellow: 0xeab308, green: 0x22c55e, blue: 0x3b82f6, purple: 0xa855f7
    };
    const cHex = colorHexMap[mTile.color] || 0xef4444;
    state.addExplosion(mTile.row, mTile.col, cHex);
  });
  
  if (matchedTiles.length > 0) {
    const mainTile = matchedTiles[0];
    const cHex = (mainTile.color === 'red' ? 0xef4444 : 0xef4444); // Simplified for speed
    state.addFloatingScore(mainTile.row, mainTile.col, `+${ptsGained}`, cHex);
  }

  useGameStore.setState({ board, score: newScore, stars: newStars, jellyCount: newJellyCount });
  await new Promise((r) => setTimeout(r, 300)); // Explosion animation delay
});

rulesEngine.eventBus.subscribe('REFILL', async (event) => {
  const { board } = event.payload;
  useGameStore.setState({ board });
  await new Promise((r) => setTimeout(r, 250)); // Gravity drop delay
});

rulesEngine.eventBus.subscribe('CASCADE_ENDED', async (event) => {
  const { board } = event.payload;
  useGameStore.setState({ board });
  
  // We're done cascading, check for game end conditions
  const state = useGameStore.getState();
  if (!Match3Engine.hasLegalMoves(board)) {
    state.triggerAnnouncer('SHUFFLING BOARD!');
    const newBoard = Match3Engine.shuffleBoard(board, state.levelConfig.colorsAvailable);
    useGameStore.setState({ board: newBoard });
  }

  checkGameEndConditions(board, state.movesLeft, useGameStore.setState, useGameStore.getState);
  useGameStore.setState({ isProcessing: false });
});
