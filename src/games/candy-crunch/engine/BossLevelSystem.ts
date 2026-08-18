import { TileData } from '../types';

export interface BossData {
  id: string;
  name: string;
  maxHp: number;
  currentHp: number;
  position: { row: number, col: number, span: number }; // Top-left cell and how many cells it spans (e.g. span 3 = 3x3)
  type: 'chocolate-golem' | 'gummy-dragon';
}

export class BossLevelSystem {
  /**
   * Initializes a boss for the level.
   */
  public static spawnBoss(type: 'chocolate-golem' | 'gummy-dragon', row: number, col: number): BossData {
    return {
      id: `boss-${Date.now()}`,
      name: type === 'chocolate-golem' ? 'Giant Chocolate Golem' : 'Gummy Dragon',
      maxHp: type === 'chocolate-golem' ? 10000 : 15000,
      currentHp: type === 'chocolate-golem' ? 10000 : 15000,
      position: { row, col, span: 3 }, // 3x3 boss
      type,
    };
  }

  /**
   * Calculates damage to the boss based on matched tiles adjacent to it.
   */
  public static calculateDamage(boss: BossData, matchedTiles: TileData[]): number {
    let damage = 0;
    
    // Calculate bounding box of boss
    const minRow = boss.position.row;
    const maxRow = boss.position.row + boss.position.span - 1;
    const minCol = boss.position.col;
    const maxCol = boss.position.col + boss.position.span - 1;

    for (const tile of matchedTiles) {
      // Check adjacency
      const isAdjacent = (
        (tile.row >= minRow - 1 && tile.row <= maxRow + 1) &&
        (tile.col >= minCol - 1 && tile.col <= maxCol + 1)
      );
      
      if (isAdjacent) {
        // Base damage
        damage += 100;
        
        // Bonus for special candies exploding near boss
        if (tile.special !== 'none') {
          damage += 400;
        }
      }
    }
    
    return damage;
  }
}
