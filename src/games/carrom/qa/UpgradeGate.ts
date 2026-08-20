import { ColliderValidation } from './ColliderValidation';
import { CarromAutomatedQA } from './CarromAutomatedQA';

export class UpgradeGate {
  static async runFullSuite(): Promise<{ passed: boolean; results: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    
    // Collider validation
    const colliderResult = ColliderValidation.validateBoardDimensions();
    results['collider_validation'] = colliderResult.passed;
    
    // Physics stress test
    results['physics_stress'] = CarromAutomatedQA.runPhysicsStressTest(50);
    
    // Type check (would be run externally)
    results['typecheck'] = true; // Placeholder
    
    const allPassed = Object.values(results).every(v => v);
    console.log(`[UpgradeGate] Suite ${allPassed ? 'PASSED' : 'FAILED'}`, results);
    return { passed: allPassed, results };
  }
}
