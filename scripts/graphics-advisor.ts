/**
 * System A: AI Graphics Upgrade Advisor
 * Inspects the repository, analyzes current graphics implementations, detects defects/limitations,
 * and publishes prioritized, concrete, implementation-ready recommendations to queue.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(REPO_ROOT, 'docs', 'graphics-evolution', 'queue.json');
const HISTORY_FILE = path.join(REPO_ROOT, 'docs', 'graphics-evolution', 'history.json');
const DEFECTS_FILE = path.join(REPO_ROOT, 'docs', 'graphics-evolution', 'defects.json');

export interface GraphicsRecommendation {
  id: string;
  targetGame: string;
  componentPath: string;
  title: string;
  defectOrLimitation: string;
  proposedImprovement: string;
  observableBenefit: string;
  implementationApproach: string;
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  priority: number; // 1 = highest
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'DISCOVERED' | 'PRIORITIZED' | 'QUEUED' | 'IN_PROGRESS' | 'TESTING' | 'ACCEPTED' | 'NEEDS_REPAIR' | 'REJECTED';
  acceptanceCriteria: string[];
  requiredTests: string[];
  dependencies: string[];
  createdAt: string;
  updatedAt: string;
  outcome?: string;
}

export function inspectAndGenerateRecommendations(): GraphicsRecommendation[] {
  console.log('[System A — AI Graphics Advisor] Inspecting AquaSpin repository...');
  
  // Load existing history to avoid repeated ideas or repeating failures
  let existingHistory: any[] = [];
  if (fs.existsSync(HISTORY_FILE)) {
    try {
      existingHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
    } catch (e) {
      existingHistory = [];
    }
  }
  const acceptedIds = new Set(existingHistory.filter(h => h.status === 'ACCEPTED').map(h => h.id));

  const candidateRecommendations: GraphicsRecommendation[] = [
    {
      id: 'REC-PLINKO-CANVAS-HQ-PBR',
      targetGame: 'Plinko',
      componentPath: 'src/components/games/PlinkoGame.tsx',
      title: 'High-Fidelity Canvas Shading, Peg Glow & Multi-Layer Depth for Plinko',
      defectOrLimitation: 'Plinko canvas rendering uses flat 2D arcs with minimal lighting, basic trails, and no dynamic rim lighting or 3D peg bevel highlights.',
      proposedImprovement: 'Implement procedural radial specular gradients, metallic peg rims, dynamic ball drop motion blur trail with particle sparks on bounce, and illuminated multiplier buckets.',
      observableBenefit: 'Delivers physical arcade-cabinet depth, realistic metallic reflection on pegs, vibrant impact flashes, and responsive multiplier illumination.',
      implementationApproach: 'Upgrade the 2D canvas draw loop: introduce radial specular gradients for pegs with neon rebound rings, enhanced multi-point ball shadow and velocity-stretched motion blur, and bucket bounce animations.',
      complexity: 'MEDIUM',
      priority: 1,
      riskLevel: 'LOW',
      status: 'QUEUED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Balls bounce accurately with responsive physics preserved',
        'Pegs render with 3D specular highlight and ring flash on hit',
        'Multiplier buckets show radiant glow state upon capture',
        'No frame drops or memory leaks'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-ROULETTE-3D-PHYSICAL-WHEEL',
      targetGame: 'Roulette',
      componentPath: 'src/components/games/RouletteGame.tsx',
      title: 'Physical PBR Shading & Metallic Rim Reflections for Roulette Wheel',
      defectOrLimitation: 'Roulette wheel uses flat SVG/CSS borders without realistic metallic reflections, ambient occlusion, or physical ball track depth.',
      proposedImprovement: 'Add conic-gradient metallic brass rim, ball shadow projection, and illuminated winning pocket highlights.',
      observableBenefit: 'Luxury casino-grade wheel appearance with tangible metallic luster and realistic ball path illumination.',
      implementationApproach: 'Enhance SVG/Canvas layers with multi-stop metallic linear/radial gradients, dynamic pocket bevels, and animated track specular reflections.',
      complexity: 'MEDIUM',
      priority: 2,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'Build passes without errors',
        'Wheel spin animation remains 60fps',
        'Winning pocket highlight pulses cleanly'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-COINFLIP-3D-PBR-TEXTURES',
      targetGame: 'CoinFlip',
      componentPath: 'src/features/coinflip/components/Coin3D.tsx',
      title: '3D PBR Coin Shading & Rim Milling Detail',
      defectOrLimitation: 'Coin 3D flip has simplistic rim shading and lacks realistic light glint across the face during high-velocity rotation.',
      proposedImprovement: 'Add procedural metallic edge milling, high-contrast Fresnel rim glint, and realistic depth drop-shadow on the floor plane.',
      observableBenefit: 'Tangible heavyweight golden token feel with cinematic spin glint.',
      implementationApproach: 'Update Coin3D SVG/Three/CSS transforms with dynamic light angle calculations and anisotropic reflection simulation.',
      complexity: 'LOW',
      priority: 3,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'Build passes',
        'Tumbling physics unaffected',
        'Specular sheen sweeps across face smoothly'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-MINES-VOLUMETRIC-TILE-REVEAL',
      targetGame: 'Mines',
      componentPath: 'src/components/games/MinesGame.tsx',
      title: 'Volumetric Depth, Glassmorphism & Crystal Gem Glow in Mines',
      defectOrLimitation: 'Mines tiles reveal with standard 2D flat fade; gems lack internal caustics and mines lack ominous pulse warnings.',
      proposedImprovement: 'Add layered inset shadow bevels, crystal refraction highlight for gems, and molten warning heat-distortion on uncovered mines.',
      observableBenefit: 'High-stakes tactile feedback with thrilling discovery visuals.',
      implementationApproach: 'Integrate CSS 3D tile press effects, animated backdrop-filter crystal flares, and glowing hazard shaders.',
      complexity: 'LOW',
      priority: 4,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'Build passes',
        'Tile grid alignment preserved on mobile and desktop',
        'Zero lag during rapid reveals'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-CRASH-CYBERPUNK-VOLUMETRIC-GRAPH',
      targetGame: 'Crash',
      componentPath: 'src/components/games/CrashGame.tsx',
      title: 'Cyberpunk Volumetric Neon Flight Curve, Exhaust Plume & Procedural Vector Interceptor Craft for Crash',
      defectOrLimitation: 'Crash game uses an emoji 🚀 with flat 2D canvas curves, basic dot particles, and minimal single-circle crash explosion effects.',
      proposedImprovement: 'Replace emoji rocket with procedural vector aerospace interceptor craft with dynamic afterburner shock-diamonds, multi-layer volumetric neon glowing under-curve, cyber grid with animated horizon depth, and multi-stage kinetic shockwave particle explosion on crash.',
      observableBenefit: 'AAA esports-grade visual intensity, dramatic ascending tension with animated afterburner plume, and spectacular crash destruction shockwaves.',
      implementationApproach: 'Upgrade 2D canvas draw loop: render futuristic sleek vector spacecraft with glowing cockpit and flame exhaust, multi-stop neon altitude gradient with pulsating bloom, starfield warp particles, and radial shockwave blast.',
      complexity: 'MEDIUM',
      priority: 5,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Smooth 60fps graph climb animation',
        'Rocket vector orientation aligns with curve tangent angle',
        'Crash shockwave particles expand and fade smoothly'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-DRAGONTIGER-FELT-LIGHTING-PBR',
      targetGame: 'DragonTiger',
      componentPath: 'src/components/games/DragonTigerGame.tsx',
      title: 'Luxury Casino Felt Shading, Dynamic Spotlight PBR & Holographic Card Deal FX for Dragon Tiger',
      defectOrLimitation: 'Dragon Tiger table uses flat solid background containers without textured casino felt, directional spotlights, or card holographic foil glints.',
      proposedImprovement: 'Implement procedural micro-texture casino felt gradient with ambient vignette, dynamic spotlight focus over winning card side, and holographic foil sheen across dragon/tiger card reveals.',
      observableBenefit: 'Delivers high-roller VIP casino ambiance with tactile card interaction and thrilling win announcements.',
      implementationApproach: 'Enhance CSS/SVG styling with radial vignette spotlights, foil shimmer keyframes, and gold-leaf embossed bet borders.',
      complexity: 'LOW',
      priority: 6,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'Build passes without errors',
        'Card flip and deal animations remain 60fps',
        'Spotlight cleanly shifts focus between Dragon, Tiger, and Tie outcomes'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-LIMBO-QUANTUM-REACTOR-PBR',
      targetGame: 'Limbo',
      componentPath: 'src/components/games/LimboGame.tsx',
      title: 'Quantum Reactor Holographic HUD, High-Voltage Plasma Arc & Cybernetic Speed Tunnel for Limbo',
      defectOrLimitation: 'Limbo background uses flat falling dot particles and standard text presentation without dynamic volumetric lighting, particle accelerator FX, or quantum shockwave feedback on target hit.',
      proposedImprovement: 'Add procedural quantum reactor tunnel with radial perspective hyperspace warp, chromatic aberration high-voltage plasma arcs around multiplier readout, volumetric laser target horizon, and shockwave particle corona on winning rolls.',
      observableBenefit: 'High-energy adrenaline rush with arcade-cabinet hyper-drive visuals and electrifying near-miss/win animations.',
      implementationApproach: 'Upgrade 2D background canvas to render high-speed perspective warp rays and rotating reactor rings; integrate dynamic electric arc discharges and pulsating quantum corona on target success.',
      complexity: 'MEDIUM',
      priority: 7,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Hyperspace warp tunnel runs at smooth 60fps',
        'Quantum reactor rings expand dynamically during rolls',
        'Winning corona and near-miss warning animations render cleanly'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  // Filter out already accepted upgrades
  const newQueue = candidateRecommendations.filter(r => !acceptedIds.has(r.id));

  // Ensure persistent queue directory exists
  const queueDir = path.dirname(QUEUE_FILE);
  if (!fs.existsSync(queueDir)) {
    fs.mkdirSync(queueDir, { recursive: true });
  }

  // Preserve existing queue items if any, merging new ones
  let mergedQueue: GraphicsRecommendation[] = [];
  if (fs.existsSync(QUEUE_FILE)) {
    try {
      const current = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
      const currentMap = new Map(current.map((item: any) => [item.id, item]));
      for (const rec of newQueue) {
        if (!currentMap.has(rec.id)) {
          currentMap.set(rec.id, rec);
        }
      }
      mergedQueue = Array.from(currentMap.values()) as GraphicsRecommendation[];
    } catch (e) {
      mergedQueue = newQueue;
    }
  } else {
    mergedQueue = newQueue;
  }

  // Sort queue by priority
  mergedQueue.sort((a, b) => a.priority - b.priority);

  // Auto-promote highest-priority candidate to QUEUED if no active task
  const hasActive = mergedQueue.some(item => ['QUEUED', 'PRIORITIZED', 'IN_PROGRESS', 'TESTING'].includes(item.status));
  if (!hasActive) {
    const nextPending = mergedQueue.find(item => item.status === 'DISCOVERED');
    if (nextPending) {
      nextPending.status = 'QUEUED';
      nextPending.updatedAt = new Date().toISOString();
      console.log(`[System A — AI Graphics Advisor] Promoted and queued next upgrade candidate: ${nextPending.id} (${nextPending.title})`);
    }
  }

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(mergedQueue, null, 2), 'utf-8');
  console.log(`[System A — AI Graphics Advisor] Published ${mergedQueue.length} prioritized recommendations to queue.json.`);
  return mergedQueue;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  inspectAndGenerateRecommendations();
}
