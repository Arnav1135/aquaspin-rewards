import { Token, SAFE_SQUARES, TRACK_COORDS, getPathForColor } from '../../components/games/LudoGame';

export type BotDifficulty = 'Easy' | 'Medium' | 'Hard';

export class LudoBot {
  
  static evaluateBestMove(
    movableTokens: string[],
    dice: number,
    tokens: Token[],
    difficulty: BotDifficulty
  ): string {
    
    // Easy: Completely random move
    if (difficulty === 'Easy') {
      return movableTokens[Math.floor(Math.random() * movableTokens.length)];
    }

    // Medium: 50% chance of making a smart move, 50% chance of random
    if (difficulty === 'Medium') {
      if (Math.random() > 0.5) {
        return movableTokens[Math.floor(Math.random() * movableTokens.length)];
      }
      // Otherwise fallback to hard heuristic below
    }

    // Hard (or the smart 50% of Medium): Heuristic evaluation
    let selectedTokenId = movableTokens[0];
    let bestWeight = -Infinity;

    movableTokens.forEach(tid => {
      const token = tokens.find(t => t.id === tid);
      if (!token) return;
      
      let weight = 0;
      const newPos = token.pos + dice;
      
      // Adaptive Difficulty: Risk Multiplier based on leading player
      const myColor = token.color;
      const myFinished = tokens.filter(t => t.color === myColor && t.finished).length;
      
      let maxOpponentFinished = 0;
      tokens.forEach(t => {
        if (t.color !== myColor && t.finished) {
          const count = tokens.filter(ot => ot.color === t.color && ot.finished).length;
          if (count > maxOpponentFinished) maxOpponentFinished = count;
        }
      });
      
      // If we are behind, we take more risks. If we are ahead, we play safer.
      const riskMultiplier = myFinished < maxOpponentFinished ? 1.5 : (myFinished > maxOpponentFinished ? 0.5 : 1.0);
      const safetyMultiplier = myFinished > maxOpponentFinished ? 1.5 : 1.0;

      // 1. Scoring for entering Home (+100)
      if (newPos === 56) {
        weight += 100 * safetyMultiplier;
      }
      
      // 2. Getting out of yard (+80)
      if (token.home && dice === 6) {
        weight += 80;
      }

      if (!token.home && newPos < 56) {
        const path = getPathForColor(token.color);
        const targetCell = path[newPos];
        
        if (targetCell) {
          const isTargetSafe = SAFE_SQUARES.has(
            TRACK_COORDS.findIndex(c => c[0] === targetCell[0] && c[1] === targetCell[1])
          );

          // 3. Capturing opponent (+90 * riskMultiplier)
          if (!isTargetSafe) {
            const opponents = tokens.filter(other => other.color !== token.color && !other.home && !other.finished);
            const hasOpponent = opponents.some(opp => {
              const oppPath = getPathForColor(opp.color);
              const oppCell = oppPath[opp.pos];
              return oppCell && oppCell[0] === targetCell[0] && oppCell[1] === targetCell[1];
            });
            if (hasOpponent) {
              weight += 90 * riskMultiplier;
            }
          }

          // 4. Landing on a Safe/Star cell (+50 * safetyMultiplier)
          if (isTargetSafe) {
            weight += 50 * safetyMultiplier;
          }
          
          // 5. Danger zone analysis (-50 / riskMultiplier)
          if (!isTargetSafe) {
            const opponents = tokens.filter(other => other.color !== token.color && !other.home && !other.finished);
            const inDanger = opponents.some(opp => {
              const oppPath = getPathForColor(opp.color);
              const oppCell = oppPath[opp.pos];
              if (!oppCell) return false;
              
              const oppGlobalIdx = TRACK_COORDS.findIndex(c => c[0] === oppCell[0] && c[1] === oppCell[1]);
              const myGlobalIdx = TRACK_COORDS.findIndex(c => c[0] === targetCell[0] && c[1] === targetCell[1]);
              
              if (oppGlobalIdx !== -1 && myGlobalIdx !== -1) {
                // Distance from opponent to my new position on the shared track
                const dist = (myGlobalIdx - oppGlobalIdx + 52) % 52;
                if (dist > 0 && dist <= 6) return true;
              }
              return false;
            });
            
            if (inDanger) {
              weight -= 50 / riskMultiplier;
            }
          }
        }
      }
      
      // 6. Default advancement priority (+10 per cell advanced)
      if (weight === 0) {
        weight = 10 + token.pos;
      }
      
      if (weight > bestWeight) {
        bestWeight = weight;
        selectedTokenId = tid;
      }
    });

    return selectedTokenId;
  }
}
