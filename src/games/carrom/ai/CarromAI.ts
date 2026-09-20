import { useCarromStore } from '../state/CarromState';
import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';
import { CarromCoinData } from '../types/CarromTypes';

const POCKETS = [
  [-1.38, 0, -1.38],
  [1.38, 0, -1.38],
  [-1.38, 0, 1.38],
  [1.38, 0, 1.38],
];

export class CarromAI {
  private isCalculating = false;
  private timeoutIds: ReturnType<typeof setTimeout>[] = [];

  public update() {
    const state = useCarromStore.getState();
    if (state.gameMode !== 'VS_AI' || state.turnState !== 'AIMING' || state.players[state.currentPlayerIndex].id !== 'p2') {
      return;
    }

    if (!this.isCalculating) {
      this.isCalculating = true;
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

    const aiColor = state.players[state.currentPlayerIndex].color;
    const coins = Object.values(state.coins).filter(c => !c.isPocketed);
    
    if (coins.length === 0) {
      this.isCalculating = false;
      return;
    }

    const validTargets = coins.filter(c => c.type === aiColor || c.type === 'queen');
    const targetsToConsider = validTargets.length > 0 ? validTargets : coins;

    let bestShot = null;
    let bestScore = -Infinity;

    // The AI plays on the top baseline (z = -1.0) because player 1 is on bottom baseline (z = 1.0)?
    // Wait, let's assume the AI can place anywhere on their baseline.
    // Let's just use the current striker position for simplicity, or we can iterate over positions.
    const playableWidth = CARROM_PHYSICS.BOARD.WIDTH / 2 - 0.12; 
    
    const testPositions = [];
    // Test 11 points along the baseline
    for (let i = -5; i <= 5; i++) {
      testPositions.push(i * (playableWidth / 5));
    }

    // AI baseline is typically opposite to player 1. In standard carrom, p2 is opposite.
    // If Player 1 is z=1.0, Player 2 is z=-1.0. Let's check state.strikerPosition to see current z.
    const baselineZ = state.strikerPosition[2]; 

    for (const pos of testPositions) {
      const strikerPoint = { x: pos, z: baselineZ };

      for (const target of targetsToConsider) {
        for (const pocket of POCKETS) {
          const coinToPocketDx = pocket[0] - target.position[0];
          const coinToPocketDz = pocket[2] - target.position[2];
          const distToPocket = Math.sqrt(coinToPocketDx * coinToPocketDx + coinToPocketDz * coinToPocketDz);
          
          const dirToPocketX = coinToPocketDx / distToPocket;
          const dirToPocketZ = coinToPocketDz / distToPocket;

          // Ideal hit point on the coin
          const radiusCombined = CARROM_PHYSICS.STRIKER.RADIUS + CARROM_PHYSICS.COIN.RADIUS;
          const hitPointX = target.position[0] - dirToPocketX * radiusCombined;
          const hitPointZ = target.position[2] - dirToPocketZ * radiusCombined;

          const strikerToHitDx = hitPointX - strikerPoint.x;
          const strikerToHitDz = hitPointZ - strikerPoint.z;
          const distToHit = Math.sqrt(strikerToHitDx * strikerToHitDx + strikerToHitDz * strikerToHitDz);

          // Raycast check: Ensure no coins block striker->hitPoint OR target->pocket
          let isBlocked = false;
          for (const other of coins) {
            if (other.id === target.id) continue;
            
            // Basic line-point distance check for blocking
            if (this.isPointBlockingLine(other.position[0], other.position[2], strikerPoint.x, strikerPoint.z, hitPointX, hitPointZ, CARROM_PHYSICS.COIN.RADIUS * 2)) {
              isBlocked = true; break;
            }
            if (this.isPointBlockingLine(other.position[0], other.position[2], target.position[0], target.position[2], pocket[0], pocket[2], CARROM_PHYSICS.COIN.RADIUS * 1.5)) {
              isBlocked = true; break;
            }
          }

          if (!isBlocked) {
            // Cut angle calculation (how straight the shot is)
            const dirStrikerX = strikerToHitDx / distToHit;
            const dirStrikerZ = strikerToHitDz / distToHit;
            const dot = dirStrikerX * dirToPocketX + dirStrikerZ * dirToPocketZ;
            
            // Only consider shots that push the coin forward (dot > 0)
            if (dot > 0.1) {
              const score = dot * 100 - distToHit * 10 - distToPocket * 5 + (target.type === 'queen' ? 50 : 0);
              if (score > bestScore) {
                bestScore = score;
                bestShot = {
                  startX: strikerPoint.x,
                  targetX: hitPointX,
                  targetZ: hitPointZ,
                  distToHit,
                  distToPocket
                };
              }
            }
          }
        }
      }
    }

    if (bestShot) {
      // Execute the calculated perfect shot
      state.setStrikerPosition([bestShot.startX, CARROM_PHYSICS.STRIKER.HEIGHT / 2, baselineZ]);
      
      const dx = bestShot.targetX - bestShot.startX;
      const dz = bestShot.targetZ - baselineZ;
      const angle = Math.atan2(dz, dx);
      
      const powerNeeded = (bestShot.distToHit + bestShot.distToPocket) * 20;
      const power = Math.min(Math.max(powerNeeded, 30), 100);

      state.setAimAngle(angle);
      state.setPower(power);
    } else {
      // Fallback: Pick a random coin if no clear pocketing shot exists
      const targetCoin = targetsToConsider[Math.floor(Math.random() * targetsToConsider.length)];
      const dx = targetCoin.position[0] - state.strikerPosition[0];
      const dz = targetCoin.position[2] - state.strikerPosition[2];
      const angle = Math.atan2(dz, dx);
      state.setAimAngle(angle);
      state.setPower(40); // Defensive break
    }

    this.timeoutIds.push(setTimeout(() => {
      const currentState = useCarromStore.getState();
      if (currentState.turnState === 'AIMING') {
        currentState.recordReplay();
        currentState.setTurnState('SHOOTING');
      }
      this.isCalculating = false;
    }, 800));
  }

  private isPointBlockingLine(px: number, pz: number, ax: number, az: number, bx: number, bz: number, threshold: number) {
    const l2 = (ax - bx) ** 2 + (az - bz) ** 2;
    if (l2 === 0) return false;
    let t = ((px - ax) * (bx - ax) + (pz - az) * (bz - az)) / l2;
    t = Math.max(0, Math.min(1, t));
    const closestX = ax + t * (bx - ax);
    const closestZ = az + t * (bz - az);
    const distSq = (px - closestX) ** 2 + (pz - closestZ) ** 2;
    return distSq < (threshold * threshold);
  }

  public dispose() {
    this.timeoutIds.forEach(id => clearTimeout(id));
    this.timeoutIds = [];
    this.isCalculating = false;
  }
}

export const carromAI = new CarromAI();
