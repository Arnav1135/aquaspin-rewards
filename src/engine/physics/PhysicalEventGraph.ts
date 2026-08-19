import * as THREE from 'three';
import { UniversalMaterialType } from './InteractionEvents';

export interface PhysicalGraphEventPayload {
  id: string;
  timestamp: number;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  velocity: THREE.Vector3;
  strength: number;
  mass: number;
  material: UniversalMaterialType;
  colorHex: number;
  radius: number;
  source: string;
  metadata?: Record<string, any>;
}

export class PhysicalEventGraph {
  private static instance: PhysicalEventGraph;
  private subscribers: ((event: PhysicalGraphEventPayload) => void)[] = [];

  public static getInstance(): PhysicalEventGraph {
    if (!PhysicalEventGraph.instance) {
      PhysicalEventGraph.instance = new PhysicalEventGraph();
    }
    return PhysicalEventGraph.instance;
  }

  public subscribe(handler: (event: PhysicalGraphEventPayload) => void): () => void {
    this.subscribers.push(handler);
    return () => {
      this.subscribers = this.subscribers.filter(h => h !== handler);
    };
  }

  // Phase 1: Physical Event Translation & Graph Dispatch
  public dispatch(payload: PhysicalGraphEventPayload) {
    this.subscribers.forEach(handler => handler(payload));
  }
}

export const physicalEventGraph = PhysicalEventGraph.getInstance();
