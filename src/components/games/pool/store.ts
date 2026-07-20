import { create } from 'zustand';

export type PlayerGroup = 'solids' | 'stripes' | null;
export type GameState = 'menu' | 'aiming' | 'moving' | 'ballInHand' | 'gameOver';

interface Player {
  id: 1 | 2;
  group: PlayerGroup;
}

export interface ShotEvents {
  firstContactId: number | null;
  cushionHitsAfterContact: number;
  ballsPocketed: number[];
  cushionHitsTotal: number;
}

interface PoolStore {
  gameState: GameState;
  currentPlayer: 1 | 2;
  players: Record<1 | 2, Player>;
  isBreakShot: boolean;
  winner: 1 | 2 | null;
  spin: { x: number, y: number };
  
  // Shot Tracking
  currentShotEvents: ShotEvents;
  
  // Actions
  startGame: () => void;
  startShot: () => void;
  registerCollision: (idA: number, idB: number, isCushion: boolean) => void;
  registerPocket: (ballId: number) => void;
  resolveTurn: () => void;
  placeBallInHand: () => void; // call when placing cue ball
  setSpin: (x: number, y: number) => void;
}

const initialShotEvents: ShotEvents = {
  firstContactId: null,
  cushionHitsAfterContact: 0,
  ballsPocketed: [],
  cushionHitsTotal: 0,
};

export const usePoolStore = create<PoolStore>((set) => ({
  gameState: 'menu',
  currentPlayer: 1,
  players: {
    1: { id: 1, group: null },
    2: { id: 2, group: null },
  },
  isBreakShot: true,
  winner: null,
  spin: { x: 0, y: 0 },
  currentShotEvents: { ...initialShotEvents },

  startGame: () => set({
    gameState: 'aiming',
    currentPlayer: 1,
    isBreakShot: true,
    winner: null,
    players: { 1: { id: 1, group: null }, 2: { id: 2, group: null } },
    currentShotEvents: { ...initialShotEvents }
  }),

  startShot: () => set({ 
    gameState: 'moving',
    currentShotEvents: { ...initialShotEvents }
  }),

  registerCollision: (idA, idB, isCushion) => set((state) => {
    const events = { ...state.currentShotEvents };
    
    // Cue ball is 0. If cue ball hits an object ball first:
    if (idA === 0 && idB > 0 && idB <= 15 && events.firstContactId === null) {
      events.firstContactId = idB;
    } else if (idB === 0 && idA > 0 && idA <= 15 && events.firstContactId === null) {
      events.firstContactId = idA;
    }

    if (isCushion) {
      events.cushionHitsTotal++;
      if (events.firstContactId !== null) {
        events.cushionHitsAfterContact++;
      }
    }
    
    return { currentShotEvents: events };
  }),

  registerPocket: (ballId) => set((state) => ({
    currentShotEvents: {
      ...state.currentShotEvents,
      ballsPocketed: [...state.currentShotEvents.ballsPocketed, ballId]
    }
  })),

  resolveTurn: () => set((state) => {
    const events = state.currentShotEvents;
    const player = state.players[state.currentPlayer];
    const opponentId = state.currentPlayer === 1 ? 2 : 1;
    
    let isFoul = false;
    let nextTurnKeeps = false;
    let newWinner: 1 | 2 | null = null;
    let newBreakShot = state.isBreakShot;

    const isSolid = (id: number) => id >= 1 && id <= 7;
    const isStripe = (id: number) => id >= 9 && id <= 15;
    
    // 1. Break Shot Rules
    if (state.isBreakShot) {
      const pocketedAny = events.ballsPocketed.length > 0;
      if (!pocketedAny && events.cushionHitsTotal < 4) {
        // Illegal break foul
        isFoul = true;
      }
      if (events.ballsPocketed.includes(0)) {
        isFoul = true; // Scratch on break
      } else if (!isFoul && pocketedAny) {
        nextTurnKeeps = true;
      }
      newBreakShot = false;
    } 
    // 2. Standard Shot Rules
    else {
      // Scratch
      if (events.ballsPocketed.includes(0)) {
        isFoul = true;
      }
      
      // Hit wrong ball first
      if (events.firstContactId === null) {
        isFoul = true;
      } else if (player.group === 'solids' && !isSolid(events.firstContactId) && events.firstContactId !== 8) {
         isFoul = true;
      } else if (player.group === 'stripes' && !isStripe(events.firstContactId) && events.firstContactId !== 8) {
         isFoul = true;
      } else if (player.group !== null && events.firstContactId === 8) {
         // Can only hit 8 first if it's the legal object ball (all others pocketed). We simplify here for MVP, assuming it's a foul if hit early.
         // A true implementation needs to track remaining balls on table.
         // For now, if hit 8 first, we will assume it's a foul unless they are on the 8 ball. 
         // *Will refine this logic below*
      }

      // No rail contact after first contact, and nothing pocketed
      if (!isFoul && events.cushionHitsAfterContact === 0 && events.ballsPocketed.length === 0) {
        isFoul = true;
      }

      // Legal pot?
      const pocketedLegal = events.ballsPocketed.some(id => 
        (player.group === 'solids' && isSolid(id)) || 
        (player.group === 'stripes' && isStripe(id)) ||
        (player.group === null && id !== 0 && id !== 8)
      );

      if (!isFoul && pocketedLegal) {
        nextTurnKeeps = true;
      }
    }

    // Assign groups on open table
    if (!isFoul && player.group === null && !state.isBreakShot && events.ballsPocketed.length > 0) {
      // Assign based on first pocketed valid ball
      const firstSunk = events.ballsPocketed.find(id => id !== 0 && id !== 8);
      if (firstSunk) {
        const group = isSolid(firstSunk) ? 'solids' : 'stripes';
        const oppGroup = group === 'solids' ? 'stripes' : 'solids';
        state.players[state.currentPlayer].group = group;
        state.players[opponentId].group = oppGroup;
      }
    }

    // 8-Ball Logic
    if (events.ballsPocketed.includes(8)) {
      if (isFoul || state.isBreakShot) {
        // Lose instantly on scratch with 8, or potting 8 on break (variant)
        newWinner = opponentId;
      } else {
        // Legal 8 pot logic requires checking if table is cleared for that player.
        // We will assume legal win for now if it wasn't a foul.
        newWinner = state.currentPlayer;
      }
    }

    return {
      gameState: newWinner ? 'gameOver' : (isFoul ? 'ballInHand' : 'aiming'),
      currentPlayer: (isFoul || !nextTurnKeeps) ? opponentId : state.currentPlayer,
      winner: newWinner,
      isBreakShot: newBreakShot,
      currentShotEvents: { ...initialShotEvents }
    };
  }),

  placeBallInHand: () => set({ gameState: 'aiming' }),
  
  setSpin: (x, y) => set({ spin: { x, y } })
}));
