import { useEffect, useRef, useState, useCallback } from 'react';
import { GameFrame } from './GameFrame';
import { Button } from '@/components/ui/Button';
import { audio } from '@/lib/audioEngine';
import { secureRecordGameResult, secureUpdateTokens } from '@/lib/secureEconomy';
import { useAuthStore } from '@/features/authStore';
import { Gauge, Fuel, Coins, Trophy, Wrench, Play, RotateCcw, Volume2, VolumeX, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  onClose: () => void;
}

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

  // Touch controls state
  const touchGasRef = useRef(false);
  const touchBrakeRef = useRef(false);

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

    // Car State (Rigid Body with 2-Wheel Suspension)
    car: {
      x: 180,
      y: 200,
      vx: 0,
      vy: 0,
      angle: 0,        // chassis rotation radians
      angularVel: 0,   // angular velocity
      wheelDist: 54,   // distance between front and rear axle
      bodyRadius: 28,  // bounding circle radius for chassis
      driverHeadOffset: { x: -6, y: -24 }, // Head location relative to center
      wheelRadius: 15,
      rearWheelY: 0,
      frontWheelY: 0,
      rearSuspension: 0,
      frontSuspension: 0,
      rearGrounded: false,
      frontGrounded: false,
      wheelSpinRear: 0,
      wheelSpinFront: 0,
    },

    // Camera follow offset
    camera: { x: 0, y: 0, targetX: 0, targetY: 0 },

    // Dynamic objects
    coins: [] as Array<{ x: number; y: number; collected: boolean; value: number }>,
    gasCans: [] as Array<{ x: number; y: number; collected: boolean }>,
    particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: string; size: number }>,
    floatingTexts: [] as Array<{ x: number; y: number; text: string; color: string; life: number }>,

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

  // Heightmap function for procedural terrain
  const getTerrainHeight = useCallback((worldX: number) => {
    // Continuous multi-frequency hill waveform
    const h1 = Math.sin(worldX * 0.0035) * 85;
    const h2 = Math.sin(worldX * 0.008 + 1.2) * 55;
    const h3 = Math.cos(worldX * 0.016 + 2.5) * 25;
    const h4 = Math.sin(worldX * 0.035) * 8; // Small bumps
    
    // Add steep hill crests after 200m
    const steep = worldX > 2000 ? Math.sin(worldX * 0.0018) * 60 : 0;
    
    return 360 + h1 + h2 + h3 + h4 + steep;
  }, []);

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

  // Reset or Start Run
  const startRace = useCallback(() => {
    const initialY = getTerrainHeight(180) - 50;
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
      deathReason: '',
      car: {
        x: 180,
        y: initialY,
        vx: 0,
        vy: 0,
        angle: 0,
        angularVel: 0,
        wheelDist: 56,
        bodyRadius: 28,
        driverHeadOffset: { x: -6, y: -26 },
        wheelRadius: 16,
        rearWheelY: initialY,
        frontWheelY: initialY,
        rearSuspension: 0,
        frontSuspension: 0,
        rearGrounded: false,
        frontGrounded: false,
        wheelSpinRear: 0,
        wheelSpinFront: 0,
      },
      camera: { x: 180, y: initialY, targetX: 180, targetY: initialY },
      coins: [],
      gasCans: [],
      particles: [],
      floatingTexts: [],
      gas: false,
      brake: false,
      upgrades: { ...upgrades },
    };

    // Pre-populate initial coins & fuel cans
    for (let x = 300; x < 2500; x += 180) {
      if (Math.random() > 0.3) {
        simRef.current.coins.push({
          x,
          y: getTerrainHeight(x) - 45 - Math.sin(x * 0.05) * 20,
          collected: false,
          value: 25,
        });
      }
    }
    for (let x = 600; x < 2500; x += 650) {
      simRef.current.gasCans.push({
        x,
        y: getTerrainHeight(x) - 30,
        collected: false,
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

  // Main Loop & Canvas Rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05); // Clamp dt to prevent tunneling
      lastTime = now;

      // Handle Resize smoothly
      const width = canvas.parentElement ? canvas.parentElement.clientWidth : 800;
      const height = canvas.parentElement ? canvas.parentElement.clientHeight : 520;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const sim = simRef.current;
      const car = sim.car;

      if (gameState === 'playing' && !sim.gameOver) {
        // Merge Touch Controls with Key Controls
        const isGas = sim.gas || touchGasRef.current;
        const isBrake = sim.brake || touchBrakeRef.current;

        // Upgrade multipliers
        const enginePower = 340 + sim.upgrades.engine * 55;
        const suspensionStrength = 0.55 + sim.upgrades.suspension * 0.12;
        const tireGrip = 1.0 + sim.upgrades.tires * 0.22;
        const frontPowerRatio = 0.35 + sim.upgrades.fourWheel * 0.13;

        // 1. Fuel Depletion
        const fuelDrainRate = isGas ? 4.8 : 1.2;
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

        // Gravity
        const GRAVITY = 920;
        car.vy += GRAVITY * dt;

        // Air Tilt Control (Classic Hill Climb Mechanics: Gas tilts up/back, Brake tilts forward)
        if (!car.rearGrounded && !car.frontGrounded) {
          sim.airTime += dt;
          if (isGas) car.angularVel += 4.8 * dt;   // Pitch up / back
          if (isBrake) car.angularVel -= 4.8 * dt; // Pitch down / forward

          // Track Flips
          const deltaAngle = car.angle - sim.prevAngle;
          sim.accumulatedRotation += deltaAngle;
          if (Math.abs(sim.accumulatedRotation) >= Math.PI * 2) {
            sim.flips += 1;
            sim.accumulatedRotation = 0;
            sim.coinsCollected += 100;
            sim.floatingTexts.push({
              x: car.x,
              y: car.y - 40,
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
              y: car.y - 40,
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

            // Exhaust Smoke
            if (Math.random() < 0.35) {
              sim.particles.push({
                x: rearAxleX - 10 * cosA,
                y: rearAxleY - 10 * sinA,
                vx: -car.vx * 0.2 + (Math.random() - 0.5) * 20,
                vy: -30 + Math.random() * 10,
                life: 0.6,
                maxLife: 0.6,
                color: 'rgba(160,170,185,0.7)',
                size: 4 + Math.random() * 4,
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
        const headWorldX = car.x + car.driverHeadOffset.x * cosA - car.driverHeadOffset.y * sinA;
        const headWorldY = car.y + car.driverHeadOffset.x * sinA + car.driverHeadOffset.y * cosA;
        const headTerrainY = getTerrainHeight(headWorldX);

        if (headWorldY >= headTerrainY - 3) {
          sim.gameOver = true;
          sim.deathReason = 'DRIVER DOWN! (NECK FLIP)';
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
        sim.speedKmh = Math.floor(Math.abs(car.vx) * 0.08);
        sim.rpm = Math.min(8500, Math.floor(800 + Math.abs(car.vx) * 12 + (isGas ? 2500 : 0)));

        // 5. Coin Pickups
        sim.coins.forEach((coin) => {
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
            }
          }
        });

        // 6. Fuel Can Pickups
        sim.gasCans.forEach((gas) => {
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
          });
          sim.lastCoinSpawnDist = spawnX;
        }

        if (car.x > sim.lastGasSpawnDist - 800) {
          const spawnX = sim.lastGasSpawnDist + 750 + Math.random() * 200;
          sim.gasCans.push({
            x: spawnX,
            y: getTerrainHeight(spawnX) - 30,
            collected: false,
          });
          sim.lastGasSpawnDist = spawnX;
        }
      }

      // Smooth Camera Tracking
      const camTargetX = car.x + 140;
      const camTargetY = car.y - 60;
      sim.camera.x += (camTargetX - sim.camera.x) * 0.08;
      sim.camera.y += (camTargetY - sim.camera.y) * 0.08;

      // ─── RENDERING ──────────────────────────────────────────
      ctx.clearRect(0, 0, width, height);

      // Sky Gradient
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#38BDF8'); // Vibrant Azure Blue
      skyGrad.addColorStop(0.6, '#BAE6FD');
      skyGrad.addColorStop(1, '#E0F2FE');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Distant Parallax Hills (Layer 1)
      ctx.fillStyle = '#99E6B4';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let sx = 0; sx <= width; sx += 20) {
        const worldX = (sim.camera.x * 0.2) + sx;
        const hillY = height * 0.55 + Math.sin(worldX * 0.002) * 45 + Math.cos(worldX * 0.004) * 25;
        ctx.lineTo(sx, hillY);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      // Midground Parallax Hills (Layer 2)
      ctx.fillStyle = '#68D391';
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let sx = 0; sx <= width; sx += 15) {
        const worldX = (sim.camera.x * 0.45) + sx;
        const hillY = height * 0.65 + Math.sin(worldX * 0.004) * 55 + Math.cos(worldX * 0.007) * 30;
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
      const viewStartWorldX = sim.camera.x - originScreenX - 50;
      const viewEndWorldX = sim.camera.x + (width - originScreenX) + 50;
      const step = 8;

      ctx.beginPath();
      ctx.moveTo(viewStartWorldX, height + 800);
      for (let wx = viewStartWorldX; wx <= viewEndWorldX + step; wx += step) {
        ctx.lineTo(wx, getTerrainHeight(wx));
      }
      ctx.lineTo(viewEndWorldX, height + 800);
      ctx.closePath();

      // Earth Dirt Fill
      const dirtGrad = ctx.createLinearGradient(0, height * 0.5, 0, height + 600);
      dirtGrad.addColorStop(0, '#854D0E'); // Rich brown soil
      dirtGrad.addColorStop(0.3, '#713F12');
      dirtGrad.addColorStop(1, '#451A03');
      ctx.fillStyle = dirtGrad;
      ctx.fill();

      // Lush Grass Top Border
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#22C55E'; // Vibrant classic hill climb grass
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Second lush grass inner accent line
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#86EFAC';
      ctx.stroke();

      // Render Coins
      sim.coins.forEach((coin) => {
        if (!coin.collected && coin.x >= viewStartWorldX && coin.x <= viewEndWorldX) {
          ctx.save();
          ctx.translate(coin.x, coin.y);
          // Golden coin circle with shimmer
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(0, 0, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#FCD34D';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#78350F';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('$', 0, 1);
          ctx.restore();
        }
      });

      // Render Fuel Cans
      sim.gasCans.forEach((gas) => {
        if (!gas.collected && gas.x >= viewStartWorldX && gas.x <= viewEndWorldX) {
          ctx.save();
          ctx.translate(gas.x, gas.y);
          // Red Gas Jerry Can
          ctx.fillStyle = '#DC2626';
          ctx.fillRect(-12, -18, 24, 26);
          // Jerry can handle
          ctx.strokeStyle = '#991B1B';
          ctx.lineWidth = 3;
          ctx.strokeRect(-8, -24, 16, 7);
          // White GAS label
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 8px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('GAS', 0, -4);
          ctx.restore();
        }
      });

      // Render Vehicle (Red Hill Climber Jeep)
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);

      // Chassis Red Body
      ctx.fillStyle = '#DC2626'; // Vibrant Red Jeep
      ctx.beginPath();
      ctx.moveTo(-32, -6);
      ctx.lineTo(-30, -18);
      ctx.lineTo(-6, -20);
      ctx.lineTo(8, -10);
      ctx.lineTo(28, -6);
      ctx.lineTo(32, 4);
      ctx.lineTo(-32, 4);
      ctx.closePath();
      ctx.fill();

      // Rollcage Bars (Black/Silver)
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-28, -18);
      ctx.lineTo(-14, -34);
      ctx.lineTo(6, -34);
      ctx.lineTo(16, -10);
      ctx.stroke();

      // Driver "Bill" (Avatar with helmet)
      ctx.fillStyle = '#38BDF8'; // Blue shirt
      ctx.beginPath();
      ctx.arc(-8, -20, 9, 0, Math.PI * 2);
      ctx.fill();
      // Driver Face & Cap
      ctx.fillStyle = '#FBBF24'; // Yellow safety helmet
      ctx.beginPath();
      ctx.arc(-8, -28, 7.5, 0, Math.PI * 2);
      ctx.fill();
      // Cap Visor
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(-4, -29, 7, 3);

      // Headlights
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(30, -4, 4, 6);

      // Suspension Springs
      ctx.strokeStyle = '#64748B';
      ctx.lineWidth = 3;
      // Rear Strut
      ctx.beginPath();
      ctx.moveTo(-car.wheelDist / 2, 4);
      ctx.lineTo(-car.wheelDist / 2, 14);
      ctx.stroke();
      // Front Strut
      ctx.beginPath();
      ctx.moveTo(car.wheelDist / 2, 4);
      ctx.lineTo(car.wheelDist / 2, 14);
      ctx.stroke();

      // Wheels (Draw in relative space)
      const renderWheel = (wx: number, spin: number) => {
        ctx.save();
        ctx.translate(wx, 15);
        ctx.rotate(spin);
        // Outer Rubber Tire with Tread
        ctx.fillStyle = '#1E293B';
        ctx.beginPath();
        ctx.arc(0, 0, car.wheelRadius, 0, Math.PI * 2);
        ctx.fill();
        // Inner Chrome Rim
        ctx.fillStyle = '#94A3B8';
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.fill();
        // Rim Spokes
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-7, 0); ctx.lineTo(7, 0);
        ctx.moveTo(0, -7); ctx.lineTo(0, 7);
        ctx.stroke();
        ctx.restore();
      };

      renderWheel(-car.wheelDist / 2, car.wheelSpinRear);
      renderWheel(car.wheelDist / 2, car.wheelSpinFront);

      ctx.restore(); // Exit car transform

      // Particles
      sim.particles.forEach((p, idx) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
        ctx.fill();
      });
      sim.particles = sim.particles.filter((p) => p.life > 0);

      // Floating Score Texts
      sim.floatingTexts.forEach((ft) => {
        ft.y -= 25 * dt;
        ft.life -= dt;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y);
      });
      sim.floatingTexts = sim.floatingTexts.filter((ft) => ft.life > 0);

      ctx.restore(); // Exit world transform

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
        localStorage.setItem('hcr_best_dist', finalDist.toString());
        setHudStats(s => ({ ...s, bestDistance: finalDist }));
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

  return (
    <GameFrame
      title="Hill Climb Racing Lite"
      onClose={onClose}
      soundEnabled={soundEnabled}
      onToggleSound={() => setSoundEnabled(!soundEnabled)}
      className="max-w-[1000px] h-[640px] flex flex-col bg-[#0f172a] select-none"
    >
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-900">
        
        {/* ── TOP HUD (Distance, Fuel Bar, Coins, Speed) ── */}
        <div className="absolute top-3 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
          {/* Distance & Record */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg text-white">
            <Trophy size={18} className="text-amber-400" />
            <div>
              <div className="text-[10px] tracking-widest uppercase text-slate-300 font-bold">Distance</div>
              <div className="text-base font-black text-amber-300">{hudStats.distance} m</div>
            </div>
            <div className="h-6 w-px bg-white/20 mx-1" />
            <div className="text-right">
              <div className="text-[9px] uppercase text-slate-400 font-bold">Best</div>
              <div className="text-xs font-bold text-slate-200">{hudStats.bestDistance} m</div>
            </div>
          </div>

          {/* Fuel Gauge Bar */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-lg">
            <Fuel size={18} className={hudStats.fuel < 25 ? 'text-red-500 animate-pulse' : 'text-emerald-400'} />
            <div className="w-28 sm:w-36">
              <div className="flex justify-between text-[10px] font-bold text-slate-300 mb-1">
                <span>FUEL</span>
                <span>{hudStats.fuel}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-700/80 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className={`h-full rounded-full transition-all duration-100 ${
                    hudStats.fuel < 25
                      ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                      : hudStats.fuel < 50
                      ? 'bg-amber-400'
                      : 'bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                  }`}
                  style={{ width: `${hudStats.fuel}%` }}
                />
              </div>
            </div>
          </div>

          {/* Coins Collected */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10 shadow-lg text-amber-300">
            <Coins size={18} className="text-yellow-400" />
            <div>
              <div className="text-[10px] tracking-widest uppercase text-slate-300 font-bold">Coins</div>
              <div className="text-base font-black text-yellow-400">+{hudStats.coins}</div>
            </div>
          </div>
        </div>

        {/* ── TACHOMETER / SPEEDOMETER OVERLAY (Bottom Center) ── */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 hidden sm:flex items-center gap-4 pointer-events-none">
          <div className="bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-2xl border border-white/10 flex items-center gap-3">
            <Gauge size={18} className="text-cyan-400" />
            <div className="text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">SPEED</div>
              <div className="text-sm font-black text-cyan-300">{hudStats.speed} <span className="text-[9px]">KM/H</span></div>
            </div>
            <div className="h-6 w-px bg-white/20" />
            <div className="text-center">
              <div className="text-[9px] font-black uppercase text-slate-400">RPM</div>
              <div className="text-sm font-black text-rose-400">{hudStats.rpm}</div>
            </div>
          </div>
        </div>

        {/* ── MAIN CANVAS ── */}
        <canvas ref={canvasRef} className="w-full h-full block touch-none" />

        {/* ── ON-SCREEN TOUCH PEDALS (Mobile / Tablet Friendly) ── */}
        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between pointer-events-auto">
            {/* Brake / Reverse Pedal */}
            <button
              onPointerDown={() => { touchBrakeRef.current = true; }}
              onPointerUp={() => { touchBrakeRef.current = false; }}
              onPointerLeave={() => { touchBrakeRef.current = false; }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-t from-red-600 to-rose-500 active:scale-95 text-white font-black text-lg border-2 border-red-400/50 shadow-xl shadow-red-900/40 flex flex-col items-center justify-center select-none cursor-pointer"
            >
              <span>BRAKE</span>
              <span className="text-[10px] font-bold text-red-200 mt-1">[A / ◀]</span>
            </button>

            {/* Gas / Accelerate Pedal */}
            <button
              onPointerDown={() => { touchGasRef.current = true; }}
              onPointerUp={() => { touchGasRef.current = false; }}
              onPointerLeave={() => { touchGasRef.current = false; }}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-gradient-to-t from-emerald-600 to-green-500 active:scale-95 text-white font-black text-lg border-2 border-emerald-400/50 shadow-xl shadow-emerald-900/40 flex flex-col items-center justify-center select-none cursor-pointer"
            >
              <span>GAS</span>
              <span className="text-[10px] font-bold text-emerald-200 mt-1">[D / ▶]</span>
            </button>
          </div>
        )}

        {/* ── START MENU & GARAGE UPGRADES ── */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 z-30 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-slate-900 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
              <div className="inline-flex p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3">
                <Gauge size={36} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-wide">HILL CLIMB RACING</h2>
              <p className="text-xs text-slate-400 mt-1 mb-4">Master Newton's physics, balance steep hills & upgrade your jeep!</p>

              {/* Wallet display */}
              <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 px-4 py-1.5 rounded-full text-yellow-300 font-extrabold text-sm mb-5">
                <Coins size={16} /> Total Garage Wallet: {hudStats.totalCoins} Coins
              </div>

              {/* Vehicle Upgrade Matrix */}
              <div className="w-full grid grid-cols-2 gap-2.5 mb-6 text-left">
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
                    <div key={part} className="bg-slate-800/80 border border-white/5 rounded-2xl p-2.5 flex flex-col justify-between">
                      <div>
                        <div className="text-[11px] font-black text-slate-200">{labels[part]}</div>
                        <div className="flex gap-1 mt-1">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full ${
                                i < lvl ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]' : 'bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => handleBuyUpgrade(part)}
                        disabled={isMax}
                        className={`mt-2.5 py-1 px-2 rounded-xl text-[10px] font-black flex items-center justify-between ${
                          isMax
                            ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed'
                            : 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 border border-cyan-500/40 cursor-pointer'
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
                className="w-full py-4 text-base font-black rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
              >
                <Play size={20} /> START CLIMB
              </Button>
            </div>
          </div>
        )}

        {/* ── GAME OVER MODAL ── */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4">
            <div className="max-w-sm w-full bg-slate-900 border border-red-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
              <div className="inline-flex p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 mb-2">
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
                  className="flex-1 py-3 text-xs font-extrabold rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5"
                >
                  <RotateCcw size={16} /> RETRY [R]
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </GameFrame>
  );
}
