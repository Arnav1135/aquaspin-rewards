// Complete Match-3 Game Implementation - Following Official Rulebook
// This file integrates the game into the main app

import { Match3Game } from '@/games/match3';

export function Match3GamePage() {
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <Match3Game onClose={() => window.history.back()} />
    </div>
  );
}

export default Match3GamePage;
