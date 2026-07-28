import { create } from 'zustand';

export type PlayerId = 'PLAYER_1' | 'PLAYER_2';
export type BallGroup = 'SOLIDS' | 'STRIPES' | 'UNASSIGNED';
export type GameState = 'BREAK' | 'OPEN_TABLE' | 'IN_PLAY' | 'GAME_OVER';
export type TurnState = 'AIMING' | 'ROLLING' | 'BALL_IN_HAND';
export type FoulType = 'NONE' | 'SCRATCH' | 'WRONG_BALL_FIRST' | 'NO_RAIL_CONTACT' | 'WRONG_POCKET' | 'EIGHT_BALL_EARLY';

export interface PoolRulesState {
  gameState: GameState;
  turnState: TurnState;
  currentPlayer: PlayerId;
  player1Group: BallGroup;
  player2Group: BallGroup;
  pocketedBalls: number[];
  winner: PlayerId | null;
  foulMessage: string | null;
  
  // Actions
  startMatch: () => void;
  beginTurn: (isBallInHand?: boolean) => void;
  ballsRolling: () => void;
  resolveTurn: (firstHit: number | null, pocketedThisTurn: number[], railHit: boolean) => void;
}

const isSolid = (id: number) => id >= 1 && id <= 7;
const isStripe = (id: number) => id >= 9 && id <= 15;

export const usePoolRules = create<PoolRulesState>((set, get) => ({
  gameState: 'BREAK',
  turnState: 'AIMING',
  currentPlayer: 'PLAYER_1',
  player1Group: 'UNASSIGNED',
  player2Group: 'UNASSIGNED',
  pocketedBalls: [],
  winner: null,
  foulMessage: null,

  startMatch: () => set({
    gameState: 'BREAK',
    turnState: 'AIMING',
    currentPlayer: 'PLAYER_1',
    player1Group: 'UNASSIGNED',
    player2Group: 'UNASSIGNED',
    pocketedBalls: [],
    winner: null,
    foulMessage: null,
  }),

  beginTurn: (isBallInHand = false) => set({
    turnState: isBallInHand ? 'BALL_IN_HAND' : 'AIMING',
    foulMessage: null,
  }),

  ballsRolling: () => set({ turnState: 'ROLLING' }),

  resolveTurn: (firstHit: number | null, pocketedThisTurn: number[], railHit: boolean) => {
    const state = get();
    let nextPlayer: PlayerId = state.currentPlayer === 'PLAYER_1' ? 'PLAYER_2' : 'PLAYER_1';
    let isFoul = false;
    let foulMsg = '';
    let keepTurn = false;
    
    const cuePocketed = pocketedThisTurn.includes(0);
    const eightPocketed = pocketedThisTurn.includes(8);
    
    // 1. Check early 8-ball loss
    if (eightPocketed) {
      const myGroup = state.currentPlayer === 'PLAYER_1' ? state.player1Group : state.player2Group;
      // Are all my balls pocketed?
      const targetBalls = myGroup === 'SOLIDS' ? [1,2,3,4,5,6,7] : myGroup === 'STRIPES' ? [9,10,11,12,13,14,15] : [];
      const hasClearedGroup = myGroup !== 'UNASSIGNED' && targetBalls.every(b => state.pocketedBalls.includes(b) || pocketedThisTurn.includes(b));
      
      if (!hasClearedGroup || cuePocketed || isFoul) {
        set({ gameState: 'GAME_OVER', winner: nextPlayer, foulMessage: 'Foul on 8-Ball! Game Over.' });
        return;
      } else {
        set({ gameState: 'GAME_OVER', winner: state.currentPlayer, foulMessage: '8-Ball Pocketed! You Win!' });
        return;
      }
    }

    // 2. Foul Checks
    if (cuePocketed) {
      isFoul = true;
      foulMsg = 'Scratch!';
    } else if (firstHit === null) {
      isFoul = true;
      foulMsg = 'No balls hit!';
    } else if (!railHit && pocketedThisTurn.length === 0) {
      isFoul = true;
      foulMsg = 'No rail contact after hit!';
    } else {
      // Check wrong ball first
      const myGroup = state.currentPlayer === 'PLAYER_1' ? state.player1Group : state.player2Group;
      if (myGroup === 'SOLIDS' && !isSolid(firstHit)) {
        isFoul = true;
        foulMsg = 'Wrong ball hit first (Expected Solid)';
      } else if (myGroup === 'STRIPES' && !isStripe(firstHit)) {
        isFoul = true;
        foulMsg = 'Wrong ball hit first (Expected Stripe)';
      }
    }

    // 3. Handle Group Assignment & Turn Passing
    const newPocketed = [...state.pocketedBalls, ...pocketedThisTurn.filter(b => b !== 0)];
    let newP1Group = state.player1Group;
    let newP2Group = state.player2Group;
    let newState = state.gameState;

    if (!isFoul) {
      if (state.gameState === 'BREAK') {
        if (pocketedThisTurn.length > 0) keepTurn = true;
        newState = 'OPEN_TABLE';
      } else if (state.gameState === 'OPEN_TABLE') {
        // Assign groups based on the first legally pocketed ball
        const legalPocketed = pocketedThisTurn.find(b => b !== 0 && b !== 8);
        if (legalPocketed) {
          const isGrpSolid = isSolid(legalPocketed);
          if (state.currentPlayer === 'PLAYER_1') {
            newP1Group = isGrpSolid ? 'SOLIDS' : 'STRIPES';
            newP2Group = isGrpSolid ? 'STRIPES' : 'SOLIDS';
          } else {
            newP2Group = isGrpSolid ? 'SOLIDS' : 'STRIPES';
            newP1Group = isGrpSolid ? 'STRIPES' : 'SOLIDS';
          }
          newState = 'IN_PLAY';
          keepTurn = true;
        }
      } else if (state.gameState === 'IN_PLAY') {
        // Did we pocket our own ball?
        const myGroup = state.currentPlayer === 'PLAYER_1' ? newP1Group : newP2Group;
        const pocketedMine = pocketedThisTurn.some(b => myGroup === 'SOLIDS' ? isSolid(b) : isStripe(b));
        if (pocketedMine) keepTurn = true;
      }
    }

    if (isFoul) {
      set({ 
        currentPlayer: nextPlayer, 
        turnState: 'BALL_IN_HAND', 
        foulMessage: foulMsg, 
        pocketedBalls: newPocketed,
        player1Group: newP1Group,
        player2Group: newP2Group,
        gameState: newState
      });
    } else if (keepTurn) {
      set({ 
        turnState: 'AIMING', 
        pocketedBalls: newPocketed,
        player1Group: newP1Group,
        player2Group: newP2Group,
        gameState: newState,
        foulMessage: null
      });
    } else {
      set({ 
        currentPlayer: nextPlayer, 
        turnState: 'AIMING', 
        pocketedBalls: newPocketed,
        player1Group: newP1Group,
        player2Group: newP2Group,
        gameState: newState,
        foulMessage: null
      });
    }
  }
}));
