# Rules Engine Audit

## 1. Existing Engine Overview
Currently, the core logic resides in `Match3Engine.ts` (monolithic static class) and `GameStore.ts` (Zustand state).
- **Tile Representation:** Defined in `types.ts` as `TileData`. It tracks color, shape, special status, blocker status, jelly layers, ingredient, and transient visual state (isFalling, isMatched, isSelected).
- **Colors & Shapes:** 6 standard colors (`red`, `orange`, `yellow`, `green`, `blue`, `purple`). Shapes are mapped 1:1 with colors (e.g., red = jelly-bean) or 'fish' for dynamic tokens.
- **Matching:** `MatchDetector.detectMatches()` identifies valid match regions. `Match3Engine.findMatches()` translates these into matched tiles and new `SpecialType` creation points.
- **Swapping:** Managed by `GameStore.handleSwap`, which swaps elements, checks matches, handles special combo activations (`Match3Engine.handleSpecialSwapCombo`), and triggers cascade logic.
- **Gravity & Refill:** Standard array-shifting logic `Match3Engine.applyGravity()` handles dropping candies downward (and supports UP, LEFT, RIGHT). It instantly spawns new random candies at the top boundary.
- **Special Candies:** Hardcoded execution inside `activateSpecialCandy()`. Supports `striped-h`, `striped-v`, `wrapped`, `color-bomb`, and `jelly-fish`.
- **Blockers:** Hardcoded adjacency checks (`damageAdjacentBlockers()`) for frosting, chocolate, and licorice. Chocolate spreading is a hardcoded function `processChocolateSpread()`.
- **Objectives:** Handled at the end of the cascade loop (`checkGameEndConditions` in `GameStore.ts`). Supports score and jelly. Ingredients and orders are defined in types but only partially implemented in the game loop.
- **Scoring & Level Progression:** Point calculation is hardcoded inside `processBoardCascade` (cascadeLevel * length * 100). Level definitions are stored in `LevelConfig`.
- **AI Advisor:** Analyzes possible 1-step swaps and assigns a strategic rating (`getBestMoveAdvice()`).

## 2. Issues with Current Architecture
- **Monolithic State Updates:** `GameStore` and `Match3Engine` are tightly coupled. All cascading and scoring logic runs synchronously or with hard-coded `setTimeout` delays in `processBoardCascade`.
- **Hardcoded Interactions:** `handleSpecialSwapCombo` manually checks pairs like "color-bomb + striped". Adding a new special candy requires modifying multiple `if-else` blocks.
- **No Event System:** The engine does not emit events (e.g., `ON_BLOCKER_DESTROYED`). It just mutates the board array.
- **Lack of Conflict Resolution:** If a wrapped explosion hits a chocolate block and a portal simultaneously, there is no standardized priority order.
- **Rigid Level Definitions:** `LevelConfig` assumes fixed arrays of grids and mechanics.

## 3. Path to the Intelligent Rules Engine
We will transform this monolithic structure into a purely **Event-Driven Rules Engine**:

### Phase 1: Normalized Interfaces
Create the standard schema (LevelDefinition, MechanicDefinition, RuleEvent, InteractionMatrix).
*Status: Starting now.*

### Phase 2: Event System & State Machine
Convert the `processBoardCascade` loop into an Event Queue (e.g., `SWAP_ATTEMPT` -> `MATCH_DETECTED` -> `SPECIAL_CREATED` -> `GRAVITY_CHANGED`).

### Phase 3: Mechanic Registries
Move blockers (Chocolate, Frosting), specials (Striped, Wrapped), and objectives into modular plugins that register themselves into a `MechanicRegistry`.

### Phase 4: Fairness & Solvability
Integrate automated board simulations to ensure generated configurations are solvable before showing them to the user.
