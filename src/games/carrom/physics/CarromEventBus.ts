export type CarromEvent =
  | { type: 'COLLISION', force: number, position: [number, number, number], velocity: [number, number, number], objectType: 'coin' | 'striker' | 'board' | 'pocket' }
  | { type: 'POCKETED', coinId: string, position: [number, number, number] }
  | { type: 'STRIKE', power: number, aimAngle: number };

type Listener = (event: CarromEvent) => void;

class EventBus {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: CarromEvent) {
    this.listeners.forEach(l => l(event));
  }
}

export const carromEventBus = new EventBus();
