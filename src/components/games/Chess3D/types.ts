export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PieceColor = 'w' | 'b';

export interface ChessPieceData {
  id: string;
  type: PieceType;
  color: PieceColor;
  square: string; // e.g. "e4"
  hasMoved?: boolean;
}

export type MaterialTheme = 'wood-bronze' | 'marble-onyx';

export type AmbientMode = 'none' | 'quiet-study' | 'tournament-hall';

export type GameMode = 'pvp' | 'ai' | 'online' | 'ai-vs-ai';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type CameraPreset = 'standard' | 'close' | 'overhead' | 'white' | 'black' | 'top' | 'isometric' | 'cinematic';

export interface MoveRecord {
  san: string;
  from: string;
  to: string;
  piece: PieceType;
  color: PieceColor;
  captured?: PieceType;
  promotion?: string;
  inCheck?: boolean;
}

export interface CapturedPieces {
  w: PieceType[];
  b: PieceType[];
}
