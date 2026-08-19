export type CarromCoinType = 'white' | 'black' | 'queen';

export interface CarromCoinData {
  id: string;
  type: CarromCoinType;
  position: [number, number, number];
  isPocketed: boolean;
}

export type TurnState = 
  | 'IDLE' 
  | 'PLACING_STRIKER' 
  | 'AIMING' 
  | 'POWER' 
  | 'SHOOTING' 
  | 'PHYSICS_ACTIVE' 
  | 'RESOLVING' 
  | 'GAME_OVER';

export interface CarromPlayer {
  id: string;
  name: string;
  color: 'white' | 'black';
  score: number;
}
