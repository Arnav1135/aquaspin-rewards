<USER_REQUEST>
Proceed withought implementation plan : Strict Note - DO not change any existing Codebase ,Save this code base in your memory such that if  I go away with something after the below prompt than I can revert back to the existing code base with 0 errors and fully functional web app website as it is currently .                                                                   Task -                                                                                                                                                                                            # AQUA SPIN REWARDS — AUTONOMOUS GAME DEVELOPMENT FACTORY v2.0

You are operating as the **principal autonomous engineering agent** for my existing web-games platform:

# AQUA SPIN REWARDS

Your objective is to transform the existing Aqua Spin Rewards repository into a **self-improving, self-testing, AI-assisted, automated web-game development factory**.

This is not a request to merely design an architecture.

This is an instruction to **inspect the actual repository, implement the infrastructure, connect the components, test the implementation, and continuously improve the system**.

You must work with the existing codebase rather than blindly rebuilding it.

---

# 0. PRIMARY OBJECTIVE

I want the following future workflow:

```text
                    GAME IDEA
                       │
                       ▼
              ┌─────────────────┐
              │   ACTIVEPIECES  │
              │ AUTOMATION BRAIN│
              └────────┬────────┘
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
     REPOSITORY     AI PLANNER    ASSET ENGINE
      ANALYZER          │             │
          │             ▼             │
          │       AI GAME BUILDER     │
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                GAME GENERATION
                        │
                        ▼
              GAME INTEGRATION
                        │
                        ▼
                BUILD + LINT
                        │
                        ▼
              AUTOMATED GAME QA
                        │
          ┌─────────────┼─────────────┐
          ▼             ▼             ▼
       Runtime       Browser       Performance
        Tests         Tests           Tests
          │             │             │
          └─────────────┼─────────────┘
                        ▼
                  AI CODE REVIEW
                        │
                  ┌─────┴─────┐
                  │           │
                 FAIL        PASS
                  │           │
                  ▼           ▼
             AI DEBUGGER   GIT BRANCH
                  │           │
                  ▼           ▼
             AUTO-FIX     GITHUB ACTIONS
                  │           │
                  └─────┬─────┘
                        ▼
                 PREVIEW BUILD
                        │
                        ▼
                 FINAL VALIDATION
                        │
                        ▼
               PRODUCTION DEPLOY
                        │
                        ▼
                AQUA SPIN REWARDS
```

The long-term goal is:

> **A game idea should become a tested, integrated, optimized, deployable game with minimal human intervention.**

---

# 1. ABSOLUTE RULE — INSPECT BEFORE MODIFYING

Before creating or modifying anything:

### Perform a complete repository reconnaissance.

Inspect:

```text
package.json
lock files
src/
app/
pages/
components/
games/
public/
assets/
server/
api/
database/
scripts/
tests/
.github/
deployment files
Docker files
environment configuration
Vercel configuration
Cloudflare configuration
TypeScript configuration
ESLint configuration
testing configuration
```

Determine:

```text
framework
runtime
package manager
build system
routing architecture
game architecture
rendering engines
state management
API architecture
database architecture
authentication
asset handling
deployment platform
CI/CD
testing
```

Also inspect the actual implementation of at least several existing games.

Determine:

```text
How games are registered
How games are launched
How game state works
How scores work
How assets are loaded
How audio works
How animations work
How navigation works
How mobile support works
How game completion works
```

### IMPORTANT

Do not replace working architecture merely because you prefer another architecture.

If the current system is already good:

> extend it.

If it is inconsistent:

> create compatibility layers and progressively standardize it.

If a migration is genuinely required:

> create a migration strategy instead of destroying the current implementation.

---

# 2. CREATE AN INTERNAL ARCHITECTURE BASELINE

Before implementation, create an internal baseline containing:

```text
Repository architecture
Current game inventory
Current dependencies
Current build process
Current test coverage
Current game-loading architecture
Current performance bottlenecks
Current technical debt
Current deployment process
Current Git workflow
```

Also identify:

```text
Critical files
High-risk files
Shared infrastructure
Game-specific code
Production-sensitive code
```

Never make broad changes to production-sensitive files without understanding their dependencies.

---

# 3. FACTORY ARCHITECTURE

Create a dedicated architecture similar to:

```text
factory/
│
├── core/
│   ├── orchestrator/
│   ├── job-manager/
│   ├── state-manager/
│   ├── event-bus/
│   ├── logger/
│   └── config/
│
├── ai/
│   ├── planner/
│   ├── coder/
│   ├── reviewer/
│   ├── debugger/
│   ├── optimizer/
│   └── providers/
│
├── games/
│   ├── generator/
│   ├── templates/
│   ├── registry/
│   ├── manifest/
│   └── validator/
│
├── assets/
│   ├── discovery/
│   ├── validation/
│   ├── optimization/
│   ├── conversion/
│   ├── licensing/
│   └── cache/
│
├── qa/
│   ├── static/
│   ├── unit/
│   ├── integration/
│   ├── browser/
│   ├── gameplay/
│   ├── visual/
│   └── performance/
│
├── git/
│   ├── branch-manager/
│   ├── commit-manager/
│   ├── diff-analyzer/
│   └── rollback/
│
├── deployment/
│
├── telemetry/
│
└── dashboard/
```

Adapt this structure to the existing repository rather than forcing it literally.

---

# 4. FACTORY ORCHESTRATOR

Create a central orchestrator.

The orchestrator must understand jobs such as:

```text
CREATE_GAME
UPDATE_GAME
FIX_BUG
SCAN_REPOSITORY
SCAN_GAME
OPTIMIZE_GAME
OPTIMIZE_ASSETS
UPGRADE_GRAPHICS
UPGRADE_ANIMATION
UPGRADE_AUDIO
RUN_TESTS
RUN_PERFORMANCE_TEST
PREPARE_RELEASE
DEPLOY_PREVIEW
DEPLOY_PRODUCTION
```

Every operation should have:

```text
job ID
game ID
repository state
input
status
logs
steps
errors
retry count
result
artifacts
```

Use explicit state transitions:

```text
QUEUED
PLANNING
IMPLEMENTING
TESTING
FIXING
OPTIMIZING
VALIDATING
READY
DEPLOYING
COMPLETED
FAILED
ROLLED_BACK
```

---

# 5. EVENT-DRIVEN ARCHITECTURE

Create an event system.

Examples:

```text
GAME_REQUESTED
GAME_CREATED
GAME_REGISTERED
BUILD_STARTED
BUILD_FAILED
BUILD_SUCCEEDED
TEST_STARTED
TEST_FAILED
TEST_SUCCEEDED
BUG_DETECTED
FIX_STARTED
FIX_SUCCEEDED
FIX_FAILED
PERFORMANCE_REGRESSION
PERFORMANCE_IMPROVED
ASSET_ADDED
ASSET_REJECTED
DEPLOYMENT_STARTED
DEPLOYMENT_SUCCEEDED
DEPLOYMENT_FAILED
```

Activepieces should be able to trigger jobs from these events.

---

# 6. ACTIVEPIECES AS THE AUTOMATION CONTROL PLANE

Design the system so Activepieces controls external orchestration.

The factory should expose secure operations for Activepieces.

Create APIs similar to:

```http
POST /api/factory/jobs
POST /api/factory/games
POST /api/factory/games/:id/build
POST /api/factory/games/:id/test
POST /api/factory/games/:id/fix
POST /api/factory/games/:id/optimize
POST /api/factory/games/:id/upgrade
POST /api/factory/repository/scan
POST /api/factory/deployment/preview
POST /api/factory/deployment/production

GET /api/factory/jobs/:id
GET /api/factory/games/:id
GET /api/factory/errors
GET /api/factory/health
GET /api/factory/performance
```

Secure all endpoints.

Do not expose arbitrary shell execution.

---

# 7. ACTIVEPIECES MASTER WORKFLOW

The intended workflow is:

```text
Trigger
 ↓
Validate request
 ↓
Create factory job
 ↓
Inspect repository
 ↓
Generate execution plan
 ↓
Create isolated Git branch/worktree
 ↓
Execute AI development
 ↓
Asset processing
 ↓
Game integration
 ↓
Static analysis
 ↓
Build
 ↓
Automated browser test
 ↓
Gameplay test
 ↓
Performance benchmark
 ↓
AI code review
 ↓
Risk assessment
 ↓
PASS?
```

If FAIL:

```text
diagnostics
 ↓
root-cause analysis
 ↓
AI patch
 ↓
test patch
 ↓
regression check
```

If PASS:

```text
commit
 ↓
push
 ↓
GitHub Actions
 ↓
preview
 ↓
final validation
```

---

# 8. GAME IDEA DSL

Create a formal game specification format.

Support:

```yaml
name:
slug:
genre:
subgenre:

description:

coreMechanics:

camera:

world:

environment:

graphics:
  style:
  quality:
  renderer:
  postProcessing:

physics:

animation:

audio:

controls:

mobile:

levels:
  generation:
  count:
  procedural:

difficulty:

progression:

economy:

ui:

accessibility:

performance:

assets:

deployment:
```

Allow the AI planner to fill missing values intelligently.

---

# 9. AI GAME PLANNER

The planner must convert natural language into an executable plan.

Input:

> "Create an ultra-realistic 3D underwater treasure game."

Output internally:

```text
Game concept
Gameplay loop
Core systems
Scene graph
Entities
Materials
Lighting
Camera
Physics
Animation states
Particle effects
Audio events
UI
Controls
Mobile controls
Level generation
Difficulty
Rewards
Save state
Asset requirements
Performance budget
Testing plan
```

Every plan must contain:

```text
required files
new dependencies
assets
systems
tests
acceptance criteria
performance budget
risk level
```

---

# 10. AI CODING AGENT

The coding agent must operate in an isolated environment.

Workflow:

```text
READ
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
FORMAT
 ↓
LINT
 ↓
TYPECHECK
 ↓
TEST
 ↓
BUILD
 ↓
REVIEW
 ↓
FIX
```

Never make random edits.

For every task:

1. inspect relevant files;
2. identify dependencies;
3. modify the smallest necessary surface;
4. run targeted tests;
5. run regression tests;
6. inspect the diff;
7. validate behavior.

---

# 11. AI CODE REVIEWER

Create an independent review stage.

The reviewer should inspect:

```text
correctness
security
performance
maintainability
architecture
gameplay
mobile compatibility
accessibility
asset handling
memory usage
error handling
race conditions
async behavior
```

The reviewer should output:

```json
{
  "decision": "PASS",
  "severity": "LOW",
  "blockingIssues": [],
  "warnings": [],
  "suggestions": []
}
```

The coding agent and reviewer should be logically separated.

---

# 12. SELF-HEALING BUG SYSTEM

Implement a controlled autonomous debugging loop.

```text
ERROR
 ↓
CAPTURE
 ↓
REPRODUCE
 ↓
LOCALIZE
 ↓
ROOT-CAUSE ANALYSIS
 ↓
GENERATE PATCH
 ↓
TEST PATCH
 ↓
REGRESSION TEST
 ↓
PERFORMANCE TEST
 ↓
REVIEW PATCH
 ↓
ACCEPT / REJECT
```

The AI must not simply suppress errors.

For example:

Bad:

```text
catch(error) {}
```

Good:

```text
identify why the error occurred
fix the cause
```

---

# 13. BUG SEVERITY SYSTEM

Classify bugs:

```text
P0 — production outage
P1 — critical gameplay failure
P2 — major feature failure
P3 — minor bug
P4 — cosmetic issue
```

Automatic production fixes:

```text
P2/P3/P4
```

should be configurable.

P0/P1 should normally require stronger validation before deployment.

---

# 14. AUTOMATIC REGRESSION PROTECTION

Before modifying a game:

```text
capture baseline
```

After modification:

```text
run same baseline tests
compare results
```

Reject changes if:

```text
game crashes
critical interaction breaks
FPS falls below threshold
bundle grows excessively
load time becomes unacceptable
memory usage increases beyond budget
existing routes fail
existing games fail
```

---

# 15. GAME SDK

Create a reusable SDK.

Core APIs:

```text
GameLifecycle
SceneManager
AssetManager
AudioManager
InputManager
CameraManager
PhysicsManager
AnimationManager
ParticleManager
UIManager
ScoreManager
ProgressionManager
SaveManager
LevelManager
RewardManager
PerformanceManager
ErrorManager
AnalyticsManager
```

Every new game should use the SDK whenever practical.

---

# 16. PLUGIN-BASED GAME SYSTEM

Make game-specific functionality modular.

Example:

```text
plugins/
  water/
  liquid/
  sand/
  physics/
  racing/
  puzzle/
  shooter/
  platformer/
  endless-runner/
  card/
  board/
```

A new game should compose modules instead of rebuilding everything.

Example:

```text
WaterGame
=
GameSDK
+
WaterPlugin
+
PuzzlePlugin
+
LevelGenerator
+
AudioPlugin
```

---

# 17. ENGINE SELECTION SYSTEM

Create an engine selector.

Priority:

```text
Existing project engine
        ↓
Babylon.js
        ↓
Three.js
        ↓
Other compatible engine
```

Use Babylon.js when:

```text
advanced 3D
WebGPU
physics
materials
particles
large scenes
```

Use Three.js when:

```text
custom rendering
lightweight 3D
specialized scene
```

Do not introduce a new engine if an existing engine can handle the game.

---

# 18. WEBGPU + WEBGL FALLBACK

Where supported:

```text
WebGPU
```

should be preferred for advanced graphics.

Fallback:

```text
WebGL2
```

The game must gracefully detect unsupported features.

Never assume WebGPU exists.

Create renderer capability detection.

---

# 19. ADVANCED GRAPHICS PIPELINE

Create reusable systems for:

```text
PBR
HDR
HDRI
IBL
dynamic lighting
shadow maps
soft shadows
ambient occlusion
reflection
refraction
bloom
tone mapping
color grading
fog
volumetrics
depth of field
particles
GPU particles
environment effects
weather
sky
terrain
water
glass
metal
plastic
wood
stone
ice
fire
smoke
```

Use adaptive quality.

---

# 20. AUTOMATIC GRAPHICS QUALITY SCALING

Implement:

```text
ULTRA
HIGH
MEDIUM
LOW
```

Each preset controls:

```text
resolution
shadow quality
texture resolution
particle count
post-processing
reflections
refractions
LOD
view distance
anti-aliasing
```

Allow automatic selection based on device capability.

---

# 21. HYPER-REALISTIC WATER ENGINE

Build reusable water modules:

```text
WaterSurface
WaterFlow
WaterRipple
WaterSplash
WaterFoam
WaterDroplets
WaterReflection
WaterRefraction
WaterCaustics
LiquidContainer
LiquidPour
LiquidCollision
```

Create visually convincing water using efficient shaders, particles and animation rather than computationally expensive full fluid simulation unless genuinely required.

---

# 22. MATERIAL SYSTEM

Create reusable physically based materials:

```text
Water
Glass
Metal
Chrome
Plastic
Wood
Stone
Ceramic
Sand
Ice
Snow
Mud
Rubber
Fabric
```

Materials should be parameterized.

Example:

```text
roughness
metallic
normal
clearcoat
transmission
opacity
IOR
emissive
```

---

# 23. ADVANCED ANIMATION ENGINE

Support:

```text
skeletal animation
animation state machines
blend trees
procedural animation
tweening
physics animation
camera animation
object animation
UI animation
particle animation
environment animation
```

All animation must be:

```text
frame-rate independent
interruptible
event-driven
performance aware
```

---

# 24. PROCEDURAL GAME GENERATOR

Create reusable procedural generation.

Support:

```text
seed
biomes
rooms
terrain
obstacles
collectibles
enemies
NPC placement
powerups
spawn points
puzzles
level objectives
```

Requirements:

```text
deterministic seed
difficulty-aware
playability validation
no impossible layouts
no unreachable objectives
```

---

# 25. AUTOMATIC LEVEL VALIDATOR

Every generated level must be checked for:

```text
reachability
collision
spawn validity
objective accessibility
deadlocks
impossible paths
camera problems
performance
```

Reject invalid procedural levels.

---

# 26. ASSET DISCOVERY ENGINE

Create an asset metadata system.

Each asset must contain:

```text
name
type
format
size
source
license
licenseURL
commercialUse
attributionRequired
hash
dimensions
optimization status
```

Do not automatically import assets with unknown licensing.

---

# 27. ASSET OPTIMIZATION

Automatically:

```text
compress textures
resize oversized textures
convert supported formats
compress meshes
generate LODs
remove unused files
deduplicate assets
lazy-load assets
generate thumbnails
validate broken files
```

Maintain original assets separately where appropriate.

---

# 28. ASSET CACHE

Implement a local cache.

If multiple games require the same asset:

```text
DO NOT duplicate it unnecessarily.
```

Use:

```text
asset hash
shared asset registry
reference counting
```

This reduces repository size and loading time.

---

# 29. AUDIO FACTORY

Create:

```text
AudioManager
DynamicAudio
SpatialAudio
MusicManager
SFXManager
AmbientManager
```

Audio events should be declarative.

Example:

```json
{
  "event": "water_pour",
  "sound": "water-pour.wav",
  "volume": 0.8,
  "pitchVariation": 0.05,
  "spatial": true
}
```

---

# 30. AUTOMATIC SOUND SYNCHRONIZATION

For animations such as:

```text
pouring
collision
jump
landing
explosion
button press
water splash
```

allow sound events to be triggered from animation events rather than arbitrary timers.

The factory should be able to inspect an animation timeline and associate audio events with it.

---

# 31. GAMEPLAY AUTOMATION

Create reusable gameplay test scenarios.

Example:

```text
launch game
 ↓
wait for initialization
 ↓
start game
 ↓
perform action
 ↓
verify state change
 ↓
perform second action
 ↓
verify score
 ↓
finish level
 ↓
verify progression
 ↓
restart
 ↓
verify reset
```

The AI should generate tests from the game's specification.

---

# 32. VISUAL REGRESSION TESTING

Where practical:

```text
capture screenshots
compare against baseline
detect unexpected visual changes
```

Use tolerance thresholds.

Do not fail tests because of tiny anti-aliasing differences.

---

# 33. PERFORMANCE LAB

Create a performance benchmark for every game.

Collect:

```text
FPS
frame time
initialization time
first playable frame
asset load time
JS bundle size
CSS size
network requests
texture memory
geometry count
draw calls where available
renderer
device pixel ratio
```

Store historical results.

Example:

```text
Version 1.0
FPS = 59

Version 1.1
FPS = 52

Regression = detected
```

Reject unacceptable regressions.

---

# 34. PERFORMANCE AUTO-OPTIMIZER

When performance falls:

```text
identify bottleneck
 ↓
generate optimization candidates
 ↓
apply one optimization
 ↓
benchmark
 ↓
compare
```

Possible optimizations:

```text
LOD
lazy loading
texture compression
texture resolution reduction
instancing
frustum culling
occlusion strategies
particle reduction
shader simplification
asset deduplication
code splitting
memoization
worker offloading
```

Do not optimize blindly.

---

# 35. WORKER ARCHITECTURE

Where appropriate, move expensive non-rendering work to:

```text
Web Workers
```

Potential workloads:

```text
procedural generation
pathfinding
large calculations
level generation
asset processing
AI simulation
```

Never move rendering code into workers unless the architecture supports it correctly.

---

# 36. AUTOMATIC CODE SPLITTING

Games should preferably be lazy loaded.

Do not load the entire game library when a user opens the homepage.

Desired model:

```text
Homepage
 ↓
Game catalogue
 ↓
User selects game
 ↓
Game chunk loads
 ↓
Game assets load
```

Implement route-level/game-level code splitting.

---

# 37. PREFETCHING

For likely next games:

```text
prefetch metadata
prefetch small assets
```

but do not destroy bandwidth or mobile performance.

---

# 38. OFFLINE/CACHING STRATEGY

Where appropriate:

```text
service worker
cache static assets
cache game metadata
```

Do not cache dynamic/private information incorrectly.

---

# 39. SECURITY SCANNER

Automatically scan:

```text
dependencies
secrets
API keys
unsafe eval
dangerous shell commands
path traversal
XSS
injection
unsafe HTML
untrusted asset URLs
```

Run dependency/security checks in CI.

---

# 40. DEPENDENCY MANAGEMENT

Create an automated dependency scanner.

For every dependency:

```text
version
license
security status
outdated status
breaking-change risk
```

Automatically apply safe patch/minor updates where configured.

Never automatically apply major dependency migrations without stronger validation.

---

# 41. REPOSITORY HEALTH SCANNER

Create:

```text
npm run factory:health
```

It should inspect:

```text
dead code
unused imports
unused assets
duplicate components
duplicate game logic
large files
large bundles
dependency issues
broken links
broken routes
TODO/FIXME
console logs
technical debt
```

---

# 42. LEGACY BUG SCANNER

The factory must periodically inspect older games.

For each game:

```text
load
test
scan console
scan network
scan rendering
scan performance
scan interaction
```

Generate:

```text
Game Health Score
```

Example:

```text
Water Sort
Health: 92/100

Performance: 95
Reliability: 98
Graphics: 87
Accessibility: 80
Maintainability: 90
```

---

# 43. AUTOMATIC GAME UPGRADER

Create an upgrade engine.

Possible upgrades:

```text
performance
graphics
animation
audio
UI
mobile
accessibility
loading
code quality
security
```

Each upgrade must have:

```text
before
planned change
after
benchmark
regression result
```

---

# 44. SCHEDULED FACTORY JOBS

Allow Activepieces to schedule:

```text
daily health scan
weekly bug scan
weekly performance scan
monthly dependency scan
monthly graphics audit
monthly asset optimization
monthly technical-debt audit
```

Do not perform destructive upgrades without validation.

---

# 45. GIT WORKTREE/BRANCH ISOLATION

Every autonomous job should operate in isolation.

Example:

```text
factory/game-neon-water-rush
factory/fix-water-sort-482
factory/perf-game-17
```

Never let two AI jobs unknowingly modify the same working tree simultaneously.

Detect concurrent modifications.

---

# 46. CHANGE IMPACT ANALYSIS

Before modifying shared infrastructure, determine:

```text
which games depend on it
which components depend on it
which routes depend on it
which tests cover it
```

Then run targeted regression tests.

---

# 47. AUTOMATIC ROLLBACK

If deployment causes a verified regression:

```text
detect
 ↓
stop rollout
 ↓
identify last healthy version
 ↓
rollback
 ↓
record incident
```

Never leave production intentionally broken.

---

# 48. DEPLOYMENT STRATEGY

Use:

```text
development
 ↓
factory branch
 ↓
CI
 ↓
preview
 ↓
automated verification
 ↓
production
```

Production deployment should initially require approval.

Make this configurable:

```text
AUTO_DEPLOY=false
```

Later:

```text
AUTO_DEPLOY=true
```

can be enabled once the factory proves reliable.

---

# 49. DASHBOARD

Build a Factory Control Center.

Sections:

```text
Overview
Games
Jobs
Builds
Failures
Bugs
AI Fixes
Performance
Assets
Deployments
GitHub
System Health
Logs
```

For each game:

```text
Game ID
Version
Status
FPS
Load time
Bundle size
Asset size
Last build
Last test
Last bug
Last optimization
Health score
```

---

# 50. JOB VISUALIZATION

Display a pipeline:

```text
PLANNING ✓
GENERATING ✓
ASSETS ✓
INTEGRATING ✓
TESTING ✓
PERFORMANCE ✓
AI REVIEW ✓
GITHUB ✓
DEPLOYMENT ✓
```

If something fails:

```text
TESTING ✗
```

allow viewing the exact diagnostics.

---

# 51. STRUCTURED LOGGING

Every factory operation should generate structured logs.

Example:

```json
{
  "timestamp": "...",
  "jobId": "...",
  "gameId": "...",
  "stage": "performance",
  "level": "error",
  "message": "...",
  "metadata": {}
}
```

Do not rely exclusively on plain console output.

---

# 52. IDE/AGENT MEMORY

Maintain machine-readable factory state.

The system should know:

```text
what game exists
what version exists
what was changed
what failed
what was fixed
what assets exist
what tests exist
what performance baseline exists
```

Do not rely on an AI model remembering previous conversations.

Persist state in files/database as appropriate.

---

# 53. AI CONTEXT PACK

Before sending a task to the AI coding agent, automatically generate a compact context package:

```text
repository summary
relevant files
game manifest
current errors
recent Git diff
tests
performance baseline
architecture rules
security rules
```

Do not dump the entire repository into every AI call.

Use targeted context.

---

# 54. AI TOKEN/COMPUTE EFFICIENCY

The factory must avoid wasting AI compute.

Use:

```text
targeted file retrieval
error-specific context
incremental analysis
cached repository summaries
cached asset metadata
cached dependency analysis
```

Do not ask an AI model to re-analyze the entire repository for every minor lint error.

---

# 55. MULTI-AGENT MODEL

Where supported, divide responsibilities:

```text
Planner Agent
     ↓
Developer Agent
     ↓
Asset Agent
     ↓
QA Agent
     ↓
Debugger Agent
     ↓
Performance Agent
     ↓
Security Agent
     ↓
Release Agent
```

Each agent should have a limited responsibility.

The orchestrator decides when each agent runs.

---

# 56. AGENT APPROVAL MODEL

Agents cannot arbitrarily approve their own risky work.

Example:

```text
Developer
    ↓
QA
    ↓
Security
    ↓
Performance
    ↓
Release
```

A developer-generated change must be independently validated.

---

# 57. FAILURE BUDGET

Implement retry limits.

Example:

```text
MAX_BUILD_RETRIES = 2
MAX_AI_FIX_ATTEMPTS = 3
MAX_DEPLOY_RETRIES = 2
```

If limits are exceeded:

```text
job = FAILED
```

and generate a detailed report.

Never create infinite loops.

---

# 58. HUMAN ESCALATION

If the factory cannot safely solve a problem:

```text
ESCALATE
```

Provide:

```text
what failed
why it failed
what was attempted
files involved
logs
recommended manual action
```

The goal is not to hide failures.

The goal is to minimize human work while preserving reliability.

---

# 59. NO FAKE CAPABILITIES

Absolutely do NOT implement:

```text
fake AI generation
fake deployment
fake GitHub status
fake performance results
fake testing
fake assets
fake health scores
fake bug fixes
```

Every displayed result must come from an actual operation.

---

# 60. FREE / SELF-HOSTED FIRST

Design the architecture to work with open-source/self-hosted tooling wherever practical.

Prefer:

```text
Activepieces Community Edition
local AI
Ollama-compatible providers
GitHub
Babylon.js
Three.js
Blender
Playwright
Vitest
TypeScript
Docker
PostgreSQL
Redis
```

Do not hard-code a paid AI API into the architecture.

Create provider abstraction so paid APIs can be added later but are not mandatory.

---

# 61. ENVIRONMENT CONFIGURATION

Create a clear environment configuration.

Example:

```text
AI_PROVIDER=
AI_MODEL=
ACTIVEPIECES_URL=
FACTORY_API_KEY=
GITHUB_REPOSITORY=
GITHUB_TOKEN=
DEPLOYMENT_PROVIDER=
DEPLOYMENT_TOKEN=
AUTO_FIX=
AUTO_DEPLOY=
MAX_FIX_ATTEMPTS=
TARGET_FPS=
```

Never commit secrets.

Create:

```text
.env.example
```

without real credentials.

---

# 62. DOCKER SUPPORT

Where practical, provide Docker support for the factory.

Create:

```text
Dockerfile
docker-compose.yml
```

for components that benefit from isolation.

Potential services:

```text
factory
activepieces
postgres
redis
ollama
```

Do not containerize components unnecessarily if it complicates local development.

---

# 63. LOCAL DEVELOPMENT MODE

The entire factory should have a local development mode.

Example:

```bash
npm run factory:dev
```

This should allow:

```text
local AI
local factory API
local testing
local game generation
local asset processing
```

without production credentials.

---

# 64. DRY-RUN MODE

Implement:

```bash
npm run factory:dry-run
```

This should show:

```text
files that would change
assets that would be added
dependencies that would change
tests that would run
deployment that would occur
```

without actually modifying production.

---

# 65. PLAN-ONLY MODE

Implement:

```bash
npm run factory:plan
```

which produces:

```text
implementation plan
files affected
assets required
dependencies
estimated complexity
risk
testing strategy
```

without making modifications.

---

# 66. GAME CREATION COMMAND

Implement:

```bash
npm run factory:create-game -- --spec ./game-specs/example.yml
```

Pipeline:

```text
validate
 ↓
plan
 ↓
branch
 ↓
generate
 ↓
assets
 ↓
integrate
 ↓
test
 ↓
fix
 ↓
optimize
 ↓
build
```

---

# 67. COMPLETE FACTORY COMMAND SET

Create commands equivalent to:

```bash
npm run factory:health
npm run factory:scan
npm run factory:plan
npm run factory:create-game
npm run factory:update-game
npm run factory:test
npm run factory:fix
npm run factory:optimize
npm run factory:graphics
npm run factory:assets
npm run factory:performance
npm run factory:security
npm run factory:build
npm run factory:preview
npm run factory:deploy
npm run factory:rollback
```

Adapt commands to the existing package manager.

---

# 68. TEST GAME

After building the infrastructure, create one controlled demonstration game:

# Hyper Realistic Water Drop Challenge

Requirements:

```text
3D
Babylon.js where appropriate
WebGPU with WebGL2 fallback
realistic water
glass/container
dynamic lighting
PBR materials
particles
smooth animation
sound events
mobile support
responsive controls
score
progression
restart
game over
```

The purpose is not to create a huge commercial game.

The purpose is to prove that the factory can automatically produce and integrate a real game.

---

# 69. FACTORY ACCEPTANCE TEST

The final acceptance test is:

```text
Input:
"Create a new 3D water-based arcade game."
```

The system should automatically:

```text
1. Parse request
2. Generate specification
3. Analyze repository
4. Select game template
5. Create isolated branch
6. Generate implementation plan
7. Generate game
8. Prepare assets
9. Register game
10. Build
11. Run static analysis
12. Run unit tests
13. Run browser tests
14. Run gameplay tests
15. Run performance tests
16. Run security checks
17. AI-review code
18. Fix safe failures
19. Repeat tests
20. Generate Git commit
21. Push branch
22. Run GitHub Actions
23. Create preview
24. Validate preview
25. Produce final release report
```

Do not report success unless these stages actually execute.

---

# 70. SUCCESS CRITERIA

The factory is successful only if:

### Existing games

```text
continue working
```

### New games

```text
can be generated using the standardized system
```

### Game registration

```text
is automatic
```

### Testing

```text
is automatic
```

### Bug fixing

```text
can automatically solve safe deterministic failures
```

### Performance

```text
is measured rather than guessed
```

### Graphics

```text
can be upgraded without blindly destroying performance
```

### Assets

```text
are validated and license-aware
```

### GitHub

```text
receives controlled changes
```

### Deployment

```text
is reproducible
```

### Failure handling

```text
does not create infinite AI loops
```

---

# 71. DEVELOPMENT PRIORITY

Do NOT try to implement the entire system as one enormous untested change.

Use these milestones:

## MILESTONE 1

Repository reconnaissance.

## MILESTONE 2

Game registry + manifests.

## MILESTONE 3

Game SDK.

## MILESTONE 4

Factory orchestrator.

## MILESTONE 5

Game specification DSL.

## MILESTONE 6

Game generator.

## MILESTONE 7

Asset pipeline.

## MILESTONE 8

Automated QA.

## MILESTONE 9

AI debugger.

## MILESTONE 10

Performance engine.

## MILESTONE 11

GitHub integration.

## MILESTONE 12

Activepieces integration.

## MILESTONE 13

Dashboard.

## MILESTONE 14

Scheduled upgrades.

## MILESTONE 15

End-to-end autonomous game creation.

After each milestone:

```text
build
test
inspect
commit
document
```

---

# 72. DO NOT STOP AT DOCUMENTATION

A critical instruction:

Do not respond with:

> "Here is how you could build it."

You are the implementation agent.

Actually:

```text
inspect
create
modify
run
test
debug
verify
document
```

If a requested integration cannot be completed because credentials, external infrastructure or permissions are unavailable:

1. implement everything that can be implemented locally;
2. create the correct adapter/interface;
3. clearly identify the external dependency;
4. provide exact configuration required;
5. do not fake the integration.

---

# 73. FINAL REPORT FORMAT

When you finish each milestone, report:

```text
════════════════════════════════════
AQUA SPIN FACTORY STATUS
════════════════════════════════════

Milestone:
Status:

IMPLEMENTED:
-

FILES CREATED:
-

FILES MODIFIED:
-

DEPENDENCIES:
-

TESTS:
-

BUILD:
-

PERFORMANCE:
-

SECURITY:
-

GITHUB:
-

ACTIVEPIECES:
-

KNOWN LIMITATIONS:
-

NEXT MILESTONE:
-
```

Use:

```text
✅ IMPLEMENTED
⚠️ PARTIALLY IMPLEMENTED
❌ NOT IMPLEMENTED
```

Do not exaggerate.

---

# 74. FINAL OPERATING PRINCIPLE

From this point forward, treat Aqua Spin Rewards as a **platform**, not merely a website containing individual games.

The architecture must evolve toward:

```text
                 AQUA SPIN GAME FACTORY
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
       ▼                  ▼                  ▼
   GAME CREATION      GAME MAINTENANCE   GAME EVOLUTION
       │                  │                  │
       ▼                  ▼                  ▼
   New Games          Bug Detection      Graphics
   New Levels         Auto Fixes          Animation
   New Mechanics      Regression          Audio
   New Assets         Security            Performance
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
                    AUTOMATED QA
                          │
                          ▼
                      GITHUB CI
                          │
                          ▼
                       PREVIEW
                          │
                          ▼
                     PRODUCTION
```

The final objective is:

> **Aqua Spin Rewards should eventually behave like an autonomous game-development platform where a game idea can enter at the top of the pipeline and a fully integrated, tested, optimized and deployable game can emerge at the bottom.**

Start NOW.

### STEP 1

Inspect the existing repository completely.

### STEP 2

Identify the current game architecture.

### STEP 3

Identify the minimum changes required to introduce the factory without breaking existing games.

### STEP 4

Create the architecture baseline.

### STEP 5

Begin MILESTONE 1.

Do not make assumptions about the existing repository when the actual files can be inspected.

Do not rewrite working systems unnecessarily.

Do not fake capabilities.

Do not skip testing.

Do not declare completion until the implemented functionality has actually been executed and verified.

</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-08-09T22:18:37+05:30.
</ADDITIONAL_METADATA>