import { LevelGenerator, LevelGenerationOptions } from './LevelGenerator';
import { LevelQA, QAReport } from './LevelQA';
import { AiLevelCritic, CritiqueReport } from './AiLevelCritic';
import { SeededRandom } from './SeededRandom';

export interface LevelDNA {
  seed: string;
  levelNumber: number;
  generatorVersion: string;
  rulesVersion: string;
  tubeCount: number;
  colorCount: number;
  capacity: number;
  emptyTubeCount: number;
  difficultyTarget: number;
  visualTheme: string;
}

export interface FactoryOutput {
  status: 'ACCEPTED' | 'REJECTED';
  dna: LevelDNA;
  tubes: number[][];
  qaReport: QAReport;
  criticReport: CritiqueReport;
  rejectReason?: string;
}

export class WaterSortFactory {
  private static readonly MAX_CANDIDATE_ATTEMPTS = 50;
  
  static generateLevel(dna: LevelDNA): FactoryOutput {
    // Pipeline:
    // LEVEL REQUEST -> LEVEL DNA -> CANDIDATE GENERATION -> SOLVER -> SIMULATOR ->
    // DIFFICULTY ANALYSIS -> NOVELTY ANALYSIS -> FAIRNESS ANALYSIS ->
    // VISUAL READABILITY -> PERFORMANCE PREDICTION -> AI CRITIC -> APPROVE / REJECT

    const generatorVersion = "1.0.0";
    let attempts = 0;

    while (attempts < this.MAX_CANDIDATE_ATTEMPTS) {
      attempts++;
      
      // We mutate the seed on each attempt so we get different candidates
      const currentSeed = `${dna.seed}_attempt_${attempts}`;
      const rng = new SeededRandom(currentSeed);

      // 1. CANDIDATE GENERATION

      const genStart = performance.now();
      let levelDef;
      try {
        levelDef = LevelGenerator.generate(
          dna.difficultyTarget,
          dna.colorCount,
          dna.tubeCount,
          dna.capacity,
          currentSeed
        );
      } catch (e) {
        continue; // Generator failed structurally, try next candidate
      }
      const genTime = performance.now() - genStart;
      const tubes = levelDef.initialConfiguration;

      // 2. SOLVER VALIDATION & SIMULATION (via LevelQA)
      // 3. DIFFICULTY ANALYSIS (via LevelQA)
      const qaReport = LevelQA.runPipeline(tubes, dna.difficultyTarget, genTime);
      
      if (!qaReport.passed) {
        continue; // Failed QA (unsolvable, wrong difficulty, etc)
      }

      // 4. FAIRNESS ANALYSIS & AI CRITIC
      const criticReport = AiLevelCritic.evaluateLevel(tubes, dna.difficultyTarget);
      
      if (criticReport.status === 'FAIL') {
        continue; // Mathematical critique failed
      }

      // 5. APPROVE
      // If we got here, the candidate survived the entire gauntlet
      return {
        status: 'ACCEPTED',
        dna: { ...dna, seed: currentSeed }, // Store the successful seed
        tubes,
        qaReport,
        criticReport
      };
    }

    // 7. REJECT
    return {
      status: 'REJECTED',
      dna,
      tubes: [],
      qaReport: { 
        passed: false, structuralCheck: false, solvable: false, solutionVerified: false, 
        difficultyCheck: false, dnaCheck: false, metrics: { generationTimeMs: 0, solveTimeMs: 0, solutionLength: 0, searchComplexity: 0 } 
      },
      criticReport: { status: 'FAIL', score: 0, feedback: ['Exhausted all candidate attempts.'] },
      rejectReason: `Exhausted ${this.MAX_CANDIDATE_ATTEMPTS} candidate attempts.`
    };
  }
}
