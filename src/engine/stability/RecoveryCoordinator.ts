export type RecoveryLayer = 'Layer A' | 'Layer B' | 'Layer C' | 'Layer D' | 'Layer E' | 'Layer F' | 'Layer G';
export type RecoveryTier = 1 | 2 | 3 | 4;

export interface IncidentReport {
  layer: RecoveryLayer;
  failureMode: string;
  severity: number;
  message: string;
  timestamp: number;
  tierAttempted: RecoveryTier;
}

export type QualityTier = 'Ultra' | 'High' | 'Medium' | 'Low' | 'Potato';

class RecoveryCoordinatorImpl {
  private history: IncidentReport[] = [];
  private currentQuality: QualityTier = 'Ultra';
  
  // Singleton listener for HUD
  private listeners: Set<(stats: any) => void> = new Set();

  public subscribe(fn: (stats: any) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    const stats = this.getStats();
    this.listeners.forEach(fn => fn(stats));
  }

  public reportIncident(
    layer: RecoveryLayer, 
    failureMode: string, 
    message: string, 
    tier: RecoveryTier
  ) {
    const report: IncidentReport = {
      layer,
      failureMode,
      severity: tier,
      message,
      timestamp: Date.now(),
      tierAttempted: tier
    };
    
    this.history.unshift(report);
    if (this.history.length > 50) this.history.pop();

    console.warn(`[Recovery Coordinator] ${layer} - ${failureMode}: ${message} (Tier ${tier})`);
    
    // Attempt escalation if it's Tier 2
    if (tier === 2) {
      this.degradeQuality();
    }
    
    // In a real production app, we would send `report` to an MCP / Sentry here
    
    this.notify();
  }

  private degradeQuality() {
    const tiers: QualityTier[] = ['Ultra', 'High', 'Medium', 'Low', 'Potato'];
    const idx = tiers.indexOf(this.currentQuality);
    if (idx < tiers.length - 1) {
      this.currentQuality = tiers[idx + 1];
      console.warn(`[Recovery Coordinator] Graceful Degradation: Dropping quality to ${this.currentQuality}`);
    }
  }

  public getCurrentQuality(): QualityTier {
    return this.currentQuality;
  }

  public getStats() {
    const breakdown = {
      'Layer A': 0, 'Layer B': 0, 'Layer C': 0, 
      'Layer D': 0, 'Layer E': 0, 'Layer F': 0, 'Layer G': 0
    };
    this.history.forEach(h => {
      breakdown[h.layer]++;
    });

    return {
      total: this.history.length,
      currentQuality: this.currentQuality,
      breakdown,
      recent: this.history.slice(0, 5)
    };
  }
}

export const RecoveryCoordinator = new RecoveryCoordinatorImpl();
