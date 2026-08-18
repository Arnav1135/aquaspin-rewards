export interface PlayerAction {
  timestamp: number;
  type: 'swap' | 'booster';
  payload: any;
}

export interface ReplaySession {
  sessionId: string;
  levelNumber: number;
  seed: string; // the seed used to generate the procedural board
  actions: PlayerAction[];
}

export class ReplaySystem {
  private static currentSession: ReplaySession | null = null;

  public static startRecording(levelNumber: number, seed: string) {
    this.currentSession = {
      sessionId: `replay-${Date.now()}`,
      levelNumber,
      seed,
      actions: []
    };
    console.log(`[ReplaySystem] Started recording level ${levelNumber} with seed ${seed}`);
  }

  public static recordAction(type: 'swap' | 'booster', payload: any) {
    if (this.currentSession) {
      this.currentSession.actions.push({
        timestamp: Date.now(),
        type,
        payload
      });
    }
  }

  public static stopAndExport(): string | null {
    if (!this.currentSession) return null;
    
    const data = JSON.stringify(this.currentSession);
    this.currentSession = null;
    
    // In a real app, send to analytics or save locally for QA to reproduce bugs
    console.log(`[ReplaySystem] Exported replay data of length ${data.length}`);
    return data;
  }
}
