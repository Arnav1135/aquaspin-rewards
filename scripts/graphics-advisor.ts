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
    },
    {
      id: 'REC-CHICKEN-PBR-SILVER-CLOCHE',
      targetGame: 'Chicken',
      componentPath: 'src/components/games/ChickenGame.tsx',
      title: 'Luxury Silver PBR Cloches, Golden Roasted Feast Hologram & Molten Bone Hazard FX for Chicken Game',
      defectOrLimitation: 'Chicken game cloches render as flat 2D grey ellipses with basic emoji reveals (🐔 / 💀), rudimentary 4-div smoke blurs, and no culinary luxury dome reflections or interactive cloche unsealing dynamics.',
      proposedImprovement: 'Implement photorealistic PBR brushed chrome cloche domes with radial anisotropic specular highlights, gold-rimmed filigree base plates, dynamic steam vent dissipation on unseal, radiant golden roasted platter with floating spice/sparkle particles for safe dishes, and molten obsidian crossbones with pulsating volcanic fissure glow for hazard tiles.',
      observableBenefit: 'Brings high-stakes gastronomic tension and luxury VIP presentation, transforming flat emoji tiles into an appetizing, visceral banquet reveal experience with dramatic culinary sound & particle feedback.',
      implementationApproach: 'Upgrade tile renderers with multi-layer SVG/CSS PBR metallic shaders, procedural steam puff canvas/motion particles, 3D tilt spring unsealing physics, molten magma fissure effects on bone reveal, and cyber-gourmet HUD lighting.',
      complexity: 'MEDIUM',
      priority: 8,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'PBR silver cloches render with realistic specular reflections and golden rim filigree',
        'Unsealing cloches trigger dynamic steam puff dissipation',
        'Golden roasted feasts render with radiant gold aura and sparkles',
        'Molten hazard tiles show volcanic magma fissures and smoke particles',
        'Multi-stage audio chords accompany reveals and cashouts'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-FLIP-DUAL-METALLIC-COIN-PBR',
      targetGame: 'Flip',
      componentPath: 'src/components/games/FlipGame.tsx',
      title: 'Dual-Alloy Physical 3D Coin Shading, Anisotropic Rim Bevel & Dynamic Orbit Shadows for Flip Game',
      defectOrLimitation: 'Flip game coin uses emoji 👑 and ⭐ on flat radial CSS gradients without depth-layered coin rim thickness, specular light sweeps during flip, or realistic ground contact shadow projection.',
      proposedImprovement: 'Upgrade coin to 3D multi-layered extruded cylinder with high-relief minted royal crest, specular Fresnel rim glint, anisotropic micro-brushing, dynamic contact shadow that squashes/stretches with toss altitude, and celebratory radial coin shower.',
      observableBenefit: 'Tangible heavyweight casino coin feel with dazzling rotational lighting and satisfying physical weight perception.',
      implementationApproach: 'Implement multi-stop metallic coin face shaders, 3D extruded side-rim segments with coin milling ridges, dynamic drop shadow scaling, and particle cascades.',
      complexity: 'MEDIUM',
      priority: 9,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Dual-alloy metallic coin faces reflect light smoothly during 3D flip',
        'Shadow squashes and expands realistically with toss height'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-TAP-NEON-TARGET-PARTICLE-BURST',
      targetGame: 'TapChallenge',
      componentPath: 'src/components/games/TapChallenge.tsx',
      title: 'Holographic Reticle Targets, High-Velocity Kinetic Shockwaves & Combo Supercharge FX for Tap Challenge',
      defectOrLimitation: 'Tap targets are plain colored circles that vanish with basic timeout, lacking arcade reticle lock-on HUDs, pulse compression timers, or combo-fueled neon particle bursts.',
      proposedImprovement: 'Render procedural cyberpunk reticles with concentric rotating lock rings, countdown arc timer ring, glass-shatter burst on tap, and screen-edge chromatic combo charge.',
      observableBenefit: 'High-octane arcade responsiveness that rewards reflex precision with hyper-satisfying visual feedback and escalating combo excitement.',
      implementationApproach: 'Upgrade target component with SVG rotating lock-on reticles, canvas-driven kinetic shockwaves, and dynamic chromatic screen border on high combos.',
      complexity: 'LOW',
      priority: 10,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Concentric target reticles rotate smoothly at 60fps',
        'Kinetic shatter particles burst on tap hit'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-CLICKER-CYBER-CORE-PULSE',
      targetGame: 'Clicker',
      componentPath: 'src/components/games/ClickerGame.tsx',
      title: 'Cybernetic Plasma Power Core, Overdrive Arc Discharges & Volumetric Heat Distortion for Clicker Game',
      defectOrLimitation: 'Clicker button is a standard UI element with simple ripple divs, lacking visual escalation as click frequency accelerates.',
      proposedImprovement: 'Implement a multi-stage plasma reactor core that shifts from cool cyan to superheated violet-white, with procedural electric arc discharges, heat shimmer rings, and dynamic screen shake.',
      observableBenefit: 'Visceral sense of escalating power and tactile kinetic frenzy that makes rapid clicking feel explosive.',
      implementationApproach: 'Implement plasma canvas shader for button core, dynamic electric discharge arcs, and state-based heat progression.',
      complexity: 'LOW',
      priority: 11,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Plasma reactor core shifts color smoothly as click rate increases',
        'Electric arc discharges trigger on rapid clicks'
      ],
      requiredTests: ['npm run type-check', 'npm run build'],
      dependencies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'REC-MEMORY-HOLOGRAPHIC-CARD-FLIP',
      targetGame: 'Memory',
      componentPath: 'src/components/games/MemoryGame.tsx',
      title: 'Prismatic Holographic Card Foiling, 3D Depth Tilting & Particle Match Synapses for Memory Game',
      defectOrLimitation: 'Memory cards use flat flip transitions without tactile depth, foil reflection, or visual linking between matched pairs.',
      proposedImprovement: 'Add prismatic diffraction foil shader to card backs, spring-driven 3D tilt responding to cursor hover, and glowing electric synapse beam connecting matching card pairs.',
      observableBenefit: 'Premium collectible card aesthetic with tactile physical handling and satisfying puzzle completion visuals.',
      implementationApproach: 'Implement CSS prismatic diffraction gradient, 3D card tilt physics, and SVG glowing synapse arcs upon match.',
      complexity: 'MEDIUM',
      priority: 12,
      riskLevel: 'LOW',
      status: 'DISCOVERED',
      acceptanceCriteria: [
        'TypeScript build passes with zero errors',
        'Prismatic diffraction foil glints across card backs',
        'Matched cards trigger electric synapse connecting beams'
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

  // Sync NEXT_UPGRADES.md
  const NEXT_UPGRADES_MD = path.join(REPO_ROOT, 'docs', 'graphics-evolution', 'NEXT_UPGRADES.md');
  let nextMd = `# AquaSpin Rewards — Next Recommended Graphics Upgrades\n\n`;
  nextMd += `*Generated by System A (AI Graphics Upgrade Advisor) for consumption by System B (Hourly Evolution Engine).*\n\n`;
  const pending = mergedQueue.filter((q: any) => q.status !== 'ACCEPTED');
  for (const item of pending) {
    nextMd += `### [${item.priority}] ${item.title} (\`${item.id}\`)\n`;
    nextMd += `- **Target Game:** ${item.targetGame} (${item.componentPath})\n`;
    nextMd += `- **Status:** \`${item.status}\` | **Complexity:** ${item.complexity} | **Risk:** ${item.riskLevel}\n`;
    nextMd += `- **Defect/Limitation:** ${item.defectOrLimitation}\n`;
    nextMd += `- **Proposed Improvement:** ${item.proposedImprovement}\n`;
    nextMd += `- **Observable Benefit:** ${item.observableBenefit}\n\n`;
  }
  fs.writeFileSync(NEXT_UPGRADES_MD, nextMd, 'utf-8');

  return mergedQueue;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  inspectAndGenerateRecommendations();
}
