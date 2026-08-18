import { LevelDefinition, DifficultyProfile, MechanicDefinition } from '../rules/interfaces';
import { TileData, CandyColor } from '../../types';
import { mechanicRegistry } from '../rules/MechanicRegistry';

export class LevelGenerator {
  
  /**
   * Generates a fully normalized level definition based on a target difficulty profile.
   * This is the entry point for the AI / Procedural generation paths.
   */
  public static generate(
    levelNumber: number,
    profile: DifficultyProfile,
    seed: string = Math.random().toString(36).substring(2)
  ): LevelDefinition {
    
    // 1. Determine Board Dimensions based on complexity budget
    const dimensions = this.calculateDimensions(profile.complexityBudget);
    
    // 2. Select Mechanics (Blockers, Objectives, Gravity changes) that fit the budget
    const selectedMechanics = this.selectMechanics(profile);
    
    // 3. Generate Board Topology (holes, portals, shape)
    const emptyBoard = this.generateTopology(dimensions.rows, dimensions.cols, profile);

    // 4. Place objectives (e.g. Jelly, Ingredients)
    this.placeObjectives(emptyBoard, selectedMechanics, profile);

    // 5. Place blockers (e.g. Frosting, Chocolate)
    this.placeBlockers(emptyBoard, selectedMechanics, profile);

    // 6. Return a normalized definition
    return {
      id: `level_${levelNumber}_${seed}`,
      seed,
      rulesVersion: '2.0.0',
      board: emptyBoard,
      objectives: selectedMechanics.filter(m => m.category.includes('OBJECTIVE')),
      mechanics: selectedMechanics,
      blockers: selectedMechanics.filter(m => m.category.includes('BLOCKER')),
      specialRules: [],
      gravity: { default: 'DOWN' },
      portals: [],
      conveyors: [],
      difficulty: profile.targetDifficulty,
      complexity: profile.complexityBudget,
      fairness: 1.0, // Will be computed by FairnessEvaluator
      world: `World_${Math.ceil(levelNumber / 15)}`,
      metadata: {
        dna: this.computeDNA(selectedMechanics),
        fingerprint: seed
      }
    };
  }

  private static calculateDimensions(budget: number): { rows: number, cols: number } {
    if (budget < 10) return { rows: 6, cols: 6 };
    if (budget < 30) return { rows: 8, cols: 8 };
    return { rows: 9, cols: 9 };
  }

  private static selectMechanics(profile: DifficultyProfile): MechanicDefinition[] {
    const all = mechanicRegistry.getAll();
    const selected: MechanicDefinition[] = [];
    let currentComplexity = 0;

    // Shuffle and pick mechanics until budget is reached
    const shuffled = all.sort(() => 0.5 - Math.random());
    
    for (const mechanic of shuffled) {
      if (mechanic.minimumDifficulty <= profile.targetDifficulty) {
        if (currentComplexity + mechanic.complexityCost <= profile.complexityBudget) {
          selected.push(mechanic);
          currentComplexity += mechanic.complexityCost;
        }
      }
    }
    return selected;
  }

  private static generateTopology(rows: number, cols: number, profile: DifficultyProfile): any[][] {
    const board = Array.from({ length: rows }, (_, r) => 
      Array.from({ length: cols }, (_, c) => ({
        row: r, col: c,
        type: 'CELL', // Normalized cell container
        content: null, // Candy / Blocker
        jelly: 0,
        portal: null,
        isVoid: false // For holes in the board
      }))
    );
    return board;
  }

  private static placeObjectives(board: any[][], mechanics: MechanicDefinition[], profile: DifficultyProfile) {
    const hasJelly = mechanics.some(m => m.id === 'mech_jelly' || m.category.includes('OBJECTIVE'));
    if (!hasJelly) return;

    const rows = board.length;
    const cols = board[0].length;
    const jellyCount = Math.min(rows * cols, Math.floor(10 + profile.complexityBudget * 1.5));
    
    let placed = 0;
    while (placed < jellyCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!board[r][c].isVoid && board[r][c].jelly < 2) {
        board[r][c].jelly += 1;
        placed++;
      }
    }
  }

  private static placeBlockers(board: any[][], mechanics: MechanicDefinition[], profile: DifficultyProfile) {
    const blockerMechanics = mechanics.filter(m => m.category.includes('BLOCKER'));
    if (blockerMechanics.length === 0) return;

    const rows = board.length;
    const cols = board[0].length;
    // Don't place blockers in top 2 rows to allow candies to fall
    const placeableRows = Math.max(1, rows - 2); 
    const blockerCount = Math.floor(profile.targetDifficulty * 2.5);

    let placed = 0;
    for (let i = 0; i < blockerCount * 2 && placed < blockerCount; i++) {
      const r = 2 + Math.floor(Math.random() * placeableRows);
      const c = Math.floor(Math.random() * cols);
      
      if (!board[r][c].isVoid && board[r][c].content === null) {
        // Pick a random blocker mechanic
        const m = blockerMechanics[Math.floor(Math.random() * blockerMechanics.length)];
        board[r][c].content = {
          type: 'BLOCKER',
          id: m.id,
          layers: m.id === 'mech_frosting' ? 2 : 1
        };
        placed++;
      }
    }
  }

  private static computeDNA(mechanics: MechanicDefinition[]): string {
    return mechanics.map(m => m.id.substring(0, 3)).join('-');
  }
}
