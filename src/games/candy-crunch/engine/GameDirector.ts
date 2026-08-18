import { useGameStore } from './GameStore';
import { soundEngine } from '../audio/soundEngine';

export class GameDirector {
  private static comboCount = 0;
  private static lastMatchTime = 0;

  /**
   * Evaluates a player's move and adjusts the game's audio/visual intensity.
   */
  public static evaluateMove(cascadeCount: number, scoreGenerated: number) {
    const now = Date.now();
    
    // Reset combo if more than 3 seconds have passed since last match
    if (now - this.lastMatchTime > 3000) {
      this.comboCount = 0;
    }
    
    this.lastMatchTime = now;
    this.comboCount += cascadeCount;

    // Trigger Announcer
    if (this.comboCount > 8 || scoreGenerated > 5000) {
      useGameStore.getState().triggerAnnouncer('SUGAR CRUSH!');
      soundEngine.playCombo(4);
    } else if (this.comboCount > 5 || scoreGenerated > 2000) {
      useGameStore.getState().triggerAnnouncer('DIVINE!');
      soundEngine.playCombo(3);
    } else if (this.comboCount > 3 || scoreGenerated > 1000) {
      useGameStore.getState().triggerAnnouncer('TASTY!');
      soundEngine.playCombo(2);
    } else if (this.comboCount > 1 || scoreGenerated > 500) {
      useGameStore.getState().triggerAnnouncer('SWEET!');
      soundEngine.playCombo(1);
    }

    // Dynamic music adjustment (conceptual)
    if (this.comboCount > 10) {
      // Increase music tempo or add layers for "Frenzy" mode
      // soundEngine.setMusicIntensity('high');
    }
  }

  public static reset() {
    this.comboCount = 0;
    this.lastMatchTime = 0;
  }
}
