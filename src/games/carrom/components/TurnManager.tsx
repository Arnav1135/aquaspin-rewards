import React, { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useCarromStore } from '../state/CarromState';
import { CarromRulesEngine } from '../rules/CarromRulesEngine';
import { useRapier } from '@react-three/rapier';

export function TurnManager() {
  const turnState = useCarromStore(state => state.turnState);
  const setTurnState = useCarromStore(state => state.setTurnState);
  const resetTurn = useCarromStore(state => state.resetTurn);
  
  const { world } = useRapier();
  const sleepTimer = useRef(0);

  useFrame((_, delta) => {
    if (turnState === 'PHYSICS_ACTIVE') {
      // Check if all dynamic bodies are sleeping or moving very slowly
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
        if (sleepTimer.current > 0.5) { // Ensure they rest for 0.5s
          setTurnState('RESOLVING');
          sleepTimer.current = 0;
        }
      } else {
        sleepTimer.current = 0;
      }
    }
  });

  useEffect(() => {
    if (turnState === 'RESOLVING') {
      // In a full implementation, we'd gather pocketed coins this turn and pass to Rules Engine
      // For now, simply reset for the next turn
      setTimeout(() => {
        resetTurn();
      }, 1000); // Small pause before resetting
    }
  }, [turnState, resetTurn]);

  return null;
}
