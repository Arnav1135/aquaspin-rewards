import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCarromStore } from '../state/CarromState';
import { CarromRulesEngine } from '../rules/CarromRulesEngine';
import { useRapier } from '@react-three/rapier';

export function TurnManager() {
  const turnState = useCarromStore(state => state.turnState);
  const setTurnState = useCarromStore(state => state.setTurnState);
  const resetTurn = useCarromStore(state => state.resetTurn);
  const pocketedThisTurn = useCarromStore(state => state.pocketedThisTurn);
  const strikerFouled = useCarromStore(state => state.strikerFouled);
  const queenCovered = useCarromStore(state => state.queenCovered);
  const updateScore = useCarromStore(state => state.updateScore);
  const currentPlayerIndex = useCarromStore(state => state.currentPlayerIndex);
  const players = useCarromStore(state => state.players);
  const coins = useCarromStore(state => state.coins);
  
  const { world } = useRapier();
  const sleepTimer = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Handle sleep detection
  useFrame((_, delta) => {
    if (turnState === 'PHYSICS_ACTIVE') {
      let allSleeping = true;
      world.bodies.forEach((body) => {
        if (body.isDynamic()) {
          const vel = body.linvel();
          const speedSq = vel.x*vel.x + vel.y*vel.y + vel.z*vel.z;
          if (speedSq > 0.001) {
            allSleeping = false;
          }
        }
      });

      if (allSleeping) {
        sleepTimer.current += delta;
        if (sleepTimer.current > 0.5) {
          setTurnState('RESOLVING');
          sleepTimer.current = 0;
        }
      } else {
        sleepTimer.current = 0;
      }
    }
  });

  // Handle turn resolution
  useEffect(() => {
    if (turnState === 'RESOLVING') {
      const pocketedCoinsData = pocketedThisTurn.map(id => coins[id]).filter(Boolean);
      if (strikerFouled) {
        // Mock a striker coin so the rules engine knows it was fouled
        pocketedCoinsData.push({ id: 'striker_foul', type: 'striker', position: [0,0,0], isPocketed: true } as any);
      }
      
      const currentPlayer = players[currentPlayerIndex];
      const result = CarromRulesEngine.evaluateTurnResult(
        pocketedCoinsData,
        currentPlayer,
        queenCovered
      );

      if (result.scoreChange !== 0) {
        updateScore(currentPlayerIndex, result.scoreChange);
      }
      
      // Update queen state if we had real setter for it, for now assume simple
      if (result.failedToCoverQueen) {
        // In real game: un-pocket queen
      }

      timeoutRef.current = setTimeout(() => {
        resetTurn();
        
        // Handle game over logic here - e.g. check if all of a color are pocketed
        const p1Coins = Object.values(coins).filter(c => c.type === 'white' && !c.isPocketed);
        const p2Coins = Object.values(coins).filter(c => c.type === 'black' && !c.isPocketed);
        if (p1Coins.length === 0 || p2Coins.length === 0) {
          setTurnState('GAME_OVER');
        } else if (result.nextTurnContinues) {
          // Revert currentPlayerIndex increase from resetTurn
          useCarromStore.setState((state) => ({ 
            currentPlayerIndex: currentPlayerIndex 
          }));
        }
      }, 1000);
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [turnState, resetTurn, pocketedThisTurn, strikerFouled, coins, players, currentPlayerIndex, queenCovered, updateScore, setTurnState]);

  return null;
}
