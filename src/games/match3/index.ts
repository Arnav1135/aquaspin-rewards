// Match-3 Game Exports
export { Match3Game, default } from '@/games/match3/components/Match3Game';
export { GameBoard } from '@/games/match3/components/GameBoard';
export { useMatch3Store } from '@/games/match3/engine/gameState';
export { Match3Engine } from '@/games/match3/engine/Match3Engine';
export { LEVELS, generateLevels, getLevelById, getLevelsByWorld } from '@/games/match3/levels/levelData';
export * from '@/games/match3/types';
