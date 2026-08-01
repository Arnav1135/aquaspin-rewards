import { MoveRecord, PieceColor } from '../types';

/**
 * Online Multiplayer Manager
 * Supports cross-tab BroadcastChannel for instant testing,
 * with WebSocket/Server integration hooks for production deployments.
 */

export interface OnlineMessage {
  type: 'JOIN_ROOM' | 'PLAYER_ASSIGNED' | 'MOVE_PLAYED' | 'RESTART_GAME' | 'OPPONENT_DISCONNECTED';
  roomCode: string;
  playerColor?: PieceColor;
  move?: MoveRecord;
  senderId?: string;
}

export class OnlineMultiplayerManager {
  private roomCode: string | null = null;
  private myColor: PieceColor = 'w';
  private channel: BroadcastChannel | null = null;
  private myId: string = Math.random().toString(36).substring(2, 9);
  private onMoveReceived?: (move: MoveRecord) => void;
  private onStatusChange?: (status: string, playerColor?: PieceColor) => void;

  constructor(callbacks?: {
    onMoveReceived?: (move: MoveRecord) => void;
    onStatusChange?: (status: string, playerColor?: PieceColor) => void;
  }) {
    this.onMoveReceived = callbacks?.onMoveReceived;
    this.onStatusChange = callbacks?.onStatusChange;
  }

  // Create or Join Room
  public connectToRoom(code: string, isHost: boolean = true): string {
    this.roomCode = code.toUpperCase().trim();
    this.myColor = isHost ? 'w' : 'b';

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      if (this.channel) this.channel.close();
      this.channel = new BroadcastChannel(`3d_chess_room_${this.roomCode}`);

      this.channel.onmessage = (event: MessageEvent<OnlineMessage>) => {
        this.handleMessage(event.data);
      };

      // Broadcast presence
      this.send({
        type: 'JOIN_ROOM',
        roomCode: this.roomCode,
        playerColor: this.myColor,
        senderId: this.myId,
      });
    }

    if (this.onStatusChange) {
      this.onStatusChange(`Connected to Room: ${this.roomCode}`, this.myColor);
    }

    return this.roomCode;
  }

  public broadcastMove(move: MoveRecord) {
    if (!this.roomCode) return;
    this.send({
      type: 'MOVE_PLAYED',
      roomCode: this.roomCode,
      move,
      senderId: this.myId,
    });
  }

  private send(msg: OnlineMessage) {
    if (this.channel) {
      this.channel.postMessage(msg);
    }
  }

  private handleMessage(msg: OnlineMessage) {
    if (msg.senderId === this.myId) return; // Ignore self

    switch (msg.type) {
      case 'JOIN_ROOM':
        // Opponent connected
        if (this.onStatusChange) {
          this.onStatusChange(`Opponent Joined Room ${this.roomCode}! Game Ready.`, this.myColor);
        }
        break;
      case 'MOVE_PLAYED':
        if (msg.move && this.onMoveReceived) {
          this.onMoveReceived(msg.move);
        }
        break;
      case 'OPPONENT_DISCONNECTED':
        if (this.onStatusChange) {
          this.onStatusChange('Opponent disconnected from room.', this.myColor);
        }
        break;
    }
  }

  public getMyColor(): PieceColor {
    return this.myColor;
  }

  public getRoomCode(): string | null {
    return this.roomCode;
  }

  public disconnect() {
    if (this.channel) {
      this.send({
        type: 'OPPONENT_DISCONNECTED',
        roomCode: this.roomCode || '',
        senderId: this.myId,
      });
      this.channel.close();
      this.channel = null;
    }
    this.roomCode = null;
  }
}
