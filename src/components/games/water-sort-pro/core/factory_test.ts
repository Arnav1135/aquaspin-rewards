import { WaterSortFactory, LevelDNA } from './WaterSortFactory';

async function runBenchmark() {
  console.log("==========================================");
  console.log(" WATER SORT AUTONOMOUS FACTORY BENCHMARK  ");
  console.log("==========================================");

  const levelsToTest = [1, 10, 50, 100, 500, 1000, 5000, 10000];

  for (const level of levelsToTest) {
    console.log(`\n--- Generating Level ${level} ---`);
    
    // Scale parameters based on level
    const tubeCount = Math.min(14, 4 + Math.floor(level / 100));
    const emptyTubeCount = 2; // Standard
    const colorCount = tubeCount - emptyTubeCount;
    const capacity = 4;
    const difficultyTarget = Math.min(100, 10 + Math.floor(level / 20)); // Soft progression ceiling

    const dna: LevelDNA = {
      seed: `global_seed_v1_level_${level}`,
      levelNumber: level,
      generatorVersion: "1.0.0",
      rulesVersion: "1.0.0",
      tubeCount,
      colorCount,
      capacity,
      emptyTubeCount,
      difficultyTarget,
      visualTheme: "LABORATORY"
    };

    const startTime = performance.now();
    const result = WaterSortFactory.generateLevel(dna);
    const totalTime = performance.now() - startTime;

    if (result.status === 'ACCEPTED') {
      console.log(`✅ SUCCESS - Level ${level} Generated in ${totalTime.toFixed(2)}ms`);
      console.log(`   Tubes: ${tubeCount} | Colors: ${colorCount} | Difficulty: ${result.qaReport.metrics.searchComplexity}`);
      console.log(`   QA Metrics: SolveTime: ${result.qaReport.metrics.solveTimeMs.toFixed(2)}ms | Solution Length: ${result.qaReport.metrics.solutionLength}`);
      console.log(`   Critic Score: ${result.criticReport.score}`);
    } else {
      console.log(`❌ FAILED - Level ${level}`);
      console.log(`   Reason: ${result.rejectReason}`);
      console.log(`   QA Details:`, result.qaReport.rejectReason);
    }
  }

  console.log("\n==========================================");
  console.log(` BENCHMARK COMPLETE. Memory usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log("==========================================");
}

runBenchmark().catch(console.error);
