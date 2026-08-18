import { RuleEvent } from '../interfaces';
import { EventBus } from '../RulesEngine';
import { MatchDetector, MatchResult } from '../../MatchDetector';
import { TileData } from '../../../types';

export class BaseMatchingRule {
  constructor(private eventBus: EventBus) {
    this.registerListeners();
  }

  private registerListeners() {
    this.eventBus.subscribe('SWAP_SUCCESS', this.onSwapSuccess.bind(this));
    this.eventBus.subscribe('CASCADE_CHECK', this.onCascadeCheck.bind(this));
  }

  private async onSwapSuccess(event: RuleEvent) {
    const { board, cascadeLevel, availableColors } = event.payload;
    await this.detectAndEmitMatches(board, cascadeLevel || 1, availableColors);
  }

  private async onCascadeCheck(event: RuleEvent) {
    const { board, cascadeLevel, availableColors } = event.payload;
    await this.detectAndEmitMatches(board, cascadeLevel || 1, availableColors);
  }

  private async detectAndEmitMatches(board: TileData[][], cascadeLevel: number, availableColors?: string[]) {
    const matchResults: MatchResult[] = MatchDetector.detectMatches(board);

    if (matchResults.length > 0) {
      await this.eventBus.emit({
        type: 'MATCH_DETECTED',
        payload: {
          matches: matchResults,
          board,
          cascadeLevel
        },
        timestamp: Date.now()
      });

      // After emitting detection, immediately resolve them in base logic
      await this.resolveMatches(matchResults, board, cascadeLevel, availableColors);
    } else {
      // No matches, signal cascade end
      await this.eventBus.emit({
        type: 'CASCADE_ENDED',
        payload: { board, cascadeLevel, availableColors },
        timestamp: Date.now()
      });
    }
  }

  private async resolveMatches(matchResults: MatchResult[], board: TileData[][], cascadeLevel: number, availableColors?: string[]) {
    const matchedTiles: TileData[] = [];
    const specialCreations: any[] = [];
    const matchedSet = new Set<string>();

    for (const match of matchResults) {
      for (const cell of match.cells) {
        const tile = board[cell.row][cell.col];
        if (!matchedSet.has(tile.id)) {
          matchedSet.add(tile.id);
          matchedTiles.push(tile);
          tile.isMatched = true; // State mutation for base rule
        }
      }

      if (match.specialCreation !== 'none' && match.specialCreationCoords) {
        specialCreations.push({
          row: match.specialCreationCoords.row,
          col: match.specialCreationCoords.col,
          special: match.specialCreation,
          color: match.specialCreationColor!,
          shape: match.specialCreationShape!
        });
        
        // Emit special creation event for special candy rule system to handle
        await this.eventBus.emit({
          type: 'SPECIAL_CREATED',
          payload: {
            row: match.specialCreationCoords.row,
            col: match.specialCreationCoords.col,
            special: match.specialCreation,
            color: match.specialCreationColor
          },
          timestamp: Date.now()
        });
      }
    }

    await this.eventBus.emit({
      type: 'MATCH_RESOLVED',
      payload: {
        matchedTiles,
        specialCreations,
        board,
        cascadeLevel
      },
      timestamp: Date.now()
    });

    // After all listeners (Blockers, Specials) process MATCH_RESOLVED, we trigger Gravity
    await this.eventBus.emit({
      type: 'GRAVITY',
      payload: { board, cascadeLevel, availableColors }, // GravityMechanics will use default availableColors if not provided
      timestamp: Date.now()
    });
  }
}
