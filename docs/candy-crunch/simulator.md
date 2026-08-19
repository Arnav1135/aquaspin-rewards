# Candy Crunch — Headless Level Simulator & Monte Carlo Evaluator

## Overview
The `LevelSimulator` evaluates generated levels using Monte Carlo simulations completely independent of rendering or Three.js dependencies.

## Key Metrics Evaluated
- **Win Probability / Win Rate**: Ratio of successful playthroughs over N iterations.
- **Estimated Difficulty**: Scaled metric combining win rate and deadlock probability (`0.1` to `1.0`).
- **Deadlock Probability**: Frequency of zero-legal-move states.
- **Average Moves Required**: Mean number of moves to complete objectives.
- **Cascade Depth & Special Candy Generation**: Statistically calibrated special candy opportunities.
