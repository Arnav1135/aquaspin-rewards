import { useEffect, useRef, useState, useCallback } from 'react';
import { GameFrame } from './GameFrame';
import { Button } from '@/components/ui/Button';
import { DedicatedCloseButton } from '@/components/ui/DedicatedCloseButton';
import { audio } from '@/lib/audioEngine';
import { secureRecordGameResult, secureUpdateTokens } from '@/lib/secureEconomy';
import { useAuthStore } from '@/features/authStore';
import { Gauge, Fuel, Coins, Trophy, Wrench, Play, RotateCcw, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

// Vehicle Types & Abilities
export type VehicleType = 'jeep' | 'monster' | 'motocross' | 'racecar';
export type StageType = 'countryside' | 'desert' | 'moon' | 'arctic';

export interface VehicleConfig {
  id: VehicleType;
  name: string;
  icon: string;
  cost: number;
  ability: string;
  wheelRadius: number;
  wheelDist: number;
  bodyRadius: number;
  engineMultiplier: number;
  gravityFactor: number;
  airControlFactor: number;
  fuelEfficiency: number; // lower means drains slower
  suspensionDamp: number;
  primaryColor: string;
  secondaryColor: string;
}

export interface StageConfig {
  id: StageType;
  name: string;
  icon: string;
  desc: string;
  gravity: number;
  surfaceFriction: number;
  skyColors: [string, string, string, string];
  sunColor: string;
  groundSurfaceColor: string;
  groundSubColor: string;
  groundFillColor: string;
  mountainColor1: string;
  mountainColor2: string;
}

export const VEHICLES: Record<VehicleType, VehicleConfig> = {
  jeep: {
    id: 'jeep',
    name: 'Hill Climber Jeep',
    icon: '🚙',
    cost: 0,
    ability: 'All-Terrain 4WD: Balanced climbing, sturdy roll cage, reliable torque.',
    wheelRadius: 16,
    wheelDist: 60,
    bodyRadius: 30,
    engineMultiplier: 1.0,
    gravityFactor: 1.0,
    airControlFactor: 1.0,
    fuelEfficiency: 1.0,
    suspensionDamp: 1.0,
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
  },
  monster: {
    id: 'monster',
    name: 'Monster Truck',
    icon: '🛻',
    cost: 1500,
    ability: 'Colossal Wheels: 26px tires roll over boulders & steep ledges with huge suspension.',
    wheelRadius: 24,
    wheelDist: 72,
    bodyRadius: 36,
    engineMultiplier: 1.35,
    gravityFactor: 1.1,
    airControlFactor: 0.85,
    fuelEfficiency: 1.25,
    suspensionDamp: 1.4,
    primaryColor: '#8b5cf6',
    secondaryColor: '#6d28d9',
  },
  motocross: {
    id: 'motocross',
    name: 'Motocross Bike',
    icon: '🏍️',
    cost: 2800,
    ability: 'Agile Air Acrobat: 2x faster air flips, lightweight chassis, nitro speed.',
    wheelRadius: 14,
    wheelDist: 48,
    bodyRadius: 22,
    engineMultiplier: 1.25,
    gravityFactor: 0.95,
    airControlFactor: 1.9,
    fuelEfficiency: 0.85,
    suspensionDamp: 0.85,
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
  },
  racecar: {
    id: 'racecar',
    name: 'Super Race Car',
    icon: '🏎️',
    cost: 5000,
    ability: 'Downforce Boost: Extreme top speed, ultra-low center of gravity & grip.',
    wheelRadius: 13,
    wheelDist: 66,
    bodyRadius: 26,
    engineMultiplier: 1.6,
    gravityFactor: 1.05,
    airControlFactor: 1.1,
    fuelEfficiency: 1.1,
    suspensionDamp: 0.7,
    primaryColor: '#06b6d4',
    secondaryColor: '#0284c7',
  },
};

export const STAGES: Record<StageType, StageConfig> = {
  countryside: {
    id: 'countryside',
    name: 'Countryside',
    icon: '🌲',
    desc: 'Lush green rolling hills with pleasant breezes and smooth dips.',
    gravity: 920,
    surfaceFriction: 1.0,
    skyColors: ['#38a8e8', '#82cbf7', '#d8f1ff', '#eaf7ff'],
    sunColor: '#fff9d6',
    groundSurfaceColor: '#32ab42',
    groundSubColor: '#43220c',
    groundFillColor: '#653816',
    mountainColor1: '#86c99c',
    mountainColor2: '#5eb87a',
  },
  desert: {
    id: 'desert',
    name: 'Desert Dunes',
    icon: '🏜️',
    desc: 'Steep shifting sand dunes, scorching sun, and loose gravel friction.',
    gravity: 900,
    surfaceFriction: 0.88,
    skyColors: ['#f59e0b', '#fbbf24', '#fed7aa', '#ffedd5'],
    sunColor: '#fffbeb',
    groundSurfaceColor: '#facc15',
    groundSubColor: '#ca8a04',
    groundFillColor: '#854d0e',
    mountainColor1: '#d97706',
    mountainColor2: '#b45309',
  },
  moon: {
    id: 'moon',
    name: 'The Moon',
    icon: '🌑',
    desc: 'Ultra-low gravity (1/3rd Earth)! Massive lunar craters and giant floaty air flips.',
    gravity: 340,
    surfaceFriction: 1.15,
    skyColors: ['#030712', '#0f172a', '#1e293b', '#090d16'],
    sunColor: '#e2e8f0',
    groundSurfaceColor: '#94a3b8',
    groundSubColor: '#475569',
    groundFillColor: '#1e293b',
    mountainColor1: '#334155',
    mountainColor2: '#1e293b',
  },
  arctic: {
    id: 'arctic',
    name: 'Arctic Ice',
    icon: '❄️',
    desc: 'Slippery glacier crests with low tire grip and icy ramps.',
    gravity: 920,
    surfaceFriction: 0.65,
    skyColors: ['#0284c7', '#38bdf8', '#bae6fd', '#e0f2fe'],
    sunColor: '#ffffff',
    groundSurfaceColor: '#e0f2fe',
    groundSubColor: '#7dd3fc',
    groundFillColor: '#0369a1',
    mountainColor1: '#38bdf8',
    mountainColor2: '#0284c7',
  },
};

// Vehicle Upgrade levels (Engine, Suspension, Tires, 4WD)
interface Upgrades {
  engine: number;      // 0 - 5 (Increases acceleration & top torque)
  suspension: number;  // 0 - 5 (Absorbs harsh bumps & stabilizes chassis)
  tires: number;       // 0 - 5 (Increases surface grip & friction)
  fourWheel: number;   // 0 - 5 (Front wheel power ratio & climbing angle)
}

const UPGRADE_COSTS = [150, 300, 600, 1200, 2500, 5000];

export function HillClimbRacingGame({ onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const profile = useAuthStore((s) => s.profile);

  // Selected vehicle & unlocked vehicles
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>(() => {
    return (localStorage.getItem('hcr_selected_veh') as VehicleType) || 'jeep';
  });

  const [unlockedVehicles, setUnlockedVehicles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hcr_unlocked_veh');
      return saved ? JSON.parse(saved) : ['jeep'];
    } catch {
      return ['jeep'];
    }
  });

  // Selected stage
  const [selectedStage, setSelectedStage] = useState<StageType>(() => {
    return (localStorage.getItem('hcr_selected_stage') as StageType) || 'countryside';
  });

  // Upgrade state persisted in local storage
  const [upgrades, setUpgrades] = useState<Upgrades>(() => {
    try {
      const saved = localStorage.getItem('hcr_upgrades');
      return saved ? JSON.parse(saved) : { engine: 0, suspension: 0, tires: 0, fourWheel: 0 };
    } catch {
      return { engine: 0, suspension: 0, tires: 0, fourWheel: 0 };
    }
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [deathReason, setDeathReason] = useState<string>('');
  
  // Game session HUD stats
  const [hudStats, setHudStats] = useState({
    distance: 0,
    coins: 0,
    fuel: 100,
    speed: 0,
    rpm: 0,
    bestDistance: parseInt(localStorage.getItem('hcr_best_dist') || '0', 10),
    totalCoins: parseInt(localStorage.getItem('hcr_wallet_coins') || '500', 10),
  });

  // 1v1 Ghost Multiplayer Telemetry State
  const [ghostMode, setGhostMode] = useState<boolean>(() => {
    return localStorage.getItem('hcr_ghost_enabled') === 'true';
  });
  const ghostTrajectoryRef = useRef<Array<{ x: number; y: number; angle: number; time: number }>>([]);
  const ghostRecordRef = useRef<Array<{ x: number; y: number; angle: number; time: number }>>([]);
  const ghostTimeRef = useRef<number>(0);
  const [ghostDistance, setGhostDistance] = useState<number>(0);



  // Touch controls state
  const touchGasRef = useRef(false);
  const touchBrakeRef = useRef(false);

  // Offscreen pre-rendered textures (Dirt pattern & Rock noise)
  const dirtPatternRef = useRef<CanvasPattern | null>(null);

  // Core physics & game simulation ref
  const simRef = useRef({
    distance: 0,
    coinsCollected: 0,
    fuel: 100,
    speedKmh: 0,
    rpm: 800,
    airTime: 0,
    flips: 0,
    prevAngle: 0,
    accumulatedRotation: 0,
    lastCoinSpawnDist: 100,
    lastGasSpawnDist: 350,
    gameOver: false,
    deathReason: '',

    // Ragdoll Driver Bill Newton
    driver: {
      headAngle: 0,
      headAngularVel: 0,
      neckLength: 12,
      bodyAngle: 0,
      expression: 'normal' as 'normal' | 'scared' | 'crashed' | 'air',
      blinkTimer: 0,
    },

    // Vehicle State
    car: {
      x: 180,
      y: 200,
      vx: 0,
      vy: 0,
      angle: 0,        // chassis rotation radians
      angularVel: 0,   // angular velocity
      wheelDist: 60,   // distance between front and rear axle
      bodyRadius: 30,  // bounding circle radius for chassis
      driverHeadOffset: { x: -8, y: -30 }, // Head location relative to center
      wheelRadius: 16,
      rearWheelY: 0,
      frontWheelY: 0,
      rearSuspensionOffset: 0,
      frontSuspensionOffset: 0,
      rearGrounded: false,
      frontGrounded: false,
      wheelSpinRear: 0,
      wheelSpinFront: 0,
    },

    // Camera follow offset & dynamic zoom
    camera: { x: 0, y: 0, zoom: 1.0 },

    // Dynamic objects
    coins: [] as Array<{ x: number; y: number; collected: boolean; value: number; rot: number }>,
    gasCans: [] as Array<{ x: number; y: number; collected: boolean; floatOffset: number }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>,
    floatingTexts: [] as Array<{ x: number; y: number; text: string; color: string; life: number }>,
    clouds: [] as Array<{ x: number; y: number; speed: number; scale: number; opacity: number }>,

    // Controls
    gas: false,
    brake: false,

    // Upgrades copy
    upgrades: { engine: 0, suspension: 0, tires: 0, fourWheel: 0 },
  });

  // Keep ref synchronized with current upgrades
  useEffect(() => {
    simRef.current.upgrades = upgrades;
    localStorage.setItem('hcr_upgrades', JSON.stringify(upgrades));
  }, [upgrades]);

  // Audio helpers using audioEngine API
  const playSfx = useCallback((type: 'coin' | 'gas' | 'crash' | 'upgrade' | 'flip') => {
    if (!soundEnabled) return;
    try {
      if (type === 'coin') {
        audio.playChime(1100, 0.15, 0.35);
      } else if (type === 'gas') {
        audio.playChime(550, 0.2, 0.4);
        setTimeout(() => audio.playChime(750, 0.3, 0.4), 80);
      } else if (type === 'crash') {
        audio.playNoiseBurst(0.6, 2500);
        audio.playClick(150, 0.3, 'sawtooth');
      } else if (type === 'upgrade') {
        audio.playChime(500, 0.15, 0.3);
        setTimeout(() => audio.playChime(750, 0.15, 0.35), 70);
        setTimeout(() => audio.playChime(1000, 0.3, 0.4), 140);
      } else if (type === 'flip') {
        audio.playClick(850, 0.15, 'square');
        setTimeout(() => audio.playChime(1200, 0.3, 0.4), 70);
      }
    } catch {
      // Audio engine fallback
    }
  }, [soundEnabled]);

  // Heightmap function for procedural terrain based on selected map/stage
  const getTerrainHeight = useCallback((worldX: number) => {
    if (selectedStage === 'moon') {
      // Moon: Vast low craters, huge soaring peaks, and low undulating plains
      const crater = Math.sin(worldX * 0.002) * 110;
      const ridges = Math.cos(worldX * 0.006 + 1.5) * 45;
      const ripple = Math.sin(worldX * 0.018) * 15;
      return 370 + crater + ridges + ripple;
    } else if (selectedStage === 'desert') {
      // Desert: Steep shifting razor dunes and long sandy downhill slides
      const dune1 = Math.sin(worldX * 0.004) * 95;
      const dune2 = Math.sin(worldX * 0.009 + 2.0) * 65;
      const ripple = Math.sin(worldX * 0.04) * 6;
      const steepClimb = worldX > 1000 ? Math.sin(worldX * 0.0015) * 70 : 0;
      return 360 + dune1 + dune2 + ripple + steepClimb;
    } else if (selectedStage === 'arctic') {
      // Arctic: Slippery glacier steps, jagged ice cliffs, and ramp crests
      const glacier = Math.sin(worldX * 0.003) * 80;
      const iceCrags = Math.cos(worldX * 0.012 + 0.8) * 40;
      const crevasse = Math.sin(worldX * 0.025) * 18;
      const mountainRamp = worldX > 800 ? Math.sin(worldX * 0.002) * 60 : 0;
      return 365 + glacier + iceCrags + crevasse + mountainRamp;
    } else {
      // Countryside: Classic rolling hills and pleasant dips
      const h1 = Math.sin(worldX * 0.0035) * 85;
      const h2 = Math.sin(worldX * 0.008 + 1.2) * 55;
      const h3 = Math.cos(worldX * 0.016 + 2.5) * 25;
      const h4 = Math.sin(worldX * 0.035) * 8; // Small bumps
      const steep = worldX > 1500 ? Math.sin(worldX * 0.0018) * 60 : 0;
      return 360 + h1 + h2 + h3 + h4 + steep;
    }
  }, [selectedStage]);

  // Normal vector & tangent of terrain at worldX
  const getTerrainNormal = useCallback((worldX: number) => {
    const delta = 2.0;
    const y1 = getTerrainHeight(worldX - delta);
    const y2 = getTerrainHeight(worldX + delta);
    const slope = (y2 - y1) / (2 * delta);
    const angle = Math.atan2(slope, 1);
    return {
      angle,
      nx: -Math.sin(angle),
      ny: Math.cos(angle),
      slope,
    };
  }, [getTerrainHeight]);

  // Load best ghost recording if exists
  useEffect(() => {
    try {
      const savedGhost = localStorage.getItem(`hcr_ghost_${selectedStage}`);
      if (savedGhost) {
        ghostTrajectoryRef.current = JSON.parse(savedGhost);
      } else {
        // Generate high-skill rival ghost telemetry
        const mockGhost: Array<{ x: number; y: number; angle: number; time: number }> = [];
        let gx = 180;
        let gvx = 180;
        for (let t = 0; t < 120; t += 0.2) {
          gx += gvx * 0.2;
          gvx += (Math.random() - 0.45) * 15;
          const gy = getTerrainHeight(gx) - 20;
          const norm = getTerrainNormal(gx);
          mockGhost.push({ x: gx, y: gy, angle: norm.angle, time: t });
        }
        ghostTrajectoryRef.current = mockGhost;
      }
    } catch {
      ghostTrajectoryRef.current = [];
    }
  }, [selectedStage, getTerrainHeight, getTerrainNormal]);

  // Pre-generate procedural clouds
  useEffect(() => {
    const clouds = [];
    for (let i = 0; i < 15; i++) {
      clouds.push({
        x: i * 220 + Math.random() * 80,
        y: 40 + Math.random() * 90,
        speed: 15 + Math.random() * 20,
        scale: 0.7 + Math.random() * 0.6,
        opacity: 0.65 + Math.random() * 0.3,
      });
    }
    simRef.current.clouds = clouds;
  }, []);

  // Reset or Start Run
  const startRace = useCallback(() => {
    const vConfig = VEHICLES[selectedVehicle] || VEHICLES.jeep;
    const initialY = getTerrainHeight(180) - 50;
    ghostTimeRef.current = 0;
    ghostRecordRef.current = [];
    simRef.current = {
      distance: 0,
      coinsCollected: 0,
      fuel: 100,
      speedKmh: 0,
      rpm: 900,
      airTime: 0,
      flips: 0,
      prevAngle: 0,
      accumulatedRotation: 0,
      lastCoinSpawnDist: 100,
      lastGasSpawnDist: 350,
      gameOver: false,
      deathReason: "",
      driver: {
        headAngle: 0,
        headAngularVel: 0,
        neckLength: 12,
        bodyAngle: 0,
        expression: "normal",
        blinkTimer: 0,
      },
      car: {
        x: 180,
        y: initialY,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVel: 0,
        wheelDist: vConfig.wheelDist,
        bodyRadius: vConfig.bodyRadius,
        driverHeadOffset: selectedVehicle === "motocross" ? { x: -4, y: -26 } : { x: -8, y: -30 },
        wheelRadius: vConfig.wheelRadius,
        rearWheelY: initialY,
        frontWheelY: initialY,
        rearSuspensionOffset: 0,
        frontSuspensionOffset: 0,
        rearGrounded: false,
        frontGrounded: false,
        wheelSpinRear: 0,
        wheelSpinFront: 0,
      },
      camera: { x: 180, y: initialY, zoom: 1.0 },
      coins: [],
      gasCans: [],
      particles: [],
      floatingTexts: [],
      clouds: simRef.current.clouds,
      gas: false,
      brake: false,
      upgrades: { ...upgrades },
    };

    // Pre-populate initial coins & fuel cans
    for (let x = 300; x < 2500; x += 180) {
      if (Math.random() > 0.25) {
        simRef.current.coins.push({
          x,
          y: getTerrainHeight(x) - 45 - Math.sin(x * 0.05) * 20,
          collected: false,
          value: 25,
          rot: Math.random() * Math.PI * 2,
        });
      }
    }
    for (let x = 600; x < 2500; x += 650) {
      simRef.current.gasCans.push({
        x,
        y: getTerrainHeight(x) - 32,
        collected: false,
        floatOffset: 0,
      });
    }

    setGameState('playing');
    setDeathReason('');
  }, [getTerrainHeight, upgrades]);

  // Upgrade Purchase Handler
  const handleBuyUpgrade = (type: keyof Upgrades) => {
    const currentLvl = upgrades[type];
    if (currentLvl >= 5) {
      toast('Max level already reached!', { icon: '⭐' });
      return;
    }
    const cost = UPGRADE_COSTS[currentLvl];
    if (hudStats.totalCoins < cost) {
      toast.error(`Not enough coins! Need ${cost} coins.`);
      return;
    }

    const nextWallet = hudStats.totalCoins - cost;
    const nextUpgrades = { ...upgrades, [type]: currentLvl + 1 };
    
    setUpgrades(nextUpgrades);
    setHudStats(prev => ({ ...prev, totalCoins: nextWallet }));
    localStorage.setItem('hcr_wallet_coins', nextWallet.toString());
    
    playSfx('upgrade');
    toast.success(`${type.toUpperCase()} upgraded to Level ${currentLvl + 1}!`);
  };

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        simRef.current.gas = true;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        simRef.current.brake = true;
      } else if (e.code === 'KeyR' && gameState === 'gameover') {
        startRace();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'KeyD' || e.code === 'ArrowRight') {
        simRef.current.gas = false;
      } else if (e.code === 'KeyA' || e.code === 'ArrowLeft') {
        simRef.current.brake = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState, startRace]);

  // Main Loop & AAA Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create high-res dirt & soil pattern once
    if (!dirtPatternRef.current) {
      const pCanvas = document.createElement('canvas');
      pCanvas.width = 64;
      pCanvas.height = 64;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        pCtx.fillStyle = '#653816'; // Deep earth base
        pCtx.fillRect(0, 0, 64, 64);
        // Add granular strata specks
        for (let i = 0; i < 120; i++) {
          const px = Math.random() * 64;
          const py = Math.random() * 64;
          const r = Math.random() * 2 + 0.5;
          pCtx.fillStyle = i % 2 === 0 ? '#4e280c' : '#7b481f';
          pCtx.beginPath();
          pCtx.arc(px, py, r, 0, Math.PI * 2);
          pCtx.fill();
        }
        // Small pebble rocks
        pCtx.fillStyle = '#9c8163';
        pCtx.fillRect(12, 14, 4, 3);
        pCtx.fillRect(44, 38, 5, 3);
        pCtx.fillRect(28, 52, 3, 3);
        dirtPatternRef.current = ctx.createPattern(pCanvas, 'repeat');
      }
    }

    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Clamp dt to prevent tunneling
      lastTime = now;

      // Handle High-DPI Resolution
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
      const height = canvas.parentElement ? canvas.parentElement.clientHeight : 520;

      if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
        canvas.width = width * dpr;
        canvas.height = height * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      const sim = simRef.current;
      const car = sim.car;
      const driver = sim.driver;

      // Merge Touch Controls with Key Controls across frame
      const isGas = (sim.gas || touchGasRef.current) && gameState === 'playing' && !sim.gameOver;
      const isBrake = (sim.brake || touchBrakeRef.current) && gameState === 'playing' && !sim.gameOver;

      if (gameState === 'playing' && !sim.gameOver) {
        const vConfig = VEHICLES[selectedVehicle] || VEHICLES.jeep;
        const stageConfig = STAGES[selectedStage] || STAGES.countryside;

        // Upgrade multipliers coupled with vehicle abilities
        const enginePower = (340 + sim.upgrades.engine * 55) * vConfig.engineMultiplier;
        const suspensionStrength = (0.55 + sim.upgrades.suspension * 0.12) * vConfig.suspensionDamp;
        const tireGrip = (1.0 + sim.upgrades.tires * 0.22) * stageConfig.surfaceFriction;
        const frontPowerRatio = 0.35 + sim.upgrades.fourWheel * 0.13;

        // 1. Fuel Depletion (Modulated by Vehicle Fuel Efficiency)
        const fuelDrainRate = (isGas ? 4.8 : 1.2) * vConfig.fuelEfficiency;
        sim.fuel = Math.max(0, sim.fuel - fuelDrainRate * dt);
        if (sim.fuel <= 0) {
          sim.gameOver = true;
          sim.deathReason = 'OUT OF GAS!';
          setDeathReason('OUT OF GAS!');
          setGameState('gameover');
          playSfx('crash');
        }

        // 2. Wheel Positions in World Coordinates
        const cosA = Math.cos(car.angle);
        const sinA = Math.sin(car.angle);
        const halfAxle = car.wheelDist / 2;

        const rearAxleX = car.x - halfAxle * cosA;
        const rearAxleY = car.y - halfAxle * sinA;
        const frontAxleX = car.x + halfAxle * cosA;
        const frontAxleY = car.y + halfAxle * sinA;

        // Terrain heights below axles
        const groundRearY = getTerrainHeight(rearAxleX);
        const groundFrontY = getTerrainHeight(frontAxleX);

        // Suspension Rest & Spring Math
        const restLen = 22;
        const rearDist = groundRearY - rearAxleY;
        const frontDist = groundFrontY - frontAxleY;

        car.rearGrounded = rearDist <= restLen + car.wheelRadius;
        car.frontGrounded = frontDist <= restLen + car.wheelRadius;

        // Suspension offsets for animation
        car.rearSuspensionOffset = Math.max(-8, Math.min(8, (restLen + car.wheelRadius) - rearDist));
        car.frontSuspensionOffset = Math.max(-8, Math.min(8, (restLen + car.wheelRadius) - frontDist));

        // Gravity (Stage Dependent)
        const GRAVITY = stageConfig.gravity * vConfig.gravityFactor;
        car.vy += GRAVITY * dt;

        // Dynamic Driver Ragdoll Physics
        // The head tilts opposite to chassis acceleration and reacts to airtime/drops
        const targetHeadAngle = -car.angularVel * 0.35 + (isGas ? -0.15 : isBrake ? 0.25 : 0);
        driver.headAngularVel += (targetHeadAngle - driver.headAngle) * 22 * dt;
        driver.headAngularVel *= Math.pow(0.2, dt);
        driver.headAngle += driver.headAngularVel * dt;

        if (!car.rearGrounded && !car.frontGrounded) {
          driver.expression = Math.abs(car.angularVel) > 2.0 ? 'scared' : 'air';
        } else if (isGas && car.vx > 200) {
          driver.expression = 'normal';
        } else {
          driver.expression = 'normal';
        }

        // Air Tilt Control (Modulated by Vehicle Air Control Factor)
        if (!car.rearGrounded && !car.frontGrounded) {
          sim.airTime += dt;
          if (isGas) car.angularVel += (4.8 * vConfig.airControlFactor) * dt;   // Pitch up / back
          if (isBrake) car.angularVel -= (4.8 * vConfig.airControlFactor) * dt; // Pitch down / forward

          // Track Flips
          const deltaAngle = car.angle - sim.prevAngle;
          sim.accumulatedRotation += deltaAngle;
          if (Math.abs(sim.accumulatedRotation) >= Math.PI * 2) {
            sim.flips += 1;
            sim.accumulatedRotation = 0;
            sim.coinsCollected += 100;
            sim.floatingTexts.push({
              x: car.x,
              y: car.y - 45,
              text: 'FLIP BONUS! +100',
              color: '#FBBF24',
              life: 1.5,
            });
            playSfx('flip');
          }
        } else {
          // Landing reset
          if (sim.airTime > 1.2) {
            const bonus = Math.floor(sim.airTime * 25);
            sim.coinsCollected += bonus;
            sim.floatingTexts.push({
              x: car.x,
              y: car.y - 45,
              text: `AIR TIME! +${bonus}`,
              color: '#38BDF8',
              life: 1.2,
            });
          }
          sim.airTime = 0;
        }
        sim.prevAngle = car.angle;

        // Ground Suspension & Driving Forces
        const rearTerrain = getTerrainNormal(rearAxleX);
        const frontTerrain = getTerrainNormal(frontAxleX);

        if (car.rearGrounded) {
          const compression = Math.max(0, (restLen + car.wheelRadius) - rearDist);
          const springForce = compression * 420 * suspensionStrength;
          car.vy -= springForce * dt;

          // Drive force rear wheel
          if (isGas) {
            const forwardX = Math.cos(rearTerrain.angle);
            const forwardY = Math.sin(rearTerrain.angle);
            car.vx += forwardX * enginePower * tireGrip * dt;
            car.vy += forwardY * enginePower * tireGrip * dt;
            car.angularVel += 1.8 * dt; // Wheelie torque
            car.wheelSpinRear += 25 * dt;

            // Exhaust Smoke & Dirt Kickup
            if (Math.random() < 0.45) {
              sim.particles.push({
                x: rearAxleX - 12 * cosA,
                y: rearAxleY - 12 * sinA,
                vx: -car.vx * 0.25 + (Math.random() - 0.5) * 30,
                vy: -35 + Math.random() * 15,
                life: 0.65,
                maxLife: 0.65,
                color: 'rgba(200,210,225,0.7)',
                size: 4 + Math.random() * 4,
              });
              // Ground dirt dust
              sim.particles.push({
                x: rearAxleX,
                y: groundRearY - 2,
                vx: -car.vx * 0.15 - Math.random() * 40,
                vy: -20 - Math.random() * 20,
                life: 0.5,
                maxLife: 0.5,
                color: stageConfig.id === 'moon' ? '#94a3b8' : stageConfig.id === 'desert' ? '#ca8a04' : stageConfig.id === 'arctic' ? '#e0f2fe' : '#7b481f',
                size: 2 + Math.random() * 3,
              });
            }
          }
          if (isBrake) {
            car.vx *= Math.pow(0.08, dt);
            car.angularVel -= 2.2 * dt;
          }
        }

        if (car.frontGrounded) {
          const compression = Math.max(0, (restLen + car.wheelRadius) - frontDist);
          const springForce = compression * 420 * suspensionStrength;
          car.vy -= springForce * dt;

          // Drive force front wheel (4WD)
          if (isGas) {
            const forwardX = Math.cos(frontTerrain.angle);
            const forwardY = Math.sin(frontTerrain.angle);
            car.vx += forwardX * enginePower * frontPowerRatio * tireGrip * dt;
            car.vy += forwardY * enginePower * frontPowerRatio * tireGrip * dt;
            car.angularVel -= 1.2 * dt;
            car.wheelSpinFront += 25 * dt;
          }
          if (isBrake) {
            car.vx *= Math.pow(0.12, dt);
          }
        }

        // Align chassis rotation smoothly when touching ground
        if (car.rearGrounded || car.frontGrounded) {
          const targetAngle = Math.atan2(groundFrontY - groundRearY, (frontAxleX - rearAxleX));
          const angleDiff = targetAngle - car.angle;
          car.angularVel += angleDiff * 14 * dt;
          car.angularVel *= Math.pow(0.15, dt); // Angular damping
        } else {
          car.angularVel *= Math.pow(0.7, dt); // Air rotational drag
        }

        // Air drag & movement integration
        car.vx *= Math.pow(0.96, dt);
        car.vy *= Math.pow(0.98, dt);
        car.x += car.vx * dt;
        car.y += car.vy * dt;
        car.angle += car.angularVel * dt;

        // Ground Hard Collision Clamp
        const centerGroundY = getTerrainHeight(car.x);
        if (car.y > centerGroundY - 14) {
          car.y = centerGroundY - 14;
          if (car.vy > 0) car.vy = -car.vy * 0.15;
        }

        // 3. Driver Neck Snap / Head Ground Strike Detection (Classic HCR Crash Rule)
        // Only trigger if car is significantly tilted/inverted (upside down) and head hits terrain
        const headWorldX = car.x + car.driverHeadOffset.x * cosA - car.driverHeadOffset.y * sinA;
        const headWorldY = car.y + car.driverHeadOffset.x * sinA + car.driverHeadOffset.y * cosA;
        const headTerrainY = getTerrainHeight(headWorldX);

        // Normalize car angle between -PI and PI
        let normalizedAngle = ((car.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        if (normalizedAngle > Math.PI) normalizedAngle -= Math.PI * 2;
        const isCarInverted = Math.abs(normalizedAngle) > 1.25;

        if (isCarInverted && headWorldY >= headTerrainY - 1) {
          sim.gameOver = true;
          sim.deathReason = 'DRIVER DOWN! (NECK FLIP)';
          driver.expression = 'crashed';
          setDeathReason('DRIVER DOWN! (NECK FLIP)');
          setGameState('gameover');
          playSfx('crash');

          // Burst particles
          for (let p = 0; p < 25; p++) {
            sim.particles.push({
              x: headWorldX,
              y: headWorldY,
              vx: (Math.random() - 0.5) * 250,
              vy: -Math.random() * 200,
              life: 1.0,
              maxLife: 1.0,
              color: p % 2 === 0 ? '#EF4444' : '#F59E0B',
              size: 5 + Math.random() * 4,
            });
          }
        }

        // 4. Distance Tracking & High Score
        const currDistMeters = Math.max(0, Math.floor((car.x - 180) / 10));
        sim.distance = Math.max(sim.distance, currDistMeters);
        if (ghostMode && Math.random() < 0.2) {
          ghostRecordRef.current.push({ x: car.x, y: car.y, angle: car.angle, time: ghostTimeRef.current });
        }
        sim.speedKmh = Math.floor(Math.abs(car.vx) * 0.08);
        sim.rpm = Math.min(8500, Math.floor(800 + Math.abs(car.vx) * 12 + (isGas ? 2500 : 0)));

        // 5. Coin Pickups & Coin 3D Spin Animation
        sim.coins.forEach((coin) => {
          coin.rot += 3.5 * dt;
          if (!coin.collected) {
            const dx = car.x - coin.x;
            const dy = car.y - coin.y;
            if (Math.hypot(dx, dy) < 45) {
              coin.collected = true;
              sim.coinsCollected += coin.value;
              playSfx('coin');
              sim.floatingTexts.push({
                x: coin.x,
                y: coin.y - 20,
                text: `+${coin.value}`,
                color: '#FBBF24',
                life: 0.8,
              });
              // Sparkle particles
              for (let s = 0; s < 6; s++) {
                sim.particles.push({
                  x: coin.x,
                  y: coin.y,
                  vx: (Math.random() - 0.5) * 100,
                  vy: (Math.random() - 0.5) * 100,
                  life: 0.4,
                  maxLife: 0.4,
                  color: '#FEF08A',
                  size: 3,
                });
              }
            }
          }
        });

        // 6. Fuel Can Pickups & Floating bob
        sim.gasCans.forEach((gas) => {
          gas.floatOffset += 4 * dt;
          if (!gas.collected) {
            const dx = car.x - gas.x;
            const dy = car.y - gas.y;
            if (Math.hypot(dx, dy) < 48) {
              gas.collected = true;
              sim.fuel = 100;
              playSfx('gas');
              sim.floatingTexts.push({
                x: gas.x,
                y: gas.y - 25,
                text: 'GAS REFILLED! 100%',
                color: '#22C55E',
                life: 1.2,
              });
            }
          }
        });

        // 7. Dynamic Infinite Spawning Ahead of Car
        if (car.x > sim.lastCoinSpawnDist - 600) {
          const spawnX = sim.lastCoinSpawnDist + 220;
          sim.coins.push({
            x: spawnX,
            y: getTerrainHeight(spawnX) - 40 - Math.sin(spawnX * 0.04) * 25,
            collected: false,
            value: 25,
            rot: 0,
          });
          sim.lastCoinSpawnDist = spawnX;
        }

        if (car.x > sim.lastGasSpawnDist - 800) {
          const spawnX = sim.lastGasSpawnDist + 750 + Math.random() * 200;
          sim.gasCans.push({
            x: spawnX,
            y: getTerrainHeight(spawnX) - 30,
            collected: false,
            floatOffset: 0,
          });
          sim.lastGasSpawnDist = spawnX;
        }
      }

      // Smooth Camera Tracking with Speed-based Lead
      const camTargetX = car.x + Math.min(180, car.vx * 0.28) + 80;
      const camTargetY = car.y - 40;
      sim.camera.x += (camTargetX - sim.camera.x) * 0.1;
      sim.camera.y += (camTargetY - sim.camera.y) * 0.1;

      // ─── AAA GRAPHICS RENDERING PIPELINE ──────────────────
      ctx.clearRect(0, 0, width, height);

      const stageConfig = STAGES[selectedStage] || STAGES.countryside;

      // 1. Sky & Atmospheric Horizon Gradient (Stage Palette)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, stageConfig.skyColors[0]);
      skyGrad.addColorStop(0.55, stageConfig.skyColors[1]);
      skyGrad.addColorStop(0.85, stageConfig.skyColors[2]);
      skyGrad.addColorStop(1, stageConfig.skyColors[3]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 2. Sun with Warm Radiance Glow
      const sunScreenX = width * 0.82;
      const sunScreenY = height * 0.18;
      const sunGlow = ctx.createRadialGradient(sunScreenX, sunScreenY, 8, sunScreenX, sunScreenY, 90);
      sunGlow.addColorStop(0, 'rgba(255, 255, 200, 0.95)');
      sunGlow.addColorStop(0.3, 'rgba(255, 235, 120, 0.5)');
      sunGlow.addColorStop(1, 'rgba(255, 235, 120, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, 90, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = stageConfig.sunColor;
      ctx.beginPath();
      ctx.arc(sunScreenX, sunScreenY, 26, 0, Math.PI * 2);
      ctx.fill();

      // 3. Parallax Fluffy Cartoon Clouds / Lunar Stars
      sim.clouds.forEach((cloud) => {
        cloud.x -= cloud.speed * dt * 0.1;
        if (cloud.x < -150) cloud.x = width + 150;
        const renderCloudX = ((cloud.x - sim.camera.x * 0.05) % (width + 300)) - 100;
        
        ctx.save();
        ctx.translate(renderCloudX, cloud.y);
        ctx.scale(cloud.scale, cloud.scale);
        ctx.fillStyle = selectedStage === 'moon' ? 'rgba(255, 255, 255, 0.45)' : `rgba(255, 255, 255, ${cloud.opacity})`;
        ctx.beginPath();
        if (selectedStage === 'moon') {
          // Stars in space
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.arc(15, 12, 1.5, 0, Math.PI * 2);
          ctx.arc(-10, 8, 2, 0, Math.PI * 2);
        } else {
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.arc(20, -10, 28, 0, Math.PI * 2);
          ctx.arc(45, -5, 22, 0, Math.PI * 2);
          ctx.arc(60, 5, 18, 0, Math.PI * 2);
          ctx.arc(25, 10, 20, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      });

      // 4. Parallax Mountain Backdrop (Layer 1 - Far Distant Mountains)
      ctx.fillStyle = stageConfig.mountainColor1;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let sx = 0; sx <= width; sx += 25) {
        const worldX = (sim.camera.x * 0.12) + sx;
        const peakY = height * 0.48 + Math.sin(worldX * 0.0015) * 55 + Math.cos(worldX * 0.003) * 35;
        ctx.lineTo(sx, peakY);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // 5. Parallax Rolling Hills (Layer 2 - Midground Hills)
      ctx.fillStyle = stageConfig.mountainColor2;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let sx = 0; sx <= width; sx += 18) {
        const worldX = (sim.camera.x * 0.32) + sx;
        const hillY = height * 0.60 + Math.sin(worldX * 0.0035) * 65 + Math.cos(worldX * 0.006) * 35;
        ctx.lineTo(sx, hillY);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // World Coordinate Transforms
      ctx.save();
      const originScreenX = width * 0.35;
      const originScreenY = height * 0.65;
      ctx.translate(originScreenX - sim.camera.x, originScreenY - sim.camera.y);

      // Render Foreground Terrain Mesh
      const viewStartWorldX = sim.camera.x - originScreenX - 60;
      const viewEndWorldX = sim.camera.x + (width - originScreenX) + 60;
      const step = 6;

      ctx.beginPath();
      ctx.moveTo(viewStartWorldX, height + 900);
      for (let wx = viewStartWorldX; wx <= viewEndWorldX + step; wx += step) {
        ctx.lineTo(wx, getTerrainHeight(wx));
      }
      ctx.lineTo(viewEndWorldX, height + 900);
      ctx.closePath();

      // Deep Geological Earth Fill
      if (selectedStage === 'countryside' && dirtPatternRef.current) {
        ctx.fillStyle = dirtPatternRef.current;
        ctx.fill();
      } else {
        ctx.fillStyle = stageConfig.groundFillColor;
        ctx.fill();
      }

      // Dark Sub-crust Gradient Overlay
      const subCrustGrad = ctx.createLinearGradient(0, 300, 0, 1000);
      subCrustGrad.addColorStop(0, 'rgba(0,0,0,0)');
      subCrustGrad.addColorStop(0.4, 'rgba(0,0,0,0.15)');
      subCrustGrad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = subCrustGrad;
      ctx.fill();

      // Textured Dark Soil Horizon Layer (Underneath Surface)
      ctx.lineWidth = 26;
      ctx.strokeStyle = stageConfig.groundSubColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Terrain Surface Ribbon (Top Layer)
      ctx.lineWidth = 14;
      ctx.strokeStyle = stageConfig.groundSurfaceColor;
      ctx.stroke();

      // Vibrant Sunlit Surface Highlight
      ctx.lineWidth = 5;
      ctx.strokeStyle = stageConfig.groundSurfaceColor;
      ctx.stroke();

      // Procedural Stage Foliage, Crystals & Rocks on Hilltops
      for (let wx = Math.floor(viewStartWorldX / 40) * 40; wx <= viewEndWorldX; wx += 40) {
        const ty = getTerrainHeight(wx);
        const norm = getTerrainNormal(wx);
        if (Math.abs(norm.slope) < 0.6) {
          ctx.save();
          ctx.translate(wx, ty);
          ctx.rotate(norm.angle);

          if (stageConfig.id === 'countryside') {
            // Grass Blade tuft
            ctx.strokeStyle = '#42c038';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-4, 0); ctx.lineTo(-6, -8);
            ctx.moveTo(0, 0); ctx.lineTo(0, -11);
            ctx.moveTo(4, 0); ctx.lineTo(6, -8);
            ctx.stroke();
            // Occasional Yellow Country Flower
            if ((wx % 120) === 0) {
              ctx.fillStyle = '#FBBF24';
              ctx.beginPath();
              ctx.arc(0, -12, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (stageConfig.id === 'desert') {
            // Desert Shrub & Pebbles
            if ((wx % 80) === 0) {
              ctx.strokeStyle = '#a16207';
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.moveTo(0, 0); ctx.lineTo(-4, -7);
              ctx.moveTo(0, 0); ctx.lineTo(4, -8);
              ctx.stroke();
            } else if ((wx % 120) === 0) {
              ctx.fillStyle = '#78350f';
              ctx.beginPath();
              ctx.arc(0, -2, 2.5, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (stageConfig.id === 'arctic') {
            // Jagged Ice Crystal Spire
            if ((wx % 80) === 0) {
              ctx.fillStyle = 'rgba(224, 242, 254, 0.85)';
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(-3, 0);
              ctx.lineTo(0, -10);
              ctx.lineTo(3, 0);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
            }
          } else if (stageConfig.id === 'moon') {
            // Lunar Crater Ridge Rock
            if ((wx % 120) === 0) {
              ctx.fillStyle = '#475569';
              ctx.beginPath();
              ctx.arc(0, -3, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          ctx.restore();
        }
      }

      // Render 3D Gold Coins with Thickness & Specular Shimmer
      sim.coins.forEach((coin) => {
        if (!coin.collected && coin.x >= viewStartWorldX && coin.x <= viewEndWorldX) {
          ctx.save();
          ctx.translate(coin.x, coin.y);
          const spinScale = Math.cos(coin.rot);

          // Drop shadow on ground
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.ellipse(0, 36, 12, 4, 0, 0, Math.PI * 2);
          ctx.fill();

          // Outer Gold Rim with 3D projection
          ctx.fillStyle = '#b45309'; // Dark bronze edge
          ctx.beginPath();
          ctx.ellipse(0, 0, 14 * Math.abs(spinScale) + 1, 14, 0, 0, Math.PI * 2);
          ctx.fill();

          // Vibrant Metallic Gold Face
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.ellipse(0, 0, 13 * Math.abs(spinScale), 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Inner Polished Crest
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.ellipse(0, 0, 9 * Math.abs(spinScale), 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Star or Dollar symbol
          if (Math.abs(spinScale) > 0.4) {
            ctx.fillStyle = '#78350f';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 1);
          }

          // Specular shine flash
          if (Math.abs(spinScale) > 0.8) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.beginPath();
            ctx.arc(-4 * spinScale, -4, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      });

      // Render AAA Red Gas Jerry Can
      sim.gasCans.forEach((gas) => {
        if (!gas.collected && gas.x >= viewStartWorldX && gas.x <= viewEndWorldX) {
          ctx.save();
          const bobY = gas.y + Math.sin(gas.floatOffset) * 4;
          ctx.translate(gas.x, bobY);

          // Drop shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
          ctx.beginPath();
          ctx.ellipse(0, 24, 14, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Red Jerry Can Main Body
          ctx.fillStyle = '#dc2626';
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(-13, -16, 26, 28, 4);
          ctx.fill();
          ctx.stroke();

          // Side Cross Indentation (Iconic Jerry Can stamping)
          ctx.strokeStyle = '#b91c1c';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-7, -10); ctx.lineTo(7, 6);
          ctx.moveTo(7, -10); ctx.lineTo(-7, 6);
          ctx.stroke();

          // Triple Grip Handle on Top
          ctx.fillStyle = '#991b1b';
          ctx.beginPath();
          ctx.roundRect(-10, -23, 20, 8, 2);
          ctx.fill();

          // Yellow Spout Cap
          ctx.fillStyle = '#eab308';
          ctx.fillRect(5, -25, 6, 5);

          // Crisp White "GAS" badge
          ctx.fillStyle = '#ffffff';
          ctx.font = 'black 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GAS', 0, -1);
          ctx.restore();
        }
      });

      // ─── RENDER JEEP (FAITHFUL HILL CLIMB ICONIC DESIGN) ───
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // Chassis Drop Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 20, 36, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 1. Suspension Struts & Hydraulic Springs
      const drawStrut = (axleX: number, offset: number) => {
        const strutBaseY = 4;
        const wheelCenterY = 16 + offset;

        // Metallic Swing Arm
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(axleX > 0 ? axleX - 10 : axleX + 10, strutBaseY);
        ctx.lineTo(axleX, wheelCenterY);
        ctx.stroke();

        // Chrome Coil Spring
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        const coils = 4;
        for (let i = 0; i <= coils; i++) {
          const sy = strutBaseY + (i / coils) * (wheelCenterY - strutBaseY);
          const sx = axleX + (i % 2 === 0 ? -4 : 4);
          if (i === 0) ctx.moveTo(axleX, sy);
          else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
      };

      drawStrut(-car.wheelDist / 2, car.rearSuspensionOffset);
      drawStrut(car.wheelDist / 2, car.frontSuspensionOffset);

      // 2. Heavy-Duty Offroad Wheels
      const renderDetailedWheel = (wx: number, wy: number, spin: number) => {
        ctx.save();
        ctx.translate(wx, wy);
        ctx.rotate(spin);

        // Deep Black Rubber Tire
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(0, 0, car.wheelRadius, 0, Math.PI * 2);
        ctx.fill();

        // Rugged Outer Treads (8 Knobby Grips)
        ctx.fillStyle = '#0f172a';
        for (let i = 0; i < 8; i++) {
          const ta = (i / 8) * Math.PI * 2;
          ctx.save();
          ctx.rotate(ta);
          ctx.fillRect(-3, -car.wheelRadius - 2, 6, 4);
          ctx.restore();
        }

        // Inner Steel Rim
        const rimGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 9);
        rimGrad.addColorStop(0, '#e2e8f0');
        rimGrad.addColorStop(0.7, '#94a3b8');
        rimGrad.addColorStop(1, '#475569');
        ctx.fillStyle = rimGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        // 5-Spoke Mag Wheel Hub
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        for (let s = 0; s < 5; s++) {
          const sa = (s / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(sa) * 8, Math.sin(sa) * 8);
          ctx.stroke();
        }

        // Center Chrome Lug Nut
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      };

      renderDetailedWheel(-car.wheelDist / 2, 16 + car.rearSuspensionOffset, car.wheelSpinRear);
      renderDetailedWheel(car.wheelDist / 2, 16 + car.frontSuspensionOffset, car.wheelSpinFront);

      // 3. Driver: Bill Newton with Ragdoll Neck Pivot & Cap
      ctx.save();
      ctx.translate(-8, -12); // Bill's Seat position

      // Bill's Torso (Blue Overalls / Shirt)
      ctx.fillStyle = '#0284c7';
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -10, 16, 18, 4);
      ctx.fill();
      ctx.stroke();

      // Steering Wheel gripped by Bill's Arms
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(6, -6);
      ctx.lineTo(14, -12);
      ctx.stroke();

      // Wheel Rim
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(15, -14, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Bill's Arm
      ctx.strokeStyle = '#f87171'; // Arm flesh tone
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(12, -12);
      ctx.stroke();

      // Ragdoll Neck & Head (Rotates on G-force)
      ctx.save();
      ctx.translate(0, -14);
      ctx.rotate(driver.headAngle);

      // Neck
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(-3, -2, 6, 6);

      // Head Base
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(0, -8, 9, 0, Math.PI * 2);
      ctx.fill();

      // Big Characteristic Cartoon Nose
      ctx.fillStyle = '#f87171';
      ctx.beginPath();
      ctx.arc(8, -8, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Expressive Eyes (Normal, Scared, or Dead-Crashed X)
      if (driver.expression === 'crashed') {
        // Crash X_X eyes
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(2, -11); ctx.lineTo(6, -7);
        ctx.moveTo(6, -11); ctx.lineTo(2, -7);
        ctx.stroke();
      } else if (driver.expression === 'scared') {
        // Wide open frightened pupils
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(4, -9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(5, -9, 1.8, 0, Math.PI * 2);
        ctx.fill();
        // Open screaming mouth
        ctx.fillStyle = '#881337';
        ctx.beginPath();
        ctx.ellipse(3, -4, 2.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Confident grin & eye
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(4, -9, 2, 0, Math.PI * 2);
        ctx.fill();
        // Grin
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(3, -5, 3.5, 0.2, Math.PI * 0.9);
        ctx.stroke();
      }

      // Bill's Signature Red Baseball Cap
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(0, -11, 9.5, Math.PI, Math.PI * 2);
      ctx.lineTo(12, -11);
      ctx.lineTo(0, -11);
      ctx.closePath();
      ctx.fill();

      // Cap Visor / Brim
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(4, -13, 9, 3.5, 1.5);
      ctx.fill();

      ctx.restore(); // Exit Head Pivot
      ctx.restore(); // Exit Driver

      // 4. Heavy Steel Roll Cage (Black Tubing)
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      // Rear diagonal bar
      // 4. Vehicle Body & Chassis (Custom Graphics per Selected Vehicle)
      const vConfig = VEHICLES[selectedVehicle] || VEHICLES.jeep;

      if (selectedVehicle === 'monster') {
        // ─── MONSTER TRUCK CHASSIS ───
        // Heavy Lift Roll Cage
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-32, -10);
        ctx.lineTo(-18, -42);
        ctx.lineTo(14, -42);
        ctx.lineTo(24, -14);
        ctx.stroke();

        // Monster Truck Raised Body
        const monsterGrad = ctx.createLinearGradient(0, -30, 0, 10);
        monsterGrad.addColorStop(0, vConfig.primaryColor);
        monsterGrad.addColorStop(1, vConfig.secondaryColor);
        ctx.fillStyle = monsterGrad;
        ctx.strokeStyle = '#3b0764';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-42, -10);
        ctx.lineTo(-38, -24);
        ctx.lineTo(-12, -24);
        ctx.lineTo(10, -18);
        ctx.lineTo(40, -18);
        ctx.lineTo(44, 0);
        ctx.lineTo(34, 6);
        ctx.lineTo(-40, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Monster Flame Decal
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(8, -10);
        ctx.lineTo(28, -14);
        ctx.lineTo(20, -6);
        ctx.lineTo(36, -10);
        ctx.lineTo(14, 0);
        ctx.closePath();
        ctx.fill();

        // High Fog Lights Roof Bar
        ctx.fillStyle = '#fde047';
        for (let fl = -10; fl <= 10; fl += 10) {
          ctx.beginPath();
          ctx.arc(fl, -44, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (selectedVehicle === 'motocross') {
        // ─── MOTOCROSS BIKE CHASSIS ───
        // Steel Dirt Bike Frame
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-car.wheelDist / 2, 14); // Rear axle
        ctx.lineTo(-6, -6);                 // Frame center
        ctx.lineTo(car.wheelDist / 2, 14);  // Front axle
        ctx.moveTo(-6, -6);
        ctx.lineTo(10, -18);                // Fork head
        ctx.stroke();

        // Angular Tank & Tail Plastics
        const motoGrad = ctx.createLinearGradient(0, -20, 0, 5);
        motoGrad.addColorStop(0, vConfig.primaryColor);
        motoGrad.addColorStop(1, vConfig.secondaryColor);
        ctx.fillStyle = motoGrad;
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-28, -14); // Rear fender
        ctx.lineTo(-8, -18);  // Seat base
        ctx.lineTo(6, -20);   // Fuel tank
        ctx.lineTo(16, -16);  // Shroud
        ctx.lineTo(0, -6);
        ctx.lineTo(-20, -6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // High Front Fender / Beak
        ctx.fillStyle = vConfig.primaryColor;
        ctx.beginPath();
        ctx.moveTo(10, -16);
        ctx.lineTo(24, -18);
        ctx.lineTo(20, -14);
        ctx.closePath();
        ctx.fill();

        // Dirt Exhaust Pipe
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-4, -4);
        ctx.lineTo(-26, -10);
        ctx.stroke();
      } else if (selectedVehicle === 'racecar') {
        // ─── SUPER RACE CAR CHASSIS ───
        // High Downforce Rear Carbon Wing
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-36, -6);
        ctx.lineTo(-34, -26);
        ctx.stroke();

        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-44, -28, 18, 4);

        // Aerodynamic Low-slung Body Shell
        const raceGrad = ctx.createLinearGradient(0, -22, 0, 8);
        raceGrad.addColorStop(0, vConfig.primaryColor);
        raceGrad.addColorStop(1, vConfig.secondaryColor);
        ctx.fillStyle = raceGrad;
        ctx.strokeStyle = '#0e7490';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-40, 2);
        ctx.lineTo(-36, -8);
        ctx.lineTo(-18, -12);
        ctx.lineTo(0, -20); // Low windshield
        ctx.lineTo(22, -12);
        ctx.lineTo(44, 2);  // Front splitter
        ctx.lineTo(36, 6);
        ctx.lineTo(-36, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Cockpit Tinted Canopy
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-16, -10);
        ctx.lineTo(2, -18);
        ctx.lineTo(16, -10);
        ctx.closePath();
        ctx.fill();

        // Racing Stripe
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(8, -12, 4, 16);
      } else {
        // ─── CLASSIC JEEP CHASSIS (Default) ───
        // Roll Cage
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-28, -8);
        ctx.lineTo(-14, -34);
        ctx.lineTo(8, -34);
        ctx.lineTo(18, -10);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-8, -8);
        ctx.lineTo(-6, -34);
        ctx.stroke();

        // Jeep Red Tub & Hood
        const bodyGrad = ctx.createLinearGradient(0, -20, 0, 10);
        bodyGrad.addColorStop(0, vConfig.primaryColor);
        bodyGrad.addColorStop(0.6, vConfig.secondaryColor);
        bodyGrad.addColorStop(1, '#991b1b');

        ctx.fillStyle = bodyGrad;
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-36, -8);
        ctx.lineTo(-34, -18);
        ctx.lineTo(-8, -18);
        ctx.lineTo(6, -10);
        ctx.lineTo(34, -10);
        ctx.lineTo(38, 2);
        ctx.lineTo(30, 8);
        ctx.lineTo(14, 8);
        ctx.lineTo(4, 2);
        ctx.lineTo(-18, 2);
        ctx.lineTo(-26, 8);
        ctx.lineTo(-36, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Hood vents
        ctx.strokeStyle = '#7f1d1d';
        ctx.lineWidth = 1.5;
        for (let lv = 14; lv <= 28; lv += 4) {
          ctx.beginPath();
          ctx.moveTo(lv, -8);
          ctx.lineTo(lv, -4);
          ctx.stroke();
        }
      }

      // Yellow Fog/Headlights with Radiant Beam
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(36, -3, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Front Headlight Beam (Subtle light cone)
      const lightCone = ctx.createLinearGradient(38, -3, 160, -3);
      lightCone.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      lightCone.addColorStop(1, 'rgba(254, 240, 138, 0)');
      ctx.fillStyle = lightCone;
      ctx.beginPath();
      ctx.moveTo(38, -5);
      ctx.lineTo(160, -35);
      ctx.lineTo(160, 25);
      ctx.lineTo(38, -1);
      ctx.closePath();
      ctx.fill();

      // Rear Exhaust Pipe with Active Nitro Glow
      ctx.fillStyle = '#475569';
      ctx.fillRect(-38, 0, 7, 5);

      if (isGas) {
        // Exhaust Flame Pop
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-38, 2);
        ctx.lineTo(-48 - Math.random() * 8, 2 + (Math.random() - 0.5) * 4);
        ctx.lineTo(-38, 5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-38, 2.5);
        ctx.lineTo(-44, 3);
        ctx.lineTo(-38, 4.5);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore(); // Exit Jeep transform

      // --- OPTION A: 1V1 GHOST RACING TELEMETRY RENDER ---
      if (ghostMode && ghostTrajectoryRef.current.length > 0) {
        ghostTimeRef.current += dt;
        const curGhostTime = ghostTimeRef.current;
        // Find interpolated ghost position
        const traj = ghostTrajectoryRef.current;
        let ghostIdx = traj.findIndex(pt => pt.time >= curGhostTime);
        if (ghostIdx === -1) ghostIdx = traj.length - 1;
        const ghostPt = traj[ghostIdx];

        if (ghostPt) {
          ctx.save();
          ctx.translate(ghostPt.x, ghostPt.y);
          ctx.rotate(ghostPt.angle);
          ctx.globalAlpha = 0.42; // Translucent holographic ghost

          // Ghost holographic aura
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 12;

          // Ghost Chassis (Neon Cyan Outline)
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 3;
          ctx.fillStyle = "rgba(14, 165, 233, 0.25)";
          ctx.beginPath();
          ctx.roundRect(-34, -16, 68, 20, 6);
          ctx.fill();
          ctx.stroke();

          // Holographic Digital Scanlines across chassis
          ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
          ctx.lineWidth = 1;
          for (let sl = -12; sl < 4; sl += 4) {
            ctx.beginPath();
            ctx.moveTo(-30, sl);
            ctx.lineTo(30, sl);
            ctx.stroke();
          }

          // Ghost Driver Silhouette Helmet
          ctx.fillStyle = "rgba(56, 189, 248, 0.45)";
          ctx.beginPath();
          ctx.arc(-8, -24, 7, 0, Math.PI * 2);
          ctx.fill();

          // Ghost Wheels with Neon Spokes
          ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(-26, 14, 14, 0, Math.PI * 2);
          ctx.arc(26, 14, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Inner spoke rings
          ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(-26, 14, 6, 0, Math.PI * 2);
          ctx.arc(26, 14, 6, 0, Math.PI * 2);
          ctx.stroke();

          // Floating Ghost Rival Tag with Distance
          ctx.fillStyle = "#38bdf8";
          ctx.font = "bold 10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("👻 RIVAL GHOST", 0, -36);

          ctx.restore();
        }
      }

      // Particles (Smoke, Dirt, Sparkles)
      sim.particles.forEach((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });
      sim.particles = sim.particles.filter((p) => p.life > 0);

      // Floating Score & Combo Texts with Outlines
      sim.floatingTexts.forEach((ft) => {
        ft.y -= 25 * dt;
        ft.life -= dt;
        ctx.save();
        ctx.font = '900 16px sans-serif';
        ctx.textAlign = 'center';
        // Black drop outline
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      });
      sim.floatingTexts = sim.floatingTexts.filter((ft) => ft.life > 0);

      ctx.restore(); // Exit world transform
      ctx.restore(); // Exit high-DPI scaling

      // Update React HUD state throttled
      setHudStats((prev) => ({
        ...prev,
        distance: sim.distance,
        coins: sim.coinsCollected,
        fuel: Math.floor(sim.fuel),
        speed: sim.speedKmh,
        rpm: sim.rpm,
      }));

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, getTerrainHeight, getTerrainNormal, playSfx]);

  // Handle Game Over Settlement
  useEffect(() => {
    if (gameState === 'gameover') {
      const finalDist = simRef.current.distance;
      const coinsWon = simRef.current.coinsCollected;

      // Update best distance & wallet in local storage
      const prevBest = parseInt(localStorage.getItem('hcr_best_dist') || '0', 10);
      if (finalDist > prevBest) {
        localStorage.setItem("hcr_best_dist", finalDist.toString());
        setHudStats(s => ({ ...s, bestDistance: finalDist }));
        if (ghostRecordRef.current.length > 0) {
          localStorage.setItem(`hcr_ghost_${selectedStage}`, JSON.stringify(ghostRecordRef.current));
          ghostTrajectoryRef.current = [...ghostRecordRef.current];
        }
      }

      const prevWallet = parseInt(localStorage.getItem('hcr_wallet_coins') || '500', 10);
      const newWallet = prevWallet + coinsWon;
      localStorage.setItem('hcr_wallet_coins', newWallet.toString());
      setHudStats(s => ({ ...s, totalCoins: newWallet }));

      // Secure economy reward token integration
      if (profile?.id && coinsWon > 0) {
        const tokenBonus = Math.floor(coinsWon / 10); // 1 token per 10 coins
        secureUpdateTokens(profile.id, tokenBonus).catch(() => {});
        secureRecordGameResult({
          userId: profile.id,
          betAmount: 0,
          earnedAmount: tokenBonus,
          xpEarned: Math.min(250, finalDist * 2),
        }).catch(() => {});
      }
    }
  }, [gameState, profile?.id]);

  // Detect orientation for mobile landscape optimization
  const [isPortrait, setIsPortrait] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-[100dvh] min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden">
      <DedicatedCloseButton onClose={onClose} label="Exit Race" position="top-right" />
      
      {/* Mobile Landscape Recommendation Pill */}
      {isPortrait && gameState === 'playing' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 bg-indigo-950/90 border border-indigo-400/40 text-cyan-300 px-4 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-bounce">
          <span>🔄</span>
          <span>Tip: Rotate device to Landscape for optimal view!</span>
        </div>
      )}

      <GameFrame
        title="Hill Climb Racing Lite"
        onClose={onClose}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        className="w-full h-full flex flex-col bg-[#0f172a] select-none"
      >
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
        
        {/* ── AAA ARCADE HUD (Distance, Fuel Bar, Coins, Speed) ── */}
        <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {/* Distance & Record Badge */}
          {ghostMode && (
            <div className="hidden sm:flex items-center gap-2 bg-cyan-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-cyan-400/40 text-cyan-300 text-xs font-black shadow-lg">
              <span>👻</span>
              <span>1v1 RIVAL MATCH</span>
              {ghostTrajectoryRef.current.length > 0 && (() => {
                const curT = ghostTimeRef.current;
                const traj = ghostTrajectoryRef.current;
                let gIdx = traj.findIndex(pt => pt.time >= curT);
                if (gIdx === -1) gIdx = traj.length - 1;
                const gPt = traj[gIdx];
                if (!gPt) return null;
                const gDist = Math.max(0, Math.floor((gPt.x - 180) / 10));
                const diff = hudStats.distance - gDist;
                return (
                  <span className={`ml-1 text-[11px] px-2 py-0.5 rounded-md font-mono font-bold ${diff >= 0 ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40' : 'bg-rose-500/25 text-rose-300 border border-rose-500/40'}`}>
                    {diff >= 0 ? `+${diff}m` : `${diff}m`}
                  </span>
                );
              })()}
            </div>
          )}
          <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-white/20 shadow-2xl text-white">
            <Trophy size={20} className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <div>
              <div className="text-[10px] tracking-widest uppercase text-slate-300 font-black">DISTANCE</div>
              <div className="text-lg font-black text-amber-300 tracking-tight">{hudStats.distance} m</div>
            </div>
            <div className="h-7 w-px bg-white/20 mx-1" />
            <div className="text-right">
              <div className="text-[9px] uppercase text-slate-400 font-bold">BEST</div>
              <div className="text-xs font-bold text-slate-200">{hudStats.bestDistance} m</div>
            </div>
          </div>

          {/* Glowing Fuel Gauge Bar */}
          <div className="flex items-center gap-3 bg-black/75 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-white/20 shadow-2xl">
            <Fuel size={20} className={hudStats.fuel < 25 ? 'text-red-500 animate-pulse drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' : 'text-emerald-400'} />
            <div className="w-28 sm:w-40">
              <div className="flex justify-between text-[10px] font-black tracking-wider text-slate-200 mb-1">
                <span>FUEL</span>
                <span>{hudStats.fuel}%</span>
              </div>
              <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/20">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    hudStats.fuel < 25
                      ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse'
                      : hudStats.fuel < 50
                      ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                      : 'bg-emerald-500 shadow-[0_0_10px_rgba(34,197,94,0.7)]'
                  }`}
                  style={{ width: `${hudStats.fuel}%` }}
                />
              </div>
            </div>
          </div>

          {/* 3D Shiny Coins Collected */}
          <div className="flex items-center gap-2.5 bg-black/75 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-amber-400/30 shadow-2xl text-amber-300">
            <Coins size={20} className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" />
            <div>
              <div className="text-[10px] tracking-widest uppercase text-slate-300 font-black">COINS</div>
              <div className="text-lg font-black text-yellow-300 tracking-tight">+{hudStats.coins}</div>
            </div>
          </div>
        </div>

        {/* ── TACHOMETER / SPEEDOMETER OVERLAY (Bottom Center) ── */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-4 pointer-events-none">
          <div className="bg-black/80 backdrop-blur-md px-5 py-2 rounded-2xl border-2 border-white/20 shadow-2xl flex items-center gap-4">
            <Gauge size={20} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            <div className="text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">SPEED</div>
              <div className="text-base font-black text-cyan-300 tracking-tight">{hudStats.speed} <span className="text-[10px]">KM/H</span></div>
            </div>
            <div className="h-7 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">RPM</div>
              <div className="text-base font-black text-rose-400 tracking-tight">{hudStats.rpm}</div>
            </div>
          </div>
        </div>

        {/* ── MAIN CANVAS ── */}
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />

        {/* ── ON-SCREEN TOUCH PEDALS (Mobile / Tablet Responsive) ── */}
        {gameState === 'playing' && (
          <div className="absolute bottom-5 left-5 right-5 z-20 flex justify-between pointer-events-auto">
            {/* Brake / Reverse Pedal */}
            <button
              onPointerDown={() => { touchBrakeRef.current = true; }}
              onPointerUp={() => { touchBrakeRef.current = false; }}
              onPointerLeave={() => { touchBrakeRef.current = false; }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-t from-red-700 via-red-600 to-rose-500 active:scale-95 text-white font-black text-lg border-2 border-red-400/60 shadow-2xl shadow-red-900/50 flex flex-col items-center justify-center select-none cursor-pointer"
            >
              <span className="drop-shadow-md">BRAKE</span>
              <span className="text-[10px] font-bold text-red-200 mt-1">[A / ◀]</span>
            </button>

            {/* Gas / Accelerate Pedal */}
            <button
              onPointerDown={() => { touchGasRef.current = true; }}
              onPointerUp={() => { touchGasRef.current = false; }}
              onPointerLeave={() => { touchGasRef.current = false; }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-t from-emerald-700 via-emerald-600 to-green-500 active:scale-95 text-white font-black text-lg border-2 border-emerald-400/60 shadow-2xl shadow-emerald-900/50 flex flex-col items-center justify-center select-none cursor-pointer"
            >
              <span className="drop-shadow-md">GAS</span>
              <span className="text-[10px] font-bold text-emerald-200 mt-1">[D / ▶]</span>
            </button>
          </div>
        )}

        {/* ── START MENU & GARAGE UPGRADES (AAA Glassmorphism) ── */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900/95 border-2 border-cyan-500/40 rounded-3xl p-6 shadow-2xl shadow-cyan-950/50 flex flex-col items-center text-center">
              <div className="inline-flex p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <Gauge size={38} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wider">HILL CLIMB RACING</h2>
              <p className="text-xs text-slate-400 mt-1 mb-4">Official Poki Lite edition: master Newton's physics, balance hills & tune your jeep!</p>

              {/* 1v1 Ghost Multiplayer Switch */}
              <div className="flex items-center justify-between w-full bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-2.5 mb-4">
                <div className="flex items-center gap-2 text-left">
                  <span className="text-lg">??</span>
                  <div>
                    <div className="text-xs font-black text-cyan-300">1v1 Ghost Rival Mode</div>
                    <div className="text-[10px] text-slate-400">Race against your high score ghost replay in real time!</div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = !ghostMode;
                    setGhostMode(next);
                    localStorage.setItem("hcr_ghost_enabled", next.toString());
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                    ghostMode
                      ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {ghostMode ? "ON" : "OFF"}
                </button>
              </div>

              {/* Garage Wallet Display */}
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 rounded-full text-yellow-300 font-extrabold text-sm mb-4 shadow-[0_0_10px_rgba(234,179,8,0.2)]">
                <Coins size={18} className="text-yellow-400" /> Total Garage Wallet: {hudStats.totalCoins} Coins
              </div>

              {/* 1. SELECT VEHICLE (Jeep, Monster Truck, Motocross, Super Racecar) */}
              <div className="w-full mb-4 text-left">
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Choose Vehicle</span>
                  <span className="text-[10px] text-cyan-400 font-bold">{VEHICLES[selectedVehicle].name}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(VEHICLES) as VehicleType[]).map((vKey) => {
                    const v = VEHICLES[vKey];
                    const isUnlocked = unlockedVehicles.includes(vKey);
                    const isSelected = selectedVehicle === vKey;

                    return (
                      <button
                        key={vKey}
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedVehicle(vKey);
                            localStorage.setItem('hcr_selected_veh', vKey);
                          } else {
                            // Try purchasing vehicle
                            if (hudStats.totalCoins >= v.cost) {
                              const newWallet = hudStats.totalCoins - v.cost;
                              const updatedUnlocked = [...unlockedVehicles, vKey];
                              setUnlockedVehicles(updatedUnlocked);
                              setSelectedVehicle(vKey);
                              setHudStats((s) => ({ ...s, totalCoins: newWallet }));
                              localStorage.setItem('hcr_wallet_coins', newWallet.toString());
                              localStorage.setItem('hcr_unlocked_veh', JSON.stringify(updatedUnlocked));
                              localStorage.setItem('hcr_selected_veh', vKey);
                              playSfx('upgrade');
                              toast.success(`Unlocked ${v.name}!`);
                            } else {
                              toast.error(`Need ${v.cost} Coins to unlock ${v.name}!`);
                            }
                          }
                        }}
                        className={`p-2 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)] ring-2 ring-cyan-400/50'
                            : isUnlocked
                            ? 'bg-slate-800/80 border-white/10 hover:border-white/30 text-slate-300'
                            : 'bg-slate-900/50 border-white/5 opacity-60 hover:opacity-100'
                        }`}
                      >
                        <span className="text-2xl mb-1">{v.icon}</span>
                        <span className="text-[10px] font-black truncate w-full text-center text-slate-200">{v.name.split(' ')[0]}</span>
                        <span className="text-[9px] font-extrabold text-amber-300 mt-0.5">
                          {isUnlocked ? (isSelected ? 'EQUIPPED' : 'SELECT') : `${v.cost} 🪙`}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Vehicle Ability Card */}
                <div className="mt-2 p-2.5 rounded-xl bg-slate-800/60 border border-white/10 text-[11px] text-cyan-300 flex items-center gap-2">
                  <Sparkles size={14} className="text-cyan-400 shrink-0" />
                  <span>{VEHICLES[selectedVehicle].ability}</span>
                </div>
              </div>

              {/* 2. SELECT STAGE / MAP (Countryside, Desert Dunes, The Moon, Arctic Ice) */}
              <div className="w-full mb-4 text-left">
                <div className="text-xs font-black text-slate-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Select Map</span>
                  <span className="text-[10px] text-emerald-400 font-bold">{STAGES[selectedStage].name}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(Object.keys(STAGES) as StageType[]).map((sKey) => {
                    const st = STAGES[sKey];
                    const isSelected = selectedStage === sKey;

                    return (
                      <button
                        key={sKey}
                        onClick={() => {
                          setSelectedStage(sKey);
                          localStorage.setItem('hcr_selected_stage', sKey);
                        }}
                        className={`p-2 rounded-2xl flex flex-col items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.4)] ring-2 ring-emerald-400/50'
                            : 'bg-slate-800/80 border-white/10 hover:border-white/30 text-slate-300'
                        }`}
                      >
                        <span className="text-2xl mb-1">{st.icon}</span>
                        <span className="text-[10px] font-black truncate w-full text-center text-slate-200">{st.name.split(' ')[0]}</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">
                          {isSelected ? 'ACTIVE' : 'CHOOSE'}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {/* Stage Info Card */}
                <div className="mt-2 p-2 rounded-xl bg-slate-800/60 border border-white/10 text-[11px] text-emerald-300">
                  {STAGES[selectedStage].desc}
                </div>
              </div>

              {/* 3. Vehicle Upgrade Matrix */}
              <div className="w-full grid grid-cols-2 gap-2.5 mb-5 text-left">
                {(['engine', 'suspension', 'tires', 'fourWheel'] as Array<keyof Upgrades>).map((part) => {
                  const lvl = upgrades[part];
                  const cost = UPGRADE_COSTS[lvl] || 0;
                  const isMax = lvl >= 5;
                  const labels: Record<keyof Upgrades, string> = {
                    engine: 'Engine ⚡',
                    suspension: 'Suspension 🔩',
                    tires: 'Tires 🔘',
                    fourWheel: '4WD Drive ⚙️',
                  };

                  return (
                    <div key={part} className="bg-slate-800/90 border border-white/10 rounded-2xl p-2.5 flex flex-col justify-between shadow-lg">
                      <div>
                        <div className="text-xs font-black text-slate-200">{labels[part]}</div>
                        <div className="flex gap-1 mt-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < lvl ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuyUpgrade(part)}
                        disabled={isMax}
                        className={`mt-2 py-1 px-2 rounded-xl text-[10px] font-black flex items-center justify-between transition-all ${
                          isMax
                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                            : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 active:scale-95 border border-cyan-500/40 cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                        }`}
                      >
                        <span>{isMax ? 'MAX' : `LVL ${lvl + 1}`}</span>
                        <span>{isMax ? '★' : `${cost} 🪙`}</span>
                      </button>
                    </div>
                  );
                })}
              </div>

              <Button
                onClick={startRace}
                className="w-full py-4 text-base font-black rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-xl shadow-cyan-500/30 flex items-center justify-center gap-2"
              >
                <Play size={20} /> START CLIMB
              </Button>
            </div>
          </div>
        )}

        {/* ── GAME OVER MODAL ── */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-slate-900 border-2 border-red-500/40 rounded-3xl p-6 shadow-2xl shadow-red-950/50 flex flex-col items-center text-center">
              <div className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-2 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                <RotateCcw size={32} />
              </div>
              <h3 className="text-xl font-black text-red-400 tracking-wide uppercase">{deathReason || 'CRASHED!'}</h3>
              <p className="text-xs text-slate-400 mt-1 mb-5">Your run came to a halt. Collect more coins and tune your parts!</p>

              <div className="w-full bg-slate-800/80 rounded-2xl p-4 border border-white/5 space-y-2 mb-6 text-sm">
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Distance Reached:</span>
                  <span className="text-amber-300 font-extrabold">{hudStats.distance} m</span>
                </div>
                <div className="flex justify-between font-bold text-slate-300">
                  <span>Coins Earned:</span>
                  <span className="text-yellow-400 font-extrabold">+{hudStats.coins} 🪙</span>
                </div>
                <div className="flex justify-between font-bold text-slate-300 border-t border-white/10 pt-2">
                  <span>Best Distance Record:</span>
                  <span className="text-cyan-400 font-extrabold">{hudStats.bestDistance} m</span>
                </div>
                {ghostMode && ghostTrajectoryRef.current.length > 0 && (() => {
                  const gMaxDist = Math.max(...ghostTrajectoryRef.current.map(p => Math.floor((p.x - 180) / 10)));
                  const beatGhost = hudStats.distance >= gMaxDist;
                  return (
                    <div className="flex justify-between items-center font-bold border-t border-white/10 pt-2 text-xs">
                      <span className="text-cyan-300 flex items-center gap-1">👻 1v1 Rival Ghost:</span>
                      <span className={`px-2 py-0.5 rounded-md font-mono ${beatGhost ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                        {beatGhost ? `NEW RECORD! (+${hudStats.distance - gMaxDist}m)` : `OUTPACED (${gMaxDist}m)`}
                      </span>
                    </div>
                  );
                })()}
              </div>

              <div className="w-full flex gap-3">
                <Button
                  onClick={() => setGameState('menu')}
                  className="flex-1 py-3 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 flex items-center justify-center gap-1.5"
                >
                  <Wrench size={16} /> GARAGE
                </Button>
                <Button
                  onClick={startRace}
                  className="flex-1 py-3 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={16} /> RETRY [R]
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </GameFrame>
  </div>
  );
}
