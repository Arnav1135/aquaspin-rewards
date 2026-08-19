export type TubeData = number[];

export interface TubeMetadata {
  isLocked: boolean; // Cannot pour in or out
  frozenLayers: number; // Number of frozen layers at the top (can't pour out, can't pour matching color if frozen)
  portalTarget: number | null; // Index of the connected tube
}

export class WaterSortRulesEngine {
  /**
   * Helper to resolve the actual target tube index for pouring.
   */
  static resolveTarget(targetIndex: number, metadata?: TubeMetadata[]): number {
    if (!metadata || !metadata[targetIndex]) return targetIndex;
    if (metadata[targetIndex].portalTarget !== null) {
      return metadata[targetIndex].portalTarget!;
    }
    return targetIndex;
  }

  /**
   * Checks if a pour from source to target is valid.
   */
  static canPour(tubes: TubeData[], sourceIndex: number, targetIndex: number, capacity: number, metadata?: TubeMetadata[]): boolean {
    if (sourceIndex === targetIndex) return false;
    
    // Check Source constraints
    if (metadata && metadata[sourceIndex]) {
      if (metadata[sourceIndex].isLocked) return false;
      if (metadata[sourceIndex].frozenLayers > 0) return false; // Frozen top prevents pouring out
    }

    const resolvedTargetIndex = this.resolveTarget(targetIndex, metadata);
    if (sourceIndex === resolvedTargetIndex) return false; // Portaled to itself is invalid

    // Check Target constraints
    if (metadata && metadata[resolvedTargetIndex]) {
      if (metadata[resolvedTargetIndex].isLocked) return false;
    }

    const source = tubes[sourceIndex];
    const target = tubes[resolvedTargetIndex];

    if (source.length === 0) return false;
    if (target.length === capacity) return false;

    const sourceTop = source[source.length - 1];
    const targetTop = target[target.length - 1];

    if (target.length === 0) {
      return true;
    }
    
    // If target has frozen layers, we can't pour the same color to stack it, 
    // unless the game specifically requires hot liquid to melt it. For now, frozen caps act as walls.
    if (metadata && metadata[resolvedTargetIndex] && metadata[resolvedTargetIndex].frozenLayers > 0) {
      return false; 
    }

    if (targetTop === sourceTop) {
      return true;
    }
    return false;
  }

  /**
   * Calculates how many blocks will be poured.
   */
  static getPourAmount(tubes: TubeData[], sourceIndex: number, targetIndex: number, capacity: number, metadata?: TubeMetadata[]): number {
    if (!this.canPour(tubes, sourceIndex, targetIndex, capacity, metadata)) return 0;
    
    const resolvedTargetIndex = this.resolveTarget(targetIndex, metadata);
    const source = tubes[sourceIndex];
    const target = tubes[resolvedTargetIndex];
    const color = source[source.length - 1];

    let movedCount = 0;
    let s = [...source];
    let tLength = target.length;

    while (s.length > 0 && tLength < capacity && s[s.length - 1] === color) {
      s.pop();
      tLength++;
      movedCount++;
    }

    return movedCount;
  }

  /**
   * Returns a new tubes state after applying the pour.
   * Also optionally returns updated metadata (e.g. melting ice).
   */
  static applyPour(tubes: TubeData[], sourceIndex: number, targetIndex: number, capacity: number, metadata?: TubeMetadata[]): { nextTubes: TubeData[], nextMetadata?: TubeMetadata[] } {
    const nextTubes = tubes.map(t => [...t]);
    const nextMetadata = metadata ? metadata.map(m => ({ ...m })) : undefined;

    const resolvedTargetIndex = this.resolveTarget(targetIndex, metadata);
    const source = nextTubes[sourceIndex];
    const target = nextTubes[resolvedTargetIndex];
    const color = source[source.length - 1];

    while (
      source.length > 0 && 
      target.length < capacity && 
      (target.length === 0 || target[target.length - 1] === color) &&
      source[source.length - 1] === color
    ) {
      target.push(source.pop()!);
    }

    return { nextTubes, nextMetadata };
  }

  /**
   * Checks if the entire board is solved.
   */
  static isSolved(tubes: TubeData[], capacity: number): boolean {
    if (tubes.length === 0) return false;
    return tubes.every(tube => 
      tube.length === 0 || (tube.length === capacity && tube.every(c => c === tube[0]))
    );
  }
}
