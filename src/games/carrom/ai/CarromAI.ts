import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';

export class CarromAI {
  private isCalculating = false;
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];

  public update() {
    const state = useCarromStore.getState();
    
    // Only act if it's AI turn and game mode is VS_AI
    if (state.gameMode !== 'VS_AI' || state.turnState !== 'AIMING' || state.players[state.currentPlayerIndex].id !== 'p2') {
      return;
    }

    if (!this.isCalculating) {
      this.isCalculating = true;
      // Simulate "thinking" time
      this.timeoutIds.push(setTimeout(() => {
        this.calculateAndShoot();
      }, 1500));
    }
  }

  private calculateAndShoot() {
    const state = useCarromStore.getState();
    if (state.turnState !== 'AIMING') {
      this.isCalculating = false;
      return;
    }

    const coins = Object.values(state.coins).filter(c => !c.isPocketed);
    
    if (coins.length === 0) {
      this.isCalculating = false;
      return;
    }

    // Simple AI: pick a random coin and shoot towards it
    // More advanced AI would:
    // 1. Raycast to check for clear path to coin
    // 2. Check if coin can be directed into a pocket
    // 3. Choose the shot with highest probability of success
    
    const targetCoin = coins[Math.floor(Math.random() * coins.length)];
    
    const dx = targetCoin.position[0] - state.strikerPosition[0];
    const dz = targetCoin.position[2] - state.strikerPosition[2];
    
    const angle = Math.atan2(dz, dx);
    const distance = Math.sqrt(dx*dx + dz*dz);
    
    // Map distance to power loosely
    const power = Math.min(Math.max((distance / 0.5) * 100, 30), 100);

    state.setAimAngle(angle);
    state.setPower(power);
    
    // Wait a brief moment to show aim, then shoot
    this.timeoutIds.push(setTimeout(() => {
      const currentState = useCarromStore.getState();
      if (currentState.turnState === 'AIMING') {
        currentState.recordReplay();
        currentState.setTurnState('SHOOTING');
      }
      this.isCalculating = false;
    }, 500));
  }

  public dispose() {
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];
    this.isCalculating = false;
  }
}

// Singleton instance
export const carromAI = new CarromAI();
