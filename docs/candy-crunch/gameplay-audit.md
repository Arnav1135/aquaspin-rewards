# Candy Crunch Gameplay Audit

## 1. Current Matching Logic
- Handled in `Match3Engine.findMatches`.
- Checks for horizontal and vertical matches of 3 or more using simple loop accumulation.
- Calculates combinations by intersecting horizontal and vertical matches to find T and L shapes.
- Doesn't natively support abstract pattern definitions (e.g. 2x2 squares, complex custom shapes), relying on hardcoded length and intersection checks.

## 2. Swap Logic
- Handled in `GameStore.ts` via `handleSwap` and `Match3Engine.handleSpecialSwapCombo`.
- Swaps adjacent tiles. Validates matches. If no match or special combo is triggered, the swap is rejected and reverted, playing an invalid sound.
- Deducts a move on a successful swap.
- Double-special swap combinations exist but are hardcoded (Color Bomb + Color Bomb, Color Bomb + Special, Striped + Striped, Striped + Wrapped).

## 3. Cascade Logic
- Defined recursively in `GameStore.ts` (`processBoardCascade`).
- Removes matched tiles, damages blockers, activates specials.
- Computes points, decreases jelly layers, calculates stars.
- Pauses briefly, then applies gravity to pull tiles down (or in the set `gravityDir`).
- Repeatedly calls `processBoardCascade` until no matches are found.
- Cascade count increments to trigger scaling sound/announcer ("Sweet", "Tasty").

## 4. Refill Logic
- Managed inside `Match3Engine.applyGravity`.
- Loops through columns (or rows depending on gravity direction) and moves `isMatched` tiles out of the way while moving existing tiles towards the gravity direction.
- Fills empty slots with newly generated tiles from `Match3Engine.createRandomTile`.

## 5. Special Candies
- Defined in `types.ts` as `SpecialType`: `striped-h`, `striped-v`, `wrapped`, `color-bomb`, `jelly-fish`, `coconut-wheel`, `lucky-candy`.
- Created via match lengths (5 = color bomb, 4 = striped, T/L = wrapped).
- `activateSpecialCandy` handles individual effects recursively.
- Hardcoded rules per special type directly in the `Match3Engine`.

## 6. Boosters
- Managed in `GameStore.ts` (`applyBooster`).
- Supported: `lollipop-hammer`, `hand-switch`, `extra-moves`, `ufo`, `party-booster`.
- Bypasses swap logic to instantly affect cells or global state (like `movesLeft`), then triggers a board cascade.

## 7. Objectives
- Defined in `types.ts` (`ObjectiveType`): `score`, `jelly`, `ingredients`, `orders`.
- `GameStore.checkGameEndConditions` only appears to fully implement `jelly` and `score`. If it's a jelly level, checks if `currentJelly === 0`. Else checks if `score >= targetScore`.
- Does not have a robust, extensible objective tracker or hybrid support yet.

## 8. Blockers
- Defined in `types.ts`: `frosting-1` to `-3`, `chocolate`, `licorice-swirl`, `marmalade`, `licorice-lock`, `candy-cane-fence`.
- Spread logic for `chocolate` is explicitly baked into `Match3Engine.processChocolateSpread`.
- Adjacent damage is baked into `damageAdjacentBlockers`.

## 9. Scoring
- Hardcoded inside `GameStore.ts`.
- `matchedTiles.length * 100 * cascadeLevel`.
- Star ratings evaluated dynamically against percentages of `targetScore` (50%, 100%, 150%).

## 10. Level Progression & Data
- `getLevelConfig` and `Match3Engine.getScaledLevelConfig` dictate levels.
- Supports programmatic difficulty scaling based on level number (up to 300+) adjusting board sizes from 8x8 up to 10x10.
- Doesn't use a structured Level DNA system or deep simulator yet.

## 11. AI Advisor
- `Match3Engine.getBestMoveAdvice` scans 1 step ahead for any valid swap that creates a match or combo.
- Assigns a heuristic `strategicRating` based on match length.

## 12. Game-Over & Victory
- Checked inside `checkGameEndConditions`.
- Victory triggered when objectives are met; defeat when `remainingMoves <= 0`.
- Missing a "Sugar Rush" finale phase that converts leftover moves to score/specials.

## Conclusion
The current engine works as a functional Match-3 prototype but relies heavily on tightly coupled logic (e.g., matching, cascading, score, and state management blended between `GameStore.ts` and `Match3Engine.ts`). To reach the target architecture, it requires separation into distinct modular engines (MatchDetector, EventBus, CascadeEngine, ObjectiveEngine) with an event-driven loop.
