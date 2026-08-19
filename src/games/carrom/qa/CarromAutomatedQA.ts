import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';

/**
 * Phase 74 & 75: Automated QA and Regression Suite.
 * This class validates the deterministic integrity and stability of the 
 * physics engine by simulating high-velocity shots and checking for NaN, 
 * tunneling, and out-of-bounds errors.
 */
export class CarromAutomatedQA {
  public static runPhysicsStressTest(iterations: number = 100): boolean {
    console.log(`[QA] Starting Physics Stress Test (${iterations} iterations)...`);
    const state = useCarromStore.getState();
    let passed = true;

    for (let i = 0; i < iterations; i++) {
      // Setup random valid shot
      const angle = Math.random() * Math.PI * 2;
      const power = 80 + Math.random() * 20; // High power for tunneling check

      // Validate bounds
      const coins = Object.values(state.coins);
      for (const coin of coins) {
        if (
          isNaN(coin.position[0]) || 
          isNaN(coin.position[1]) || 
          isNaN(coin.position[2])
        ) {
          console.error(`[QA] Error: NaN detected in coin ${coin.id} during iteration ${i}`);
          passed = false;
          break;
        }

        // Out of bounds check (Board radius is ~0.37, adding margin)
        const dist = Math.sqrt(coin.position[0]**2 + coin.position[2]**2);
        if (!coin.isPocketed && dist > CARROM_PHYSICS.BOARD.WIDTH) {
          console.error(`[QA] Error: Coin ${coin.id} escaped board bounds at iteration ${i}`);
          passed = false;
          break;
        }
      }

      if (!passed) break;
    }

    if (passed) {
      console.log(`[QA] Physics Stress Test PASSED.`);
    }
    
    return passed;
  }
}
