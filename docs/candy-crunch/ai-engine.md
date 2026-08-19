# Candy Crunch — AI Engine & Self-Healing QA Architecture

## Overview
The AI Level Director and AI QA Engine provide closed-loop level generation, difficulty tuning, and real-time self-healing.

## Subsystems

### 1. AI Level Director (`AILevelDirector.ts`)
- Closed-loop workflow:
  `AI Proposal` -> `Deterministic Scaffolding` -> `Monte Carlo Simulation` -> `Fairness & Novelty Check` -> `Approve/Reject`.

### 2. AI QA Engine (`AIQAEngine.ts`)
- Runtime defect inspection & automatic board state healing.
- Detects unplayable deadlocks and applies auto-fix board mutations up to `MAX_AUTO_FIX_ATTEMPTS = 3`.
