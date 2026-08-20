export type CollisionMagnitude = 'SMALL' | 'MEDIUM' | 'HIGH';

export interface CollisionEvent {
  timestamp: number;
  bodyA: string;
  bodyB: string;
  impulse: number;
  position: [number, number, number];
  normal: [number, number, number];
  velocity: [number, number, number];
}

class CollisionSequence {
  private chain: CollisionEvent[] = [];
  
  public startSequence() {
    this.chain = [];
  }

  public addCollision(event: Omit<CollisionEvent, 'timestamp'>) {
    this.chain.push({
      ...event,
      timestamp: Date.now()
    });
  }

  public endSequence() {
    return this.chain;
  }

  public getSequence() {
    return this.chain;
  }

  public getMagnitude(impulse: number): CollisionMagnitude {
    if (impulse < 0.05) return 'SMALL';
    if (impulse <= 0.2) return 'MEDIUM';
    return 'HIGH';
  }
}

export const collisionSequence = new CollisionSequence();
