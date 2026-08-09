#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { SpecValidator } from './ai/planner/SpecValidator';
import { GameGenerator } from './core/generator/GameGenerator';

const program = new Command();

program
  .name('aqua-factory')
  .description('Aqua Spin Rewards - Autonomous Game Factory CLI')
  .version('2.0.0');

program
  .command('generate')
  .description('Generate a new mini-game interactively')
  .action(async () => {
    console.log(chalk.cyan('========================================'));
    console.log(chalk.cyan('   AQUA SPIN FACTORY - LOGIC BUILDER    '));
    console.log(chalk.cyan('========================================\n'));

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'What is the name of the new game?',
        default: 'My Awesome Game',
      },
      {
        type: 'input',
        name: 'slug',
        message: 'What is the URL slug? (e.g. my-awesome-game)',
        validate: (input) => /^[a-z0-9-]+$/.test(input) || 'Lowercase letters, numbers, and hyphens only.',
      },
      {
        type: 'list',
        name: 'genre',
        message: 'What genre is this game?',
        choices: ['Arcade', 'Puzzle', 'Action', 'Strategy', 'Idle'],
      },
      {
        type: 'list',
        name: 'renderer',
        message: 'Which rendering engine should be used?',
        choices: ['React', 'PixiJS', 'Phaser', 'Babylon'],
      },
      {
        type: 'input',
        name: 'mechanics',
        message: 'Describe the core mechanics (comma separated):',
        default: 'click to score, level progression',
      }
    ]);

    const spec = {
      name: answers.name,
      slug: answers.slug,
      genre: answers.genre,
      description: \`A new \${answers.genre} game.\`,
      graphics: {
        style: 'Modern 2D',
        renderer: answers.renderer as any
      },
      coreMechanics: answers.mechanics.split(',').map((m: string) => m.trim())
    };

    console.log(chalk.yellow('\n[Factory] Validating GameSpec...'));
    const isValid = SpecValidator.validate(spec);
    
    if (!isValid) {
      console.log(chalk.red('[Error] Invalid GameSpec generated. Aborting.'));
      process.exit(1);
    }
    
    console.log(chalk.green('[Success] GameSpec Validated.'));
    
    console.log(chalk.yellow('[Factory] Simulating AI Logic Builder... (mocked)'));
    // Simulate Logic Builder API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(chalk.yellow('[Factory] Scaffolding components...'));
    
    // In production, we'd pass the actual generated string from LogicBuilder
    const success = GameGenerator.scaffoldGame(spec);
    
    if (success) {
      console.log(chalk.green(\`\n🎉 Success! Game "\${spec.name}" generated in src/games/\${spec.slug}/\`));
      console.log(chalk.white('Run ') + chalk.cyan('npm run dev') + chalk.white(' to preview it.'));
    } else {
      console.log(chalk.red('\n[Error] Failed to scaffold the game.'));
    }
  });

program.parse();
