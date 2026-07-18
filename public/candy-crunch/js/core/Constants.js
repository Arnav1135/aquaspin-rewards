export const COLORS = ['red', 'orange', 'yellow', 'green', 'blue', 'purple'];

export const COLOR_PALETTE = {
  red:    { primary: '#ff2233', mid: '#cc0011', dark: '#7a0008', light: '#ff9999', glow: 'rgba(255,30,60,0.8)' },
  orange: { primary: '#ff7700', mid: '#dd5500', dark: '#883300', light: '#ffcc88', glow: 'rgba(255,120,0,0.8)' },
  yellow: { primary: '#ffdd00', mid: '#d4aa00', dark: '#886600', light: '#fff099', glow: 'rgba(255,220,0,0.8)' },
  green:  { primary: '#22cc44', mid: '#009922', dark: '#005511', light: '#aaffbb', glow: 'rgba(30,200,60,0.8)' },
  blue:   { primary: '#0099ff', mid: '#0066cc', dark: '#003380', light: '#99ddff', glow: 'rgba(0,150,255,0.8)' },
  purple: { primary: '#cc22ff', mid: '#8800cc', dark: '#440066', light: '#ee99ff', glow: 'rgba(180,0,255,0.8)' },
};

export const CELL_TYPES = {
  NORMAL: 'normal',
  BLOCKER: 'blocker',
  EMPTY: 'empty'
};

export const CANDY_TYPES = {
  NORMAL: 'normal',
  STRIPE_H: 'stripe_h',
  STRIPE_V: 'stripe_v',
  WRAPPED: 'wrapped',
  BOMB: 'bomb',
  FISH: 'fish',
  TIMER: 'timer'
};

export const BLOCKER_TYPES = {
  FROSTING: 'frosting',
  CHOCOLATE: 'chocolate',
  LICORICE: 'licorice'
};

export const LAYER_TYPES = {
  JELLY: 'jelly',
  ICE: 'ice',
  CHAIN: 'chain',
  LOCK: 'lock',
  GROUND: 'ground'
};

export const ANIM = {
  SWAP: 220,
  REVERT: 200,
  CLEAR: 350,
  FALL: 260,
  SPAWN: 300,
  SPECIAL: 180,
  CASCADE: 80
};

export const SCORING = {
  BASE_3: 3,
  BASE_4: 4,
  BASE_5: 5,
  BASE_SPECIAL: 10,
  COMBO_BONUS: 50
};
