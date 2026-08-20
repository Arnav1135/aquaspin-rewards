import { TileData, CandyColor, CandyShape, SpecialType } from '../types';

export type MatchShapeType = '3-horizontal' | '3-vertical' | '4-horizontal' | '4-vertical' | '5-horizontal' | '5-vertical' | 'L' | 'T' | 'cross' | 'multiple';

export interface MatchResult {
  cells: { row: number; col: number }[];
  type: MatchShapeType;
  size: number;
  specialCreation: SpecialType;
  specialCreationColor: CandyColor | null;
  specialCreationShape: CandyShape | null;
  specialCreationCoords: { row: number; col: number } | null;
}

export class MatchDetector {
  /**
   * Scans the board for all matches and returns an array of structured match results.
   * Matches are grouped into shapes (L, T, cross, lines).
   */
  public static detectMatches(board: TileData[][]): MatchResult[] {
    const rows = board.length;
    const cols = board[0].length;
    const horizLines: { r: number; c: number; len: number; color: CandyColor; tiles: {row: number, col: number}[] }[] = [];
    const vertLines: { r: number; c: number; len: number; color: CandyColor; tiles: {row: number, col: number}[] }[] = [];

    // 1. Find all horizontal lines >= 3
    for (let r = 0; r < rows; r++) {
      let matchLen = 1;
      let tiles = [{row: r, col: 0}];
      for (let c = 0; c < cols; c++) {
        const current = board[r][c];
        const next = c < cols - 1 ? board[r][c + 1] : null;
        
        const isNextSame = next && current.blocker === 'none' && next.blocker === 'none' && current.color === next.color && current.color !== undefined;

        if (isNextSame) {
          matchLen++;
          tiles.push({row: r, col: c + 1});
        } else {
          if (matchLen >= 3) {
            horizLines.push({
              r,
              c: c - matchLen + 1,
              len: matchLen,
              color: current.color,
              tiles: [...tiles]
            });
          }
          matchLen = 1;
          tiles = next ? [{row: r, col: c + 1}] : [];
        }
      }
    }

    // 2. Find all vertical lines >= 3
    for (let c = 0; c < cols; c++) {
      let matchLen = 1;
      let tiles = [{row: 0, col: c}];
      for (let r = 0; r < rows; r++) {
        const current = board[r][c];
        const next = r < rows - 1 ? board[r + 1][c] : null;
        
        const isNextSame = next && current.blocker === 'none' && next.blocker === 'none' && current.color === next.color && current.color !== undefined;

        if (isNextSame) {
          matchLen++;
          tiles.push({row: r + 1, col: c});
        } else {
          if (matchLen >= 3) {
            vertLines.push({
              r: r - matchLen + 1,
              c,
              len: matchLen,
              color: current.color,
              tiles: [...tiles]
            });
          }
          matchLen = 1;
          tiles = next ? [{row: r + 1, col: c}] : [];
        }
      }
    }

    // 3. Intersect lines to find L, T, cross shapes
    const results: MatchResult[] = [];
    const usedHoriz = new Set<number>();
    const usedVert = new Set<number>();

    for (let hIdx = 0; hIdx < horizLines.length; hIdx++) {
      for (let vIdx = 0; vIdx < vertLines.length; vIdx++) {
        const h = horizLines[hIdx];
        const v = vertLines[vIdx];

        if (h.color === v.color) {
          // Check intersection
          const intersectRow = v.r <= h.r && h.r < v.r + v.len;
          const intersectCol = h.c <= v.c && v.c < h.c + h.len;

          if (intersectRow && intersectCol) {
            // Found intersection
            usedHoriz.add(hIdx);
            usedVert.add(vIdx);

            const allTilesMap = new Map<string, {row: number, col: number}>();
            h.tiles.forEach(t => allTilesMap.set(`${t.row},${t.col}`, t));
            v.tiles.forEach(t => allTilesMap.set(`${t.row},${t.col}`, t));

            const cells = Array.from(allTilesMap.values());
            
            // Determine type (cross, T, L)
            const isMidHoriz = h.c < v.c && v.c < h.c + h.len - 1;
            const isMidVert = v.r < h.r && h.r < v.r + v.len - 1;
            
            let shapeType: MatchShapeType = 'L';
            if (isMidHoriz && isMidVert) shapeType = 'cross';
            else if (isMidHoriz || isMidVert) shapeType = 'T';

            results.push({
              cells,
              type: shapeType,
              size: cells.length,
              specialCreation: 'wrapped',
              specialCreationColor: h.color,
              specialCreationShape: board[h.r][v.c].shape,
              specialCreationCoords: { row: h.r, col: v.c }
            });
          }
        }
      }
    }

    // 4. Process remaining independent lines
    for (let hIdx = 0; hIdx < horizLines.length; hIdx++) {
      if (!usedHoriz.has(hIdx)) {
        const h = horizLines[hIdx];
        let specialCreation: SpecialType = 'none';
        let specialCoords = null;
        const type: MatchShapeType = h.len === 3 ? '3-horizontal' : h.len === 4 ? '4-horizontal' : '5-horizontal';
        
        if (h.len >= 5) {
          specialCreation = 'color-bomb';
          specialCoords = { row: h.r, col: h.c + 2 }; // Center
        } else if (h.len === 4) {
          specialCreation = 'striped-v'; // Horiz match makes vertical striped
          specialCoords = { row: h.r, col: h.c + 1 };
        }

        results.push({
          cells: h.tiles,
          type,
          size: h.len,
          specialCreation,
          specialCreationColor: h.color,
          specialCreationShape: specialCoords ? board[specialCoords.row][specialCoords.col].shape : null,
          specialCreationCoords: specialCoords
        });
      }
    }

    for (let vIdx = 0; vIdx < vertLines.length; vIdx++) {
      if (!usedVert.has(vIdx)) {
        const v = vertLines[vIdx];
        let specialCreation: SpecialType = 'none';
        let specialCoords = null;
        const type: MatchShapeType = v.len === 3 ? '3-vertical' : v.len === 4 ? '4-vertical' : '5-vertical';
        
        if (v.len >= 5) {
          specialCreation = 'color-bomb';
          specialCoords = { row: v.r + 2, col: v.c }; // Center
        } else if (v.len === 4) {
          specialCreation = 'striped-h'; // Vert match makes horizontal striped
          specialCoords = { row: v.r + 1, col: v.c };
        }

        results.push({
          cells: v.tiles,
          type,
          size: v.len,
          specialCreation,
          specialCreationColor: v.color,
          specialCreationShape: specialCoords ? board[specialCoords.row][specialCoords.col].shape : null,
          specialCreationCoords: specialCoords
        });
      }
    }

    return results;
  }
}
