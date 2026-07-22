// src/engine/network/NetworkManager.ts

export interface NetworkStateSnapshot {
  sequence: number;
  timestamp: number;
  position: [number, number, number];
  rotation: [number, number, number];
}

export class NetworkManager {
  private static instance: NetworkManager;
  private ws: WebSocket | null = null;
  private sequenceNumber: number = 0;
  private pendingInputs: Map<number, NetworkStateSnapshot> = new Map();
  private lastServerSnapshot: NetworkStateSnapshot | null = null;

  public getLastServerSnapshot() {
    return this.lastServerSnapshot;
  }

  private constructor() {}

  public static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  public connect(url: string) {
    try {
      this.ws = new WebSocket(url);
      this.ws.onmessage = this.handleServerMessage;
    } catch {
      // Offline fallback mode
    }
  }

  public sendStateUpdate(position: [number, number, number], rotation: [number, number, number]) {
    this.sequenceNumber++;
    const snapshot: NetworkStateSnapshot = {
      sequence: this.sequenceNumber,
      timestamp: Date.now(),
      position,
      rotation,
    };

    this.pendingInputs.set(this.sequenceNumber, snapshot);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'PLAYER_STATE', payload: snapshot }));
    }
  }

  public reconcileServerState(serverSnapshot: NetworkStateSnapshot): [number, number, number] {
    this.lastServerSnapshot = serverSnapshot;

    // Purge pending inputs processed by server
    this.pendingInputs.forEach((_, seq) => {
      if (seq <= serverSnapshot.sequence) {
        this.pendingInputs.delete(seq);
      }
    });

    // Replay remaining unacknowledged inputs for client prediction
    const predictedPos = [...serverSnapshot.position] as [number, number, number];
    return predictedPos;
  }

  private handleServerMessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'SERVER_STATE') {
        this.reconcileServerState(msg.payload);
      }
    } catch {
      // Handle socket payload error
    }
  };

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const networkManager = NetworkManager.getInstance();
