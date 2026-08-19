import { CarromCoinData, CarromPlayer } from '../types/CarromTypes';

export class CarromRulesEngine {
  static evaluateTurnResult(
    pocketedCoins: CarromCoinData[],
    currentPlayer: CarromPlayer,
    queenCovered: boolean
  ) {
    let scoreChange = 0;
    let nextTurnContinues = false;
    let isFoul = false;
    
    // Identify pocketed items this turn
    const strikerPocketed = pocketedCoins.some(c => c.type === 'striker' as any);
    const whitePocketed = pocketedCoins.filter(c => c.type === 'white');
    const blackPocketed = pocketedCoins.filter(c => c.type === 'black');
    const queenPocketed = pocketedCoins.some(c => c.type === 'queen');

    // Foul: Pocketing the striker
    if (strikerPocketed) {
      isFoul = true;
      scoreChange -= 20; // Example penalty
    }

    // Standard scoring
    if (currentPlayer.color === 'white') {
      scoreChange += whitePocketed.length * 10;
      if (blackPocketed.length > 0 && !strikerPocketed) {
        scoreChange -= blackPocketed.length * 5; // Penalty for pocketing opponent coin
      }
      if (whitePocketed.length > 0 && !strikerPocketed) {
        nextTurnContinues = true;
      }
    } else {
      scoreChange += blackPocketed.length * 10;
      if (whitePocketed.length > 0 && !strikerPocketed) {
        scoreChange -= whitePocketed.length * 5;
      }
      if (blackPocketed.length > 0 && !strikerPocketed) {
        nextTurnContinues = true;
      }
    }

    // Queen Logic
    let newQueenCovered = queenCovered;
    if (queenPocketed) {
      scoreChange += 50;
      nextTurnContinues = true;
    } else if (queenCovered) {
      // Must cover the queen in the next shot
      if (!nextTurnContinues) {
        // Failed to cover
        scoreChange -= 50; // Revert points
        newQueenCovered = false;
        // The queen should be placed back on the board logic goes to the state manager
      }
    }

    return {
      scoreChange,
      nextTurnContinues: !isFoul && nextTurnContinues,
      isFoul,
      queenCovered: newQueenCovered,
      failedToCoverQueen: queenCovered && !nextTurnContinues && !isFoul
    };
  }
}
