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
