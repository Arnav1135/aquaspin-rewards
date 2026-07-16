// Validate all 60 Match-3 levels
import { LEVELS } from '@/games/match3/levels/levelData';
import { printValidationReport } from '@/games/match3/utils/levelValidator';

console.log('🧪 Match-3 Level Validation Report\n');
console.log('='.repeat(70));

let passCount = 0;
let failCount = 0;

LEVELS.forEach((level) => {
  const checks: string[] = [];

  // Level ID
  if (!level.id || level.id < 1 || level.id > 60) {
    checks.push(`❌ Invalid ID: ${level.id}`);
    failCount++;
  } else {
    passCount++;
  }

  // Board dimensions
  if (level.width < 6 || level.width > 9 || level.height < 6 || level.height > 9) {
    checks.push(`❌ Invalid dimensions: ${level.width}x${level.height}`);
    failCount++;
  } else {
    passCount++;
  }

  // Move limit
  if (level.moveLimit < 8 || level.moveLimit > 30) {
    checks.push(`❌ Invalid move limit: ${level.moveLimit}`);
    failCount++;
  } else {
    passCount++;
  }

  // Star thresholds
  const [s1, s2, s3] = level.starThresholds;
  if (s1 >= s2 || s2 >= s3) {
    checks.push(`❌ Invalid star thresholds: [${s1}, ${s2}, ${s3}]`);
    failCount++;
  } else {
    passCount++;
  }

  // Objective
  const validObjectives = ['score', 'jelly', 'collect', 'ingredient', 'blockers'];
  if (!validObjectives.includes(level.objectiveType)) {
    checks.push(`❌ Invalid objective: ${level.objectiveType}`);
    failCount++;
  } else {
    passCount++;
  }

  // Difficulty
  const validDifficulties = ['easy', 'medium', 'hard', 'expert'];
  if (!validDifficulties.includes(level.difficulty)) {
    checks.push(`❌ Invalid difficulty: ${level.difficulty}`);
    failCount++;
  } else {
    passCount++;
  }

  // World
  if (level.world < 1 || level.world > 6) {
    checks.push(`❌ Invalid world: ${level.world}`);
    failCount++;
  } else {
    passCount++;
  }

  if (checks.length === 0) {
    console.log(`✅ Level ${level.id.toString().padStart(2, '0')}: ${level.name.padEnd(35)} | ${level.difficulty.padEnd(7)} | ${level.width}x${level.height}`);
  } else {
    console.log(`❌ Level ${level.id.toString().padStart(2, '0')}: ${level.name}`);
    checks.forEach(c => console.log(`   ${c}`));
  }
});

console.log('='.repeat(70));
console.log(`\n✅ Total levels validated: ${LEVELS.length}`);
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);
console.log(`\nStatus: ${failCount === 0 ? '✅ ALL LEVELS VALID!' : `⚠️  ${failCount} issues found`}\n`);

// Print detailed report
printValidationReport();

export {};
