export class LevelGen {
  constructor() {
    this.playerHistory = []; // Array of results: { levelNum, win, movesLeft, score, target, failureStreak }
    this.failureStreak = 0;
  }

  recordResult(levelNum, win, score, target, movesLeft, movesTotal) {
    if (win) {
      this.failureStreak = 0;
    } else {
      this.failureStreak++;
    }

    this.playerHistory.push({
      levelNum,
      win,
      score,
      target,
      movesUsed: movesTotal - movesLeft,
      movesTotal,
      failureStreak: this.failureStreak
    });

    if (this.playerHistory.length > 10) {
      this.playerHistory.shift();
    }
  }

  generate(levelNum) {
    const phase = Math.floor((levelNum - 1) / 5); // Increase complexity every 5 levels
    
    // Calculate adaptive difficulty multiplier based on failure streak
    let difficultyMultiplier = 1.0;
    if (this.failureStreak >= 5) {
      difficultyMultiplier = 0.75; // Significantly easier color distributions and score targets
    } else if (this.failureStreak >= 3) {
      difficultyMultiplier = 0.85;
    } else if (this.failureStreak >= 1) {
      difficultyMultiplier = 0.95;
    }

    // Grid dimensions
    const gridW = Math.min(10, 7 + Math.min(phase, 2));
    const gridH = gridW;

    // Base target moves and score target
    const baseMoves = Math.max(15, 30 - phase * 2);
    const moves = Math.round(baseMoves / difficultyMultiplier); // More moves if failing

    const baseTarget = 800 + phase * 1200 + levelNum * 300;
    const target = Math.round(baseTarget * difficultyMultiplier);

    // Objectives
    let objective = 'score';
    if (levelNum >= 3 && levelNum % 3 === 0) objective = 'jelly';
    if (levelNum >= 5 && levelNum % 5 === 0) objective = 'blocker';

    // Blocker densities
    const frostingDensity = objective === 'blocker' ? 0.15 + phase * 0.05 : 0.05 + phase * 0.03;
    const chocolateDensity = levelNum >= 4 ? 0.05 + phase * 0.02 : 0;
    const licoriceDensity = levelNum >= 6 ? 0.05 + phase * 0.02 : 0;

    // Jelly Region
    const jellyRegion = [];
    if (objective === 'jelly') {
      const margin = Math.max(1, Math.floor(gridW * 0.2));
      for (let r = margin; r < gridH - margin; r++) {
        for (let c = margin; c < gridW - margin; c++) {
          jellyRegion.push(r * gridW + c);
        }
      }
    }

    // Portals
    const portals = [];
    if (levelNum >= 8 && levelNum % 4 === 0) {
      // Add a couple of portals linking top/bottom or sides
      portals.push({ source: 0, target: gridW * gridH - 1 });
      portals.push({ source: gridW - 1, target: gridW * gridH - gridW });
    }

    // Color count (easier color distribution if failing)
    let colourCount = Math.min(6, 4 + Math.floor(phase / 2));
    if (this.failureStreak >= 4) {
      colourCount = Math.max(4, colourCount - 1); // Drop 1 color to make matches easier
    }

    // Gravity direction
    const gravityDir = (phase >= 3 && levelNum % 6 === 0) ? 'up' : 'down';

    return {
      levelNum,
      gridW,
      gridH,
      moves,
      target,
      objective,
      jellyRegion,
      portals,
      frostingDensity,
      chocolateDensity,
      licoriceDensity,
      colourCount,
      gravityDir,
      stars: [target, Math.round(target * 1.5), Math.round(target * 2.2)],
      ddaHelp: this.failureStreak >= 3 // Helper flag to increase cascade prediction boosts
    };
  }
}
