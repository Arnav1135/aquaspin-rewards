import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveCanvas as Canvas } from '@/components/ui/ResponsiveCanvas';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { BetControl } from '@/components/ui/BetControl';
import { Button } from '@/components/ui/Button';
import { audio } from '@/lib/audioEngine';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';
import { Trophy, Timer, Zap, Play, RotateCcw, Shield, Crown } from 'lucide-react';

// ==========================================
// CONSTANTS & GAME DEFINITIONS
// ==========================================

const ARENA_RADIUS = 46;
const ROUND_TIME = 90; // 90 seconds per match
const BASE_RADIUS = 1.3;

type GameState = 'BETTING' | 'PLAYING' | 'GAME_OVER';

interface PropItem {
  id: number;
  type: 'cone' | 'hydrant' | 'bench' | 'tree' | 'car' | 'truck' | 'building';
  pos: THREE.Vector3;
  rot: number;
  radius: number;
  height: number;
  mass: number;
  points: number;
  color: string;
  isFalling: boolean;
  fallSpeed: number;
  eatenBy?: string;
}

interface HoleEntity {
  id: string;
  name: string;
  color: string;
  rimColor: string;
  pos: THREE.Vector3;
  targetPos: THREE.Vector3;
  radius: number;
  mass: number;
  score: number;
  kills: number;
  isAI: boolean;
  respawnTimer: number;
  invulnerable: number;
}

const AI_NAMES = [
  { name: 'TitanVoid', color: '#ff2d55', rimColor: '#ff0033' },
  { name: 'EmeraldSink', color: '#00e676', rimColor: '#00ff88' },
  { name: 'AbyssReaper', color: '#b388ff', rimColor: '#7c4dff' },
  { name: 'SolarVortex', color: '#ff9100', rimColor: '#ff6d00' }
];

// ==========================================
// 3D SCENE ACTORS & COMPONENTS
// ==========================================

function ArenaFloor() {
  const gridTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#070a12';
    ctx.fillRect(0, 0, 512, 512);

    // Dark asphalt texture with subtle grid streets
    ctx.strokeStyle = '#1a2238';
    ctx.lineWidth = 4;
    for (let i = 0; i < 512; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 512);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(512, i);
      ctx.stroke();
    }

    // Gold luxury border lines
    ctx.strokeStyle = '#3b82f622';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 504);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(12, 12);
    return texture;
  }, []);

  return (
    <group>
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        <meshStandardMaterial map={gridTexture} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Outer Luxury Barrier */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 2.0, 64, 1, true]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_RADIUS, 0.25, 16, 64]} />
        <meshStandardMaterial color="#d4af37" roughness={0.1} metalness={1.0} emissive="#d4af37" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
}

// 3D Hole representation with deep event horizon
function HoleMesh({ entity }: { entity: HoleEntity }) {
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (innerRef.current) {
      innerRef.current.rotation.y += delta * 2.5;
    }
  });

  if (entity.respawnTimer > 0) return null;

  return (
    <group position={[entity.pos.x, 0.02, entity.pos.z]}>
      {/* Glowing Neon/Gold Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <torusGeometry args={[entity.radius, 0.16 + entity.radius * 0.04, 24, 48]} />
        <meshStandardMaterial
          color={entity.rimColor}
          emissive={entity.rimColor}
          emissiveIntensity={1.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Dark Vortex Event Horizon (Center Sink) */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[entity.radius * 0.96, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Interior depth funnel */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[entity.radius * 0.95, entity.radius * 0.2, 2.4, 32, 1, true]} />
        <meshBasicMaterial color="#020408" side={THREE.BackSide} />
      </mesh>

      {/* Floating Name Label */}
      <Text
        position={[0, 2.5 + entity.radius * 0.4, 0]}
        fontSize={Math.max(0.7, entity.radius * 0.4)}
        color={entity.isAI ? '#cbd5e1' : '#facc15'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.06}
        outlineColor="#000000"
      >
        {entity.name} ({Math.floor(entity.score)})
      </Text>

      {/* Invulnerability Shield Bubble */}
      {entity.invulnerable > 0 && (
        <mesh position={[0, 1.0, 0]}>
          <sphereGeometry args={[entity.radius * 1.3, 24, 24]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} roughness={0.1} metalness={0.9} />
        </mesh>
      )}
    </group>
  );
}

// 3D City Props
function PropMesh({ prop }: { prop: PropItem }) {
  if (prop.pos.y < -4.0) return null;

  const renderGeometry = () => {
    switch (prop.type) {
      case 'cone':
        return (
          <group position={[0, 0.35, 0]}>
            <mesh>
              <coneGeometry args={[0.25, 0.7, 16]} />
              <meshStandardMaterial color="#f97316" roughness={0.4} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.45, 0.1, 0.45]} />
              <meshStandardMaterial color="#111827" />
            </mesh>
          </group>
        );
      case 'hydrant':
        return (
          <group position={[0, 0.45, 0]}>
            <mesh>
              <cylinderGeometry args={[0.2, 0.25, 0.8, 16]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <sphereGeometry args={[0.2, 16, 16]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          </group>
        );
      case 'bench':
        return (
          <group position={[0, 0.35, 0]}>
            <mesh>
              <boxGeometry args={[1.4, 0.15, 0.6]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.4, -0.25]}>
              <boxGeometry args={[1.4, 0.6, 0.1]} />
              <meshStandardMaterial color="#78350f" roughness={0.6} />
            </mesh>
          </group>
        );
      case 'tree':
        return (
          <group position={[0, 1.4, 0]}>
            <mesh position={[0, -0.6, 0]}>
              <cylinderGeometry args={[0.2, 0.3, 1.4, 8]} />
              <meshStandardMaterial color="#451a03" roughness={0.9} />
            </mesh>
            <mesh position={[0, 0.5, 0]}>
              <coneGeometry args={[1.2, 2.2, 8]} />
              <meshStandardMaterial color="#15803d" roughness={0.8} />
            </mesh>
          </group>
        );
      case 'car':
        return (
          <group position={[0, 0.6, 0]}>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.6, 0.65, 3.2]} />
              <meshStandardMaterial color={prop.color} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.5, -0.2]}>
              <boxGeometry args={[1.3, 0.5, 1.8]} />
              <meshStandardMaterial color="#1e293b" roughness={0.1} />
            </mesh>
          </group>
        );
      case 'truck':
        return (
          <group position={[0, 1.1, 0]}>
            <mesh position={[0, -0.2, 0]}>
              <boxGeometry args={[2.0, 1.4, 4.8]} />
              <meshStandardMaterial color="#e2e8f0" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.1, 1.8]}>
              <boxGeometry args={[1.9, 1.2, 1.6]} />
              <meshStandardMaterial color={prop.color} metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        );
      case 'building':
        return (
          <group position={[0, prop.height / 2, 0]}>
            <mesh>
              <boxGeometry args={[prop.radius * 1.8, prop.height, prop.radius * 1.8]} />
              <meshStandardMaterial color={prop.color} roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        );
      default:
        return null;
    }
  };

  return (
    <group position={[prop.pos.x, prop.pos.y, prop.pos.z]} rotation={[0, prop.rot, 0]}>
      {renderGeometry()}
    </group>
  );
}

// Camera tracking controller
function CameraController({ playerHole }: { playerHole?: HoleEntity }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!playerHole) return;

    const r = playerHole.radius;
    const camHeight = 12 + r * 2.2;
    const camDistance = 14 + r * 2.6;

    const targetPos = new THREE.Vector3(
      playerHole.pos.x,
      camHeight,
      playerHole.pos.z + camDistance
    );

    camera.position.lerp(targetPos, delta * 3.5);
    camera.lookAt(playerHole.pos.x, 0.5, playerHole.pos.z);
  });

  return null;
}

// ==========================================
// MAIN HOLE SINK GAME COMPONENT
// ==========================================

export function HoleSinkGame({ onClose }: { onClose: () => void }) {
  const { profile, isGuest } = useAuthStore();
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [betAmount, setBetAmount] = useState(25);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [lastWin, setLastWin] = useState(0);
  const [playerRank, setPlayerRank] = useState(1);

  const isMountedRef = useRef(true);
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const pointerTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const pointerActiveRef = useRef(false);

  // Entities state
  const [player, setPlayer] = useState<HoleEntity>({
    id: 'player',
    name: 'You',
    color: '#000000',
    rimColor: '#ffd700',
    pos: new THREE.Vector3(0, 0, 0),
    targetPos: new THREE.Vector3(0, 0, 0),
    radius: BASE_RADIUS,
    mass: 1,
    score: 0,
    kills: 0,
    isAI: false,
    respawnTimer: 0,
    invulnerable: 2.0
  });

  const [aiHoles, setAiHoles] = useState<HoleEntity[]>([]);
  const [propsList, setPropsList] = useState<PropItem[]>([]);

  // Spawn initial city layout
  const generateCityProps = useCallback((): PropItem[] => {
    const list: PropItem[] = [];
    let id = 1;

    // Small props (Cones, hydrants, benches)
    for (let i = 0; i < 90; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.random() * (ARENA_RADIUS - 10);
      const isCone = Math.random() > 0.5;
      list.push({
        id: id++,
        type: isCone ? 'cone' : 'hydrant',
        pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
        rot: Math.random() * Math.PI * 2,
        radius: 0.35,
        height: 0.7,
        mass: 1.5,
        points: 5,
        color: '#f97316',
        isFalling: false,
        fallSpeed: 0
      });
    }

    // Medium props (Benches, Trees, Cars)
    for (let i = 0; i < 65; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 8 + Math.random() * (ARENA_RADIUS - 12);
      const rand = Math.random();
      const type = rand < 0.4 ? 'bench' : rand < 0.75 ? 'tree' : 'car';
      const rad = type === 'bench' ? 0.7 : type === 'tree' ? 1.0 : 1.3;
      const pts = type === 'bench' ? 15 : type === 'tree' ? 25 : 45;
      list.push({
        id: id++,
        type,
        pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
        rot: Math.random() * Math.PI * 2,
        radius: rad,
        height: type === 'car' ? 1.2 : 2.2,
        mass: pts,
        points: pts,
        color: type === 'car' ? (['#2563eb', '#dc2626', '#eab308', '#0284c7'])[i % 4] : '#15803d',
        isFalling: false,
        fallSpeed: 0
      });
    }

    // Large props (Trucks, Buildings)
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 14 + Math.random() * (ARENA_RADIUS - 16);
      const isTruck = Math.random() > 0.6;
      const type = isTruck ? 'truck' : 'building';
      const rad = isTruck ? 1.9 : 2.8 + Math.random() * 1.5;
      const pts = isTruck ? 90 : 250;
      list.push({
        id: id++,
        type,
        pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
        rot: Math.random() * Math.PI * 2,
        radius: rad,
        height: isTruck ? 2.2 : 6 + Math.random() * 8,
        mass: pts,
        points: pts,
        color: isTruck ? '#94a3b8' : (['#1e293b', '#334155', '#475569'])[i % 3],
        isFalling: false,
        fallSpeed: 0
      });
    }

    return list;
  }, []);

  // Keyboard controls listener
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Lifecycle check
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Start match
  const startMatch = async () => {
    if (gameState !== 'BETTING') return;

    if (profile && !isGuest) {
      if ((profile.tokens || 0) < betAmount) {
        toast.error('Insufficient tokens');
        return;
      }
      try {
        await secureUpdateTokens(profile.id, -betAmount);
      } catch (err: any) {
        toast.error(err?.message || 'Transaction failed');
        return;
      }
    }

    audio.play('slots', 'spin');
    setPropsList(generateCityProps());

    // Reset player
    setPlayer({
      id: 'player',
      name: 'You',
      color: '#000000',
      rimColor: '#ffd700',
      pos: new THREE.Vector3(0, 0, 0),
      targetPos: new THREE.Vector3(0, 0, 0),
      radius: BASE_RADIUS,
      mass: 1,
      score: 0,
      kills: 0,
      isAI: false,
      respawnTimer: 0,
      invulnerable: 2.0
    });

    // Spawn 4 AI Rivals distributed around arena
    const spawnedAI: HoleEntity[] = AI_NAMES.map((bot, idx) => {
      const angle = (idx * Math.PI) / 2 + Math.PI / 4;
      const dist = 18 + Math.random() * 8;
      const pos = new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
      return {
        id: `ai-${idx}`,
        name: bot.name,
        color: bot.color,
        rimColor: bot.rimColor,
        pos: pos.clone(),
        targetPos: pos.clone(),
        radius: BASE_RADIUS,
        mass: 1,
        score: 0,
        kills: 0,
        isAI: true,
        respawnTimer: 0,
        invulnerable: 2.0
      };
    });

    setAiHoles(spawnedAI);
    setTimeLeft(ROUND_TIME);
    setGameState('PLAYING');
  };

  // End match & payout
  const finalizeMatch = useCallback(
    async (finalPlayer: HoleEntity, finalAIs: HoleEntity[]) => {
      if (!isMountedRef.current) return;
      setGameState('GAME_OVER');

      const allHoles = [finalPlayer, ...finalAIs].sort((a, b) => b.score - a.score);
      const rank = allHoles.findIndex((h) => h.id === 'player') + 1;
      setPlayerRank(rank);

      let mult = 0;
      if (rank === 1) mult = 3.5;
      else if (rank === 2) mult = 1.8;
      else if (rank === 3) mult = 1.0;

      const totalWin = Math.floor(betAmount * mult);
      setLastWin(totalWin);

      if (totalWin > 0) {
        audio.play('ui', 'win');
        toast.success(`You finished #${rank}! Won ${totalWin} tokens!`);
        if (profile && !isGuest) {
          secureRecordGameResult({
            userId: profile.id,
            betAmount: 0, // Prevent double charge
            earnedAmount: totalWin,
            xpEarned: Math.floor(betAmount * (rank === 1 ? 0.35 : 0.15))
          });
        }
      } else {
        audio.play('ui', 'lose');
        toast(`Finished #${rank}. Better luck next round!`);
        if (profile && !isGuest) {
          secureRecordGameResult({
            userId: profile.id,
            betAmount: 0,
            earnedAmount: 0,
            xpEarned: Math.floor(betAmount * 0.05)
          });
        }
      }
    },
    [betAmount, profile, isGuest]
  );

  // Match countdown timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeMatch(player, aiHoles);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, player, aiHoles, finalizeMatch]);

  // Mouse & Touch movement tracking on window
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);

    // Approximate raycast to ground plane
    pointerTargetRef.current.set(nx * 36, 0, -ny * 36);
    pointerActiveRef.current = true;
  };

  // Main 60FPS Game Loop inside React state
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      // 1. Move Player
      setPlayer((prev) => {
        if (prev.respawnTimer > 0) {
          const nextTimer = prev.respawnTimer - delta;
          if (nextTimer <= 0) {
            // Respawn in safe location
            return {
              ...prev,
              respawnTimer: 0,
              invulnerable: 3.0,
              pos: new THREE.Vector3((Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20)
            };
          }
          return { ...prev, respawnTimer: nextTimer };
        }

        const invul = Math.max(0, prev.invulnerable - delta);
        const moveDir = new THREE.Vector3(0, 0, 0);

        // Keyboard vector
        if (keysRef.current['w'] || keysRef.current['arrowup']) moveDir.z -= 1;
        if (keysRef.current['s'] || keysRef.current['arrowdown']) moveDir.z += 1;
        if (keysRef.current['a'] || keysRef.current['arrowleft']) moveDir.x -= 1;
        if (keysRef.current['d'] || keysRef.current['arrowright']) moveDir.x += 1;

        const speed = Math.max(8.5, 14.0 - prev.radius * 0.7);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          prev.pos.x += moveDir.x * speed * delta;
          prev.pos.z += moveDir.z * speed * delta;
        } else if (pointerActiveRef.current) {
          // Pointer tracking
          const dx = pointerTargetRef.current.x - prev.pos.x;
          const dz = pointerTargetRef.current.z - prev.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.5) {
            prev.pos.x += (dx / dist) * speed * delta;
            prev.pos.z += (dz / dist) * speed * delta;
          }
        }

        // Clamp to arena circle
        const distFromCenter = Math.hypot(prev.pos.x, prev.pos.z);
        if (distFromCenter > ARENA_RADIUS - prev.radius) {
          const angle = Math.atan2(prev.pos.z, prev.pos.x);
          prev.pos.x = Math.cos(angle) * (ARENA_RADIUS - prev.radius);
          prev.pos.z = Math.sin(angle) * (ARENA_RADIUS - prev.radius);
        }

        return {
          ...prev,
          pos: prev.pos.clone(),
          invulnerable: invul,
          radius: BASE_RADIUS + Math.pow(prev.mass, 0.42) * 0.35
        };
      });

      // 2. Move AI Holes
      setAiHoles((prevAIs) => {
        return prevAIs.map((ai) => {
          if (ai.respawnTimer > 0) {
            const nextT = ai.respawnTimer - delta;
            if (nextT <= 0) {
              const angle = Math.random() * Math.PI * 2;
              return {
                ...ai,
                respawnTimer: 0,
                invulnerable: 3.0,
                pos: new THREE.Vector3(Math.cos(angle) * 25, 0, Math.sin(angle) * 25)
              };
            }
            return { ...ai, respawnTimer: nextT };
          }

          const invul = Math.max(0, ai.invulnerable - delta);
          const speed = Math.max(7.5, 12.0 - ai.radius * 0.6);

          // AI Wander and pick nearest consumable prop or flee
          const dx = ai.targetPos.x - ai.pos.x;
          const dz = ai.targetPos.y - ai.pos.z;
          if (Math.hypot(dx, dz) < 2.0 || Math.random() < 0.02) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDist = Math.random() * (ARENA_RADIUS - 10);
            ai.targetPos.set(Math.cos(randomAngle) * randomDist, 0, Math.sin(randomAngle) * randomDist);
          }

          const dirX = ai.targetPos.x - ai.pos.x;
          const dirZ = ai.targetPos.z - ai.pos.z;
          const dist = Math.hypot(dirX, dirZ);

          if (dist > 0.1) {
            ai.pos.x += (dirX / dist) * speed * delta;
            ai.pos.z += (dirZ / dist) * speed * delta;
          }

          // Arena bounds
          const dCenter = Math.hypot(ai.pos.x, ai.pos.z);
          if (dCenter > ARENA_RADIUS - ai.radius) {
            const ang = Math.atan2(ai.pos.z, ai.pos.x);
            ai.pos.x = Math.cos(ang) * (ARENA_RADIUS - ai.radius);
            ai.pos.z = Math.sin(ang) * (ARENA_RADIUS - ai.radius);
          }

          return {
            ...ai,
            pos: ai.pos.clone(),
            invulnerable: invul,
            radius: BASE_RADIUS + Math.pow(ai.mass, 0.42) * 0.35
          };
        });
      });

      // 3. Suction & Swallow Collision Loop for Props
      setPropsList((prevProps) => {
        let changed = false;
        const updated = prevProps.map((prop) => {
          if (prop.pos.y < -4.0) return prop; // Already swallowed

          // Check against all active holes
          const holes = [player, ...aiHoles];

          if (!prop.isFalling) {
            for (const h of holes) {
              if (h.respawnTimer > 0) continue;
              const dist = Math.hypot(prop.pos.x - h.pos.x, prop.pos.z - h.pos.z);

              // Condition: must fit inside hole radius
              if (dist < h.radius * 0.95 && prop.radius <= h.radius * 0.9) {
                changed = true;
                return {
                  ...prop,
                  isFalling: true,
                  fallSpeed: 2.0,
                  eatenBy: h.id
                };
              }
            }
          } else {
            // Actively falling down into the void
            changed = true;
            const newY = prop.pos.y - (prop.fallSpeed + 18.0 * delta) * delta;
            const eater = holes.find((h) => h.id === prop.eatenBy);

            // Inward vortex suction
            let newX = prop.pos.x;
            let newZ = prop.pos.z;
            if (eater) {
              newX += (eater.pos.x - prop.pos.x) * delta * 6.0;
              newZ += (eater.pos.z - prop.pos.z) * delta * 6.0;
            }

            // Swallow threshold
            if (newY <= -3.2 && prop.pos.y > -3.2) {
              // Award score to eater
              if (prop.eatenBy === 'player') {
                audio.play('ui', 'chip');
                setPlayer((p) => ({
                  ...p,
                  score: p.score + prop.points,
                  mass: p.mass + prop.mass * 0.25
                }));
              } else if (prop.eatenBy) {
                const eaterId = prop.eatenBy;
                setAiHoles((ais) =>
                  ais.map((ai) =>
                    ai.id === eaterId
                      ? { ...ai, score: ai.score + prop.points, mass: ai.mass + prop.mass * 0.25 }
                      : ai
                  )
                );
              }
            }

            return {
              ...prop,
              pos: new THREE.Vector3(newX, newY, newZ),
              rot: prop.rot + delta * 5.0
            };
          }

          return prop;
        });

        return changed ? updated : prevProps;
      });

      // 4. Hole-on-Hole PvP Swallowing
      if (player.respawnTimer <= 0 && player.invulnerable <= 0) {
        aiHoles.forEach((ai) => {
          if (ai.respawnTimer > 0 || ai.invulnerable > 0) return;
          const dist = Math.hypot(player.pos.x - ai.pos.x, player.pos.z - ai.pos.z);

          // Player swallows AI
          if (dist < player.radius && player.radius > ai.radius * 1.18) {
            audio.play('ui', 'win');
            toast.success(`Devoured ${ai.name}! (+100 PTS)`);
            setPlayer((p) => ({
              ...p,
              score: p.score + 100,
              kills: p.kills + 1,
              mass: p.mass + 15
            }));
            setAiHoles((ais) =>
              ais.map((a) => (a.id === ai.id ? { ...a, respawnTimer: 4.0, mass: Math.max(1, a.mass * 0.7) } : a))
            );
          }
          // AI swallows Player
          else if (dist < ai.radius && ai.radius > player.radius * 1.18) {
            audio.play('ui', 'lose');
            toast.error(`Swallowed by ${ai.name}! Respawning...`);
            setPlayer((p) => ({
              ...p,
              respawnTimer: 4.0,
              mass: Math.max(1, p.mass * 0.75)
            }));
            setAiHoles((ais) =>
              ais.map((a) => (a.id === ai.id ? { ...a, score: a.score + 100, kills: a.kills + 1, mass: a.mass + 15 } : a))
            );
          }
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, player, aiHoles]);

  // Combined Leaderboard
  const leaderboard = useMemo(() => {
    return [player, ...aiHoles].sort((a, b) => b.score - a.score);
  }, [player, aiHoles]);

  return (
    <ErrorBoundary name="HoleSink3D">
      <div
        className="relative w-full h-full bg-[#05070d] flex flex-col font-sans overflow-hidden select-none"
        onPointerMove={handlePointerMove}
      >
        {/* Top Header Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/10 rounded-xl px-4 py-2 text-xs font-bold tracking-wider">
              EXIT
            </Button>
            <div className="px-4 py-1.5 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-white/60">Balance:</span>
              <span className="text-sm font-black text-yellow-400">{profile?.tokens?.toLocaleString() || 0} 🪙</span>
            </div>
          </div>

          {gameState === 'PLAYING' && (
            <div className="flex items-center gap-4">
              {/* Match Timer */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 border border-cyan-500/30 backdrop-blur-md">
                <Timer size={18} className="text-cyan-400" />
                <span className="text-xl font-black text-white tracking-widest">{timeLeft}s</span>
              </div>

              {/* Player Score & Size Tier */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 border border-yellow-500/30 backdrop-blur-md">
                <Zap size={18} className="text-yellow-400" />
                <span className="text-lg font-black text-yellow-300">{Math.floor(player.score)} PTS</span>
                <span className="text-xs bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full ml-1">
                  Size: {player.radius.toFixed(1)}m
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Leaderboard Overlay (Top-Right) */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-16 right-4 z-20 w-44 bg-black/70 border border-white/10 backdrop-blur-md rounded-2xl p-3 shadow-2xl pointer-events-none">
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white/80">Leaderboard</span>
            </div>
            <div className="flex flex-col gap-1">
              {leaderboard.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between text-xs px-2 py-1 rounded-lg font-bold ${
                    item.id === 'player' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1 truncate">
                    <span>#{idx + 1}</span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span>{Math.floor(item.score)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3D Scene Canvas */}
        <div className="flex-1 w-full h-full relative z-0">
          <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[30, 40, 20]} intensity={1.4} castShadow shadow-mapSize={[1024, 1024]} />
            <pointLight position={[0, 15, 0]} intensity={2.0} color="#38bdf8" distance={60} />

            {/* Arena Floor & Props */}
            <ArenaFloor />

            {propsList.map((prop) => (
              <PropMesh key={prop.id} prop={prop} />
            ))}

            {/* Player Hole */}
            <HoleMesh entity={player} />

            {/* AI Rivals */}
            {aiHoles.map((ai) => (
              <HoleMesh key={ai.id} entity={ai} />
            ))}

            {/* Camera follow */}
            <CameraController playerHole={player} />

            {/* Ambient Atmosphere Particles */}
            <Sparkles count={120} scale={50} size={2} speed={0.4} opacity={0.25} color="#38bdf8" />
          </Canvas>
        </div>

        {/* Betting / Launch Overlay */}
        <AnimatePresence>
          {gameState === 'BETTING' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
            >
              <div className="w-full max-w-md bg-[#0b1220]/90 border border-cyan-500/30 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-yellow-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                  <span className="text-3xl">🕳️</span>
                </div>

                <h1 className="text-3xl font-black text-white tracking-wider mb-2">HOLE SINK 3D</h1>
                <p className="text-xs text-slate-400 mb-6 max-w-xs">
                  Devour city traffic, benches, cars & rival holes. Grow to massive proportions and dominate the 90-second match!
                </p>

                {/* Reward Tier Guide */}
                <div className="grid grid-cols-3 gap-2 w-full mb-6">
                  <div className="p-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                    <p className="text-[10px] uppercase font-bold text-yellow-400">1st Place</p>
                    <p className="text-lg font-black text-white">3.5x</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/30">
                    <p className="text-[10px] uppercase font-bold text-slate-300">2nd Place</p>
                    <p className="text-lg font-black text-white">1.8x</p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-700/10 border border-amber-700/30">
                    <p className="text-[10px] uppercase font-bold text-amber-500">3rd Place</p>
                    <p className="text-lg font-black text-white">1.0x</p>
                  </div>
                </div>

                {/* Bet Control */}
                <div className="w-full mb-6">
                  <BetControl betAmount={betAmount} setBetAmount={setBetAmount} minBet={10} maxBet={5000} />
                </div>

                <Button
                  onClick={startMatch}
                  className="w-full py-4 rounded-2xl font-black text-lg tracking-widest bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-[0_0_25px_rgba(6,182,212,0.4)]"
                >
                  <Play size={20} className="inline mr-2 fill-current" />
                  ENTER ARENA
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over / Results Modal */}
        <AnimatePresence>
          {gameState === 'GAME_OVER' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
            >
              <div
                className={`w-full max-w-sm rounded-3xl p-6 border-2 text-center shadow-2xl flex flex-col items-center ${
                  lastWin > 0
                    ? 'bg-emerald-950/90 border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-900/90 border-slate-700/50'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-black/40 border border-white/20 flex items-center justify-center mb-3">
                  {playerRank === 1 ? (
                    <Crown size={32} className="text-yellow-400" />
                  ) : playerRank <= 3 ? (
                    <Trophy size={30} className="text-slate-300" />
                  ) : (
                    <Shield size={28} className="text-slate-500" />
                  )}
                </div>

                <h2 className="text-3xl font-black text-white tracking-wider mb-1">
                  {playerRank === 1 ? 'VICTORY ROYALE!' : `FINISHED #${playerRank}`}
                </h2>
                <p className="text-sm font-bold text-slate-400 mb-4">
                  Final Score: <span className="text-yellow-400">{Math.floor(player.score)}</span> | Kills: {player.kills}
                </p>

                {lastWin > 0 ? (
                  <div className="w-full p-4 rounded-2xl bg-emerald-900/40 border border-emerald-500/40 mb-6">
                    <p className="text-xs uppercase font-extrabold text-emerald-300 tracking-widest">Payout Reward</p>
                    <p className="text-3xl font-black text-yellow-400 mt-1">+{lastWin.toLocaleString()} 🪙</p>
                  </div>
                ) : (
                  <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                    <p className="text-sm text-slate-400">Better luck next round! Need Top 3 to win.</p>
                  </div>
                )}

                <div className="flex gap-3 w-full">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="flex-1 rounded-xl py-3 text-white hover:bg-white/10 font-bold"
                  >
                    EXIT
                  </Button>
                  <Button
                    onClick={() => setGameState('BETTING')}
                    className="flex-1 rounded-xl py-3 font-extrabold bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg"
                  >
                    <RotateCcw size={16} className="inline mr-1" />
                    PLAY AGAIN
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ErrorBoundary>
  );
}

export default HoleSinkGame;
