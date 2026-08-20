import { CARROM_PHYSICS } from '../physics/CarromPhysicsConstants';

export class ColliderValidation {
  static validateBoardDimensions(): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    const { WIDTH, BORDER_WIDTH } = CARROM_PHYSICS.BOARD;
    const { RADIUS: pocketRadius } = CARROM_PHYSICS.POCKET;
    
    if (WIDTH <= 0) errors.push('Board width must be positive');
    if (BORDER_WIDTH <= 0) errors.push('Border width must be positive');
    if (pocketRadius >= WIDTH / 4) errors.push('Pocket radius too large relative to board');
    if (CARROM_PHYSICS.COIN.RADIUS >= pocketRadius) errors.push('Coin radius must be smaller than pocket');
    if (CARROM_PHYSICS.STRIKER.RADIUS >= pocketRadius) errors.push('Striker radius must fit in pocket or be clearly larger');
    
    return { passed: errors.length === 0, errors };
  }
  
  static validatePhysicsMismatch(): { passed: boolean; warnings: string[] } {
    const warnings: string[] = [];
    // Verify visual sizes match physics sizes
    if (CARROM_PHYSICS.COIN.HEIGHT > CARROM_PHYSICS.STRIKER.HEIGHT * 2) {
      warnings.push('Coin height unexpectedly larger than striker');
    }
    return { passed: warnings.length === 0, warnings };
  }
}
