import * as THREE from 'three';

export type PhysicalEventType = 
  | 'OBJECT_SPAWNED'
  | 'OBJECT_SELECTED'
  | 'OBJECT_MOVED'
  | 'OBJECT_FALLEN'
  | 'OBJECT_IMPACT'
  | 'OBJECT_DAMAGED'
  | 'OBJECT_DESTROYED'
  | 'MATCH_CREATED'
  | 'CASCADE_STARTED'
  | 'CASCADE_STEP'
  | 'CASCADE_ENDED'
  | 'SPECIAL_CREATED'
  | 'SPECIAL_ACTIVATED'
  | 'SPLASH'
  | 'POUR'
  | 'BREAK'
  | 'CRACK'
  | 'FREEZE'
  | 'BURN'
  | 'WET'
  | 'BOUNCE'
  | 'COMBO_STARTED'
  | 'MEGA_COMBO'
  | 'VICTORY'
  | 'DEFEAT'
  | 'REWARD';

export type UniversalMaterialType = 
  | 'CANDY'
  | 'GLASS'
  | 'WATER'
  | 'ICE'
  | 'METAL'
  | 'STONE'
  | 'WOOD'
  | 'SAND';

export interface PhysicalInteractionEvent {
  id: string;
  type: PhysicalEventType;
  timestamp: number;
  sourceId?: string;
  position: THREE.Vector3;
  direction?: THREE.Vector3;
  strength: number; // 0.0 to 1.0+
  materialType: UniversalMaterialType;
  colorHex?: number;
  scale?: number;
  metadata?: Record<string, any>;
}

export type PhysicalEventListener = (event: PhysicalInteractionEvent) => void;

export class PhysicalEventBus {
  private static instance: PhysicalEventBus;
  private listeners: Map<PhysicalEventType, Set<PhysicalEventListener>> = new Map();

  public static getInstance(): PhysicalEventBus {
    if (!PhysicalEventBus.instance) {
      PhysicalEventBus.instance = new PhysicalEventBus();
    }
    return PhysicalEventBus.instance;
  }

  public subscribe(type: PhysicalEventType, listener: PhysicalEventListener): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);

    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  public emit(event: PhysicalInteractionEvent) {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(fn => fn(event));
    }
  }
}

export const physicalEventBus = PhysicalEventBus.getInstance();
