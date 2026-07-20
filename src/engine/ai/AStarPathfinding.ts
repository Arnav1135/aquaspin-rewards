// src/engine/ai/AStarPathfinding.ts

export interface GridPoint {
  x: number;
  y: number;
}

export class AStarGrid {
  private width: number;
  private height: number;
  private obstacles: Set<string> = new Set();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public setObstacle(x: number, y: number, isObstacle: boolean) {
    const key = `${x},${y}`;
    if (isObstacle) {
      this.obstacles.add(key);
    } else {
      this.obstacles.delete(key);
    }
  }

  public isObstacle(x: number, y: number): boolean {
    return this.obstacles.has(`${x},${y}`);
  }

  public findPath(start: GridPoint, target: GridPoint): GridPoint[] {
    const openSet: GridPoint[] = [start];
    const cameFrom = new Map<string, GridPoint>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const key = (p: GridPoint) => `${p.x},${p.y}`;

    gScore.set(key(start), 0);
    fScore.set(key(start), this.heuristic(start, target));

    while (openSet.length > 0) {
      // Find node with lowest fScore
      let current = openSet[0];
      let lowestF = fScore.get(key(current)) ?? Infinity;

      for (let i = 1; i < openSet.length; i++) {
        const score = fScore.get(key(openSet[i])) ?? Infinity;
        if (score < lowestF) {
          lowestF = score;
          current = openSet[i];
        }
      }

      if (current.x === target.x && current.y === target.y) {
        // Reconstruct path
        const path: GridPoint[] = [current];
        let currKey = key(current);
        while (cameFrom.has(currKey)) {
          current = cameFrom.get(currKey)!;
          currKey = key(current);
          path.unshift(current);
        }
        return path;
      }

      const idx = openSet.indexOf(current);
      openSet.splice(idx, 1);

      const neighbors = this.getNeighbors(current);
      for (const neighbor of neighbors) {
        const nKey = key(neighbor);
        const tentativeG = (gScore.get(key(current)) ?? Infinity) + 1;

        if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
          cameFrom.set(nKey, current);
          gScore.set(nKey, tentativeG);
          fScore.set(nKey, tentativeG + this.heuristic(neighbor, target));

          if (!openSet.some((p) => p.x === neighbor.x && p.y === neighbor.y)) {
            openSet.push(neighbor);
          }
        }
      }
    }

    return []; // No path found
  }

  private heuristic(a: GridPoint, b: GridPoint): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private getNeighbors(p: GridPoint): GridPoint[] {
    const dirs = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 },
    ];
    const neighbors: GridPoint[] = [];

    for (const d of dirs) {
      const nx = p.x + d.x;
      const ny = p.y + d.y;
      if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && !this.isObstacle(nx, ny)) {
        neighbors.push({ x: nx, y: ny });
      }
    }

    return neighbors;
  }
}
