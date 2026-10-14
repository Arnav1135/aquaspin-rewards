import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveCanvas as Canvas } from '@/components/ui/ResponsiveCanvas';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/authStore';
import { secureUpdateTokens, secureRecordGameResult } from '@/lib/secureEconomy';
import { BetControl } from '@/components/ui/BetControl';
import { Button } from '@/components/ui/Button';
import { DedicatedCloseButton } from '@/components/ui/DedicatedCloseButton';
import { audio } from '@/lib/audioEngine';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import toast from 'react-hot-toast';
import { Trophy, Timer, Zap, Play, RotateCcw, Shield, Crown, HelpCircle } from 'lucide-react';

// ==========================================
// CONSTANTS & GAME DEFINITIONS
// ==========================================

const ARENA_RADIUS = 160; // Vibrant metropolis arena
const ROUND_TIME = 90; // 90 seconds for Battle Royale
const BASE_RADIUS = 1.35; // Initial starting hole radius

type GameMode = 'BATTLE_ROYALE' | 'ENDLESS';
type GameState = 'BETTING' | 'PLAYING' | 'GAME_OVER';

interface PropItem {
  id: number;
  type:
    | 'cone'
    | 'hydrant'
    | 'bench'
    | 'tree'
    | 'car'
    | 'truck'
    | 'building'
    | 'streetlight'
    | 'hotdog'
    | 'fountain'
    | 'bus'
    | 'billboard';
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

const AI_BOTS: { name: string; color: string; rimColor: string }[] = [
  { name: 'ApexVortex', color: '#000000', rimColor: '#ef4444' },
  { name: 'CyberGulp', color: '#000000', rimColor: '#06b6d4' },
  { name: 'AbyssReaper', color: '#000000', rimColor: '#a855f7' },
  { name: 'SolarFlare', color: '#000000', rimColor: '#f97316' },
  { name: 'NeonPulse', color: '#000000', rimColor: '#10b981' },
  { name: 'PhantomMaw', color: '#000000', rimColor: '#ec4899' },
  { name: 'TitanDrain', color: '#000000', rimColor: '#eab308' },
  { name: 'QuantumZero', color: '#000000', rimColor: '#3b82f6' }
];

// Generate dense, colorful city props distributed from near center out to perimeter
function createCityProps(): PropItem[] {
  const list: PropItem[] = [];
  let id = 1;

  // 1. Cones & Hydrants (Small Tier 1: rad 0.3 - 0.45, mass 1 - 2, points 5 - 10)
  for (let i = 0; i < 280; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 3 + Math.random() * (ARENA_RADIUS - 12);
    const isCone = i % 2 === 0;
    list.push({
      id: id++,
      type: isCone ? 'cone' : 'hydrant',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: isCone ? 0.35 : 0.42,
      height: 0.8,
      mass: isCone ? 1.2 : 2.0,
      points: isCone ? 5 : 10,
      color: isCone ? '#f97316' : '#ef4444',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 2. Streetlights on sidewalks (Tier 1: rad 0.5, mass 3, points 15)
  for (let i = 0; i < 180; i++) {
    const angle = (i / 180) * Math.PI * 2;
    const dist = 8 + (i % 6) * 24;
    list.push({
      id: id++,
      type: 'streetlight',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle + Math.PI / 2,
      radius: 0.55,
      height: 4.8,
      mass: 3.5,
      points: 15,
      color: '#64748b',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 3. Hot Dog Carts & Food Vendors (Tier 1-2: rad 0.85, mass 6, points 25)
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * (ARENA_RADIUS - 18);
    list.push({
      id: id++,
      type: 'hotdog',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: 0.85,
      height: 1.8,
      mass: 6,
      points: 25,
      color: '#ef4444',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 4. Benches & Trees (Tier 2: rad 0.75 - 1.1, mass 5 - 12, points 20 - 35)
  for (let i = 0; i < 260; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 5 + Math.random() * (ARENA_RADIUS - 14);
    const isTree = i % 2 === 0;
    list.push({
      id: id++,
      type: isTree ? 'tree' : 'bench',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: isTree ? 1.05 : 0.75,
      height: isTree ? 2.8 : 0.8,
      mass: isTree ? 12 : 5,
      points: isTree ? 35 : 20,
      color: isTree ? '#16a34a' : '#92400e',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 5. Sedans & Sports Cars (Tier 2-3: rad 1.35, mass 25, points 60)
  const carColors = ['#ef4444', '#3b82f6', '#eab308', '#10b981', '#a855f7', '#f97316', '#06b6d4', '#f43f5e'];
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 8 + Math.random() * (ARENA_RADIUS - 16);
    list.push({
      id: id++,
      type: 'car',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: 1.35,
      height: 1.2,
      mass: 25,
      points: 60,
      color: carColors[i % carColors.length],
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 6. City Buses & Delivery Trucks (Tier 3: rad 1.9 - 2.2, mass 60 - 90, points 120 - 180)
  for (let i = 0; i < 80; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 12 + Math.random() * (ARENA_RADIUS - 20);
    const isBus = i % 2 === 0;
    list.push({
      id: id++,
      type: isBus ? 'bus' : 'truck',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: isBus ? 2.2 : 1.9,
      height: isBus ? 2.6 : 2.2,
      mass: isBus ? 90 : 60,
      points: isBus ? 180 : 120,
      color: isBus ? '#eab308' : '#38bdf8',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 7. Public Fountains & Billboards (Tier 3: rad 2.1 - 2.5, mass 80, points 150)
  for (let i = 0; i < 40; i++) {
    const angle = (i / 40) * Math.PI * 2 + 0.2;
    const dist = 15 + (i % 5) * 28;
    const isFountain = i % 2 === 0;
    list.push({
      id: id++,
      type: isFountain ? 'fountain' : 'billboard',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle,
      radius: isFountain ? 2.5 : 2.0,
      height: isFountain ? 2.2 : 6.0,
      mass: 80,
      points: 150,
      color: isFountain ? '#38bdf8' : '#ec4899',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 8. Skyscrapers & Commercial Buildings (Tier 4: rad 2.8 - 4.2, mass 180 - 320, points 350 - 600)
  const bldgColors = ['#1e293b', '#334155', '#1e3a8a', '#065f46', '#4c1d95', '#0f766e', '#701a75'];
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 18 + Math.random() * (ARENA_RADIUS - 22);
    const rad = 2.8 + Math.random() * 1.5;
    const pts = Math.floor(rad * 110);
    list.push({
      id: id++,
      type: 'building',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: rad,
      height: 10 + Math.random() * 16,
      mass: pts,
      points: pts,
      color: bldgColors[i % bldgColors.length],
      isFalling: false,
      fallSpeed: 0
    });
  }

  return list;
}

// ==========================================
// 3D SCENE MESH COMPONENTS
// ==========================================

// High-contrast, vibrant city ground with procedural streets and sidewalks
function ArenaFloor({ onPointerMoveGround }: { onPointerMoveGround?: (pt: THREE.Vector3) => void }) {
  const groundTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Rich dark slate road surface
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 512, 512);

    // Sidewalk border curbs
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 512, 40);
    ctx.fillRect(0, 472, 512, 40);
    ctx.fillRect(0, 0, 40, 512);
    ctx.fillRect(472, 0, 40, 512);

    // Sidewalk inner paving tiles
    ctx.fillStyle = '#64748b';
    ctx.fillRect(4, 4, 32, 504);
    ctx.fillRect(476, 4, 32, 504);
    ctx.fillRect(4, 4, 504, 32);
    ctx.fillRect(4, 476, 504, 32);

    // Bright yellow centerline
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(256, 40);
    ctx.lineTo(256, 472);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(40, 256);
    ctx.lineTo(472, 256);
    ctx.stroke();

    // White dashed lane markers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([16, 16]);
    ctx.beginPath();
    ctx.moveTo(148, 40);
    ctx.lineTo(148, 472);
    ctx.moveTo(364, 40);
    ctx.lineTo(364, 472);
    ctx.moveTo(40, 148);
    ctx.lineTo(472, 148);
    ctx.moveTo(40, 364);
    ctx.lineTo(472, 364);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(32, 32);
    return tex;
  }, []);

  return (
    <group>
      {/* Ground plane with raycasting */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        onPointerMove={(e) => {
          e.stopPropagation();
          if (onPointerMoveGround) {
            onPointerMoveGround(e.point);
          }
        }}
      >
        <circleGeometry args={[ARENA_RADIUS, 64]} />
        {groundTexture ? (
          <meshStandardMaterial map={groundTexture} roughness={0.6} metalness={0.1} />
        ) : (
          <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.1} />
        )}
      </mesh>

      {/* Decorative Arena Boundary Railing */}
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 2.4, 64, 1, true]} />
        <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Glowing Neon Cyan Arena Rim */}
      <mesh position={[0, 2.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_RADIUS, 0.4, 12, 64]} />
        <meshStandardMaterial
          color="#38bdf8"
          emissive="#0284c7"
          emissiveIntensity={1.2}
          roughness={0.2}
          metalness={0.8}
        />
      </mesh>
    </group>
  );
}

// 3D Hole with glowing neon rim, event horizon vortex, and clear name tags
function HoleMesh({ entity }: { entity: HoleEntity }) {
  const accretionRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (accretionRef.current) {
      accretionRef.current.rotation.z -= delta * 2.2;
    }
    if (pulseRef.current) {
      const p = 1.0 + Math.sin(clock.getElapsedTime() * 5.0) * 0.08;
      pulseRef.current.scale.set(p, p, 1);
    }
  });

  if (entity.respawnTimer > 0) return null;

  return (
    <group position={[entity.pos.x, 0.03, entity.pos.z]}>
      {/* Glowing Neon Torus Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <torusGeometry args={[entity.radius, 0.16 + entity.radius * 0.035, 16, 40]} />
        <meshStandardMaterial
          color={entity.rimColor}
          emissive={entity.rimColor}
          emissiveIntensity={2.5}
          roughness={0.15}
          metalness={0.85}
        />
      </mesh>

      {/* Deep Black Hole Void (Sits cleanly on ground plane) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[entity.radius * 0.96, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* Swirling Neon Accretion Disk */}
      <mesh ref={accretionRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]}>
        <ringGeometry args={[entity.radius * 0.65, entity.radius * 0.94, 32]} />
        <meshBasicMaterial
          color={entity.rimColor}
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner Suction Ring */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.028, 0]}>
        <ringGeometry args={[entity.radius * 0.25, entity.radius * 0.5, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Name & Score Text Badge */}
      <Text
        position={[0, 2.0 + entity.radius * 0.35, 0]}
        fontSize={Math.max(0.7, entity.radius * 0.36)}
        color={entity.isAI ? '#f1f5f9' : '#facc15'}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.08}
        outlineColor="#000000"
      >
        {entity.name} ({Math.floor(entity.score)})
      </Text>

      {/* Invulnerability Shield */}
      {entity.invulnerable > 0 && (
        <mesh position={[0, 0.8, 0]}>
          <sphereGeometry args={[entity.radius * 1.25, 20, 20]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.1} metalness={0.9} />
        </mesh>
      )}
    </group>
  );
}

// 3D City Props with vibrant, high-contrast, fully lit low-poly shapes
function PropMesh({ prop }: { prop: PropItem }) {
  if (prop.pos.y < -4.0) return null;

  const renderGeometry = () => {
    switch (prop.type) {
      case 'cone':
        return (
          <group position={[0, 0.35, 0]}>
            <mesh castShadow>
              <coneGeometry args={[0.3, 0.7, 12]} />
              <meshStandardMaterial color="#f97316" roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.3, 0]}>
              <boxGeometry args={[0.5, 0.1, 0.5]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );
      case 'hydrant':
        return (
          <group position={[0, 0.45, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[0.22, 0.26, 0.8, 12]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh position={[0, 0.42, 0]}>
              <sphereGeometry args={[0.22, 12, 12]} />
              <meshStandardMaterial color="#dc2626" />
            </mesh>
          </group>
        );
      case 'bench':
        return (
          <group position={[0, 0.35, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.5, 0.15, 0.6]} />
              <meshStandardMaterial color="#92400e" roughness={0.5} />
            </mesh>
            <mesh position={[0, 0.4, -0.25]}>
              <boxGeometry args={[1.5, 0.6, 0.1]} />
              <meshStandardMaterial color="#92400e" roughness={0.5} />
            </mesh>
          </group>
        );
      case 'tree':
        return (
          <group position={[0, 1.4, 0]}>
            <mesh position={[0, -0.6, 0]} castShadow>
              <cylinderGeometry args={[0.25, 0.35, 1.4, 8]} />
              <meshStandardMaterial color="#582f0e" roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.6, 0]} castShadow>
              <coneGeometry args={[1.3, 2.4, 8]} />
              <meshStandardMaterial color="#16a34a" roughness={0.7} />
            </mesh>
          </group>
        );
      case 'car':
        return (
          <group position={[0, 0.6, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[1.7, 0.7, 3.4]} />
              <meshStandardMaterial color={prop.color} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.55, -0.2]} castShadow>
              <boxGeometry args={[1.4, 0.5, 1.9]} />
              <meshStandardMaterial color="#0f172a" roughness={0.1} metalness={0.9} />
            </mesh>
            {/* Front Headlights */}
            <mesh position={[0.55, 0, 1.72]}>
              <boxGeometry args={[0.3, 0.2, 0.05]} />
              <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={2.0} />
            </mesh>
            <mesh position={[-0.55, 0, 1.72]}>
              <boxGeometry args={[0.3, 0.2, 0.05]} />
              <meshStandardMaterial color="#fef08a" emissive="#facc15" emissiveIntensity={2.0} />
            </mesh>
          </group>
        );
      case 'truck':
        return (
          <group position={[0, 1.1, 0]}>
            <mesh position={[0, 0.2, -0.6]} castShadow>
              <boxGeometry args={[2.1, 1.6, 4.6]} />
              <meshStandardMaterial color="#f8fafc" roughness={0.3} metalness={0.2} />
            </mesh>
            <mesh position={[0, 0.0, 2.0]} castShadow>
              <boxGeometry args={[2.0, 1.3, 1.8]} />
              <meshStandardMaterial color={prop.color} metalness={0.5} roughness={0.3} />
            </mesh>
          </group>
        );
      case 'bus':
        return (
          <group position={[0, 1.35, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.3, 2.5, 7.6]} />
              <meshStandardMaterial color={prop.color} metalness={0.4} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[2.35, 0.75, 7.1]} />
              <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
            </mesh>
          </group>
        );
      case 'streetlight':
        return (
          <group position={[0, 2.4, 0]}>
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[0.1, 0.14, 4.8, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
            </mesh>
            <mesh position={[0.4, 2.3, 0]} rotation={[0, 0, Math.PI / 10]}>
              <cylinderGeometry args={[0.07, 0.07, 1.0, 8]} />
              <meshStandardMaterial color="#64748b" metalness={0.7} />
            </mesh>
            <mesh position={[0.8, 2.4, 0]}>
              <boxGeometry args={[0.4, 0.15, 0.3]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={2.0} />
            </mesh>
          </group>
        );
      case 'hotdog':
        return (
          <group position={[0, 0.65, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.3, 0.85, 0.9]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.48, 0]}>
              <boxGeometry args={[1.4, 0.1, 1.0]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0.3, 1.6, 0]}>
              <coneGeometry args={[0.95, 0.45, 8]} />
              <meshStandardMaterial color="#facc15" roughness={0.4} />
            </mesh>
          </group>
        );
      case 'fountain':
        return (
          <group position={[0, 0.5, 0]}>
            <mesh castShadow>
              <cylinderGeometry args={[2.5, 2.7, 0.9, 18]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.4, 0]}>
              <cylinderGeometry args={[2.2, 2.2, 0.15, 18]} />
              <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} />
            </mesh>
            <mesh position={[0, 1.2, 0]}>
              <sphereGeometry args={[0.5, 12, 12]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.5} />
            </mesh>
          </group>
        );
      case 'billboard':
        return (
          <group position={[0, 3.2, 0]}>
            <mesh position={[0, -1.6, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.25, 3.2, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            <mesh position={[0, 0.8, 0]} castShadow>
              <boxGeometry args={[4.4, 2.2, 0.25]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh position={[0, 0.8, 0.14]}>
              <planeGeometry args={[4.2, 2.0]} />
              <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={1.0} />
            </mesh>
          </group>
        );
      case 'building':
        return (
          <group position={[0, prop.height / 2, 0]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[prop.radius * 1.8, prop.height, prop.radius * 1.8]} />
              <meshStandardMaterial color={prop.color} roughness={0.25} metalness={0.7} />
            </mesh>
            {/* Glowing Window Planes */}
            <mesh position={[0, 0, prop.radius * 0.91]}>
              <planeGeometry args={[prop.radius * 1.5, prop.height * 0.85]} />
              <meshStandardMaterial
                color="#bae6fd"
                emissive="#38bdf8"
                emissiveIntensity={0.8}
                roughness={0.1}
              />
            </mesh>
            <mesh position={[0, 0, -prop.radius * 0.91]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[prop.radius * 1.5, prop.height * 0.85]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#eab308"
                emissiveIntensity={0.7}
                roughness={0.1}
              />
            </mesh>
            {/* Rooftop Unit */}
            <mesh position={[0, prop.height / 2 + 0.35, 0]}>
              <boxGeometry args={[prop.radius * 0.9, 0.7, prop.radius * 0.9]} />
              <meshStandardMaterial color="#334155" metalness={0.6} />
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

// Camera tracking controller with smooth dynamic altitude zoom
function CameraController({ playerHole }: { playerHole: HoleEntity }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const r = playerHole.radius;
    // Camera smoothly pulls back as the hole grows
    const camHeight = 14 + r * 2.3;
    const camDistance = 16 + r * 2.6;

    const targetPos = new THREE.Vector3(playerHole.pos.x, camHeight, playerHole.pos.z + camDistance);

    camera.position.lerp(targetPos, Math.min(1, delta * 5.0));
    camera.lookAt(playerHole.pos.x, 0.4, playerHole.pos.z);
  });

  return null;
}

// ==========================================
// MAIN HOLE SINK 3D COMPONENT
// ==========================================

export function HoleSinkGame({ onClose }: { onClose: () => void }) {
  const { profile, isGuest } = useAuthStore();
  const [gameMode, setGameMode] = useState<GameMode>('BATTLE_ROYALE');
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [betAmount, setBetAmount] = useState(25);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [lastWin, setLastWin] = useState(0);
  const [playerRank, setPlayerRank] = useState(1);
  const [combo, setCombo] = useState({ count: 0, mult: 1 });
  const [showRules, setShowRules] = useState(false);
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isMountedRef = useRef(true);
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const groundTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isPointerDownRef = useRef(false);

  // Entities state
  const [player, setPlayer] = useState<HoleEntity>(() => ({
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
  }));

  const [aiHoles, setAiHoles] = useState<HoleEntity[]>(() => {
    return AI_BOTS.map((bot, idx) => {
      const angle = (idx * Math.PI) / 4;
      const dist = 16 + idx * 4;
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
  });

  const [propsList, setPropsList] = useState<PropItem[]>(() => createCityProps());

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

  // Match countdown timer (Only active for Battle Royale mode)
  useEffect(() => {
    if (gameState !== 'PLAYING') return;
    if (gameMode === 'ENDLESS') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishMatch(player, aiHoles);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, gameMode, player, aiHoles]);

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
    setPropsList(createCityProps());

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
      invulnerable: 2.5
    });

    // Reset AI Rivals
    const spawnedAI: HoleEntity[] = AI_BOTS.map((bot, idx) => {
      const angle = (idx * Math.PI) / 4;
      const dist = 16 + idx * 4;
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
        invulnerable: 2.5
      };
    });

    setAiHoles(spawnedAI);
    setTimeLeft(ROUND_TIME);
    isPointerDownRef.current = false;
    setGameState('PLAYING');
  };

  // End match & payout
  const finishMatch = useCallback(
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
            betAmount: 0,
            earnedAmount: totalWin,
            xpEarned: Math.floor(betAmount * (rank === 1 ? 0.35 : 0.15))
          });
        }
      } else {
        audio.play('ui', 'lose');
        toast(`Finished #${rank}. Top 3 required for token payout!`);
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

  // Ground raycast tracking: only moves when user is holding mouse or touch
  const handleGroundPointerMove = (groundPoint: THREE.Vector3) => {
    if (gameState !== 'PLAYING') return;
    if (isPointerDownRef.current) {
      groundTargetRef.current.copy(groundPoint);
    }
  };

  // Continuous 60FPS Game Physics Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      // 1. Move Player Hole
      setPlayer((prev) => {
        if (prev.respawnTimer > 0) {
          const nextTimer = prev.respawnTimer - delta;
          if (nextTimer <= 0) {
            return {
              ...prev,
              respawnTimer: 0,
              invulnerable: 3.0,
              pos: new THREE.Vector3((Math.random() - 0.5) * 16, 0, (Math.random() - 0.5) * 16)
            };
          }
          return { ...prev, respawnTimer: nextTimer };
        }

        const invul = Math.max(0, prev.invulnerable - delta);
        const moveDir = new THREE.Vector3(0, 0, 0);

        // Keyboard vector (W/A/S/D or Arrow keys)
        const isUp = Boolean(keysRef.current['w'] || keysRef.current['arrowup']);
        const isDown = Boolean(keysRef.current['s'] || keysRef.current['arrowdown']);
        const isLeft = Boolean(keysRef.current['a'] || keysRef.current['arrowleft']);
        const isRight = Boolean(keysRef.current['d'] || keysRef.current['arrowright']);

        if (isUp) moveDir.z -= 1;
        if (isDown) moveDir.z += 1;
        if (isLeft) moveDir.x -= 1;
        if (isRight) moveDir.x += 1;

        const speed = Math.max(10.0, 16.5 - prev.radius * 0.5);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          prev.pos.x += moveDir.x * speed * delta;
          prev.pos.z += moveDir.z * speed * delta;
        } else if (isPointerDownRef.current) {
          // Responsive mouse/touch dragging
          const dx = groundTargetRef.current.x - prev.pos.x;
          const dz = groundTargetRef.current.z - prev.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.4) {
            prev.pos.x += (dx / dist) * speed * delta;
            prev.pos.z += (dz / dist) * speed * delta;
          }
        }

        // Clamp to arena perimeter
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
                pos: new THREE.Vector3(Math.cos(angle) * 22, 0, Math.sin(angle) * 22)
              };
            }
            return { ...ai, respawnTimer: nextT };
          }

          const invul = Math.max(0, ai.invulnerable - delta);
          const speed = Math.max(8.5, 13.5 - ai.radius * 0.45);

          // AI target pick
          const dx = ai.targetPos.x - ai.pos.x;
          const dz = ai.targetPos.z - ai.pos.z;
          if (Math.hypot(dx, dz) < 2.5 || Math.random() < 0.02) {
            const randomAngle = Math.random() * Math.PI * 2;
            const randomDist = Math.random() * (ARENA_RADIUS - 12);
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
        const holes = [player, ...aiHoles];

        const updated = prevProps.map((prop) => {
          if (prop.pos.y < -4.0) return prop;

          if (!prop.isFalling) {
            for (const h of holes) {
              if (h.respawnTimer > 0) continue;
              const dist = Math.hypot(prop.pos.x - h.pos.x, prop.pos.z - h.pos.z);

              // Hole.io Rule: Object must fit within hole radius
              if (dist < h.radius * 0.95 && prop.radius <= h.radius * 0.92) {
                changed = true;
                return {
                  ...prop,
                  isFalling: true,
                  fallSpeed: 2.2,
                  eatenBy: h.id
                };
              }
            }
          } else {
            // Sucking down into hole vortex
            changed = true;
            const newY = prop.pos.y - (prop.fallSpeed + 24.0 * delta) * delta;
            const eater = holes.find((h) => h.id === prop.eatenBy);

            let newX = prop.pos.x;
            let newZ = prop.pos.z;
            if (eater) {
              newX += (eater.pos.x - prop.pos.x) * delta * 7.0;
              newZ += (eater.pos.z - prop.pos.z) * delta * 7.0;
            }

            // Object fully swallowed point reached
            if (newY <= -3.0 && prop.pos.y > -3.0) {
              if (prop.eatenBy === 'player') {
                audio.play('slots', 'win');

                // Combo streak
                setCombo((c) => {
                  const nextCount = c.count + 1;
                  const nextMult = nextCount >= 10 ? 3 : nextCount >= 5 ? 2 : 1;
                  return { count: nextCount, mult: nextMult };
                });
                if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
                comboTimerRef.current = setTimeout(() => {
                  setCombo({ count: 0, mult: 1 });
                }, 2200);

                setPlayer((p) => ({
                  ...p,
                  score: p.score + Math.floor(prop.points * (combo.mult || 1)),
                  mass: p.mass + prop.mass * 0.28
                }));
              } else if (prop.eatenBy) {
                const eaterId = prop.eatenBy;
                setAiHoles((ais) =>
                  ais.map((ai) =>
                    ai.id === eaterId
                      ? { ...ai, score: ai.score + prop.points, mass: ai.mass + prop.mass * 0.28 }
                      : ai
                  )
                );
              }

              // Continuous Respawn: Teleport swallowed prop elsewhere in city
              const respawnAngle = Math.random() * Math.PI * 2;
              const respawnDist = 8 + Math.random() * (ARENA_RADIUS - 16);
              return {
                ...prop,
                pos: new THREE.Vector3(Math.cos(respawnAngle) * respawnDist, 0, Math.sin(respawnAngle) * respawnDist),
                rot: Math.random() * Math.PI * 2,
                isFalling: false,
                fallSpeed: 0,
                eatenBy: undefined
              };
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

      // 4. Hole-on-Hole Swallowing (Rules: Larger hole swallows smaller hole if > 1.15x size)
      if (player.respawnTimer <= 0 && player.invulnerable <= 0) {
        aiHoles.forEach((ai) => {
          if (ai.respawnTimer > 0 || ai.invulnerable > 0) return;
          const dist = Math.hypot(player.pos.x - ai.pos.x, player.pos.z - ai.pos.z);

          // Player swallows AI rival
          if (dist < player.radius && player.radius > ai.radius * 1.15) {
            audio.play('ui', 'win');
            toast.success(`Devoured ${ai.name}! (+100 PTS)`);
            setPlayer((p) => ({
              ...p,
              score: p.score + 100,
              kills: p.kills + 1,
              mass: p.mass + 18
            }));
            setAiHoles((ais) =>
              ais.map((a) => (a.id === ai.id ? { ...a, respawnTimer: 4.0, mass: Math.max(1, a.mass * 0.7) } : a))
            );
          }
          // AI rival swallows Player
          else if (dist < ai.radius && ai.radius > player.radius * 1.15) {
            audio.play('ui', 'lose');
            toast.error(`Swallowed by ${ai.name}! Respawning...`);
            setPlayer((p) => ({
              ...p,
              respawnTimer: 4.0,
              mass: Math.max(1, p.mass * 0.75)
            }));
            setAiHoles((ais) =>
              ais.map((a) => (a.id === ai.id ? { ...a, score: a.score + 100, kills: a.kills + 1, mass: a.mass + 18 } : a))
            );
          }
        });
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [gameState, player, aiHoles]);

  // Live Leaderboard
  const leaderboard = useMemo(() => {
    return [player, ...aiHoles].sort((a, b) => b.score - a.score);
  }, [player, aiHoles]);

  return (
    <ErrorBoundary name="HoleSink3D">
      <div
        className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#020617] flex flex-col font-sans overflow-hidden select-none"
        onPointerDown={() => {
          isPointerDownRef.current = true;
        }}
        onPointerUp={() => {
          isPointerDownRef.current = false;
        }}
        onPointerLeave={() => {
          isPointerDownRef.current = false;
        }}
      >
        {/* Top Navigation Bar */}
        <div
          className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent pointer-events-auto"
          style={{ paddingTop: 'env(safe-area-inset-top, 1rem)' }}
        >
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-white hover:bg-white/10 rounded-xl px-4 py-2 text-xs font-bold tracking-wider"
            >
              EXIT
            </Button>
            <div className="px-4 py-1.5 rounded-xl bg-black/70 border border-white/10 backdrop-blur-md flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold tracking-widest text-white/60">Balance:</span>
              <span className="text-sm font-black text-yellow-400">{profile?.tokens?.toLocaleString() || 0} 🪙</span>
            </div>
            <button
              onClick={() => setShowRules(true)}
              className="p-2 rounded-xl bg-black/60 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Game Rules"
            >
              <HelpCircle size={18} />
            </button>
          </div>

          {gameState === 'PLAYING' && (
            <div className="flex items-center gap-4">
              {/* Game Mode / Timer Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 border border-cyan-500/40 backdrop-blur-md shadow-lg shadow-cyan-500/10">
                <Timer size={18} className="text-cyan-400" />
                <span className="text-xl font-black text-white tracking-widest">
                  {gameMode === 'ENDLESS' ? '∞ ENDLESS' : `${timeLeft}s`}
                </span>
              </div>

              {/* Player Score & Size Tier */}
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/80 border border-yellow-500/40 backdrop-blur-md shadow-lg">
                <Zap size={18} className="text-yellow-400" />
                <span className="text-lg font-black text-yellow-300">{Math.floor(player.score)} PTS</span>
                {combo.mult > 1 && (
                  <span className="text-xs bg-rose-500/30 text-rose-300 border border-rose-500/50 font-black px-2 py-0.5 rounded-full animate-bounce">
                    {combo.mult}x COMBO! ({combo.count})
                  </span>
                )}
                <span className="text-xs bg-yellow-400/20 text-yellow-300 font-bold px-2 py-0.5 rounded-full ml-1">
                  Size: {player.radius.toFixed(1)}m
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Leaderboard Overlay (Top-Right) */}
        {gameState === 'PLAYING' && (
          <div className="absolute top-16 right-4 z-20 w-44 bg-black/80 border border-white/10 backdrop-blur-md rounded-2xl p-3 shadow-2xl pointer-events-none">
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
              <Trophy size={14} className="text-yellow-400" />
              <span className="text-xs font-black uppercase tracking-wider text-white/80">Leaderboard</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {leaderboard.map((item, idx) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between text-xs font-bold px-2 py-1 rounded-lg ${
                    item.id === 'player' ? 'bg-yellow-500/20 text-yellow-300 ring-1 ring-yellow-400/50' : 'text-slate-300'
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

        {/* Dedicated Close Button always accessible */}
        <DedicatedCloseButton onClose={onClose} label="Exit Game" position="top-right" />

        {/* Steering Instruction Badge */}
        {gameState === 'PLAYING' && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none opacity-80 flex items-center gap-2 bg-black/75 backdrop-blur-md px-5 py-2 rounded-full border border-cyan-500/30 text-xs font-bold text-slate-200 shadow-xl">
            <span>🖱️ Hold & Drag Mouse or use WASD / Arrows to steer your hole!</span>
          </div>
        )}

        {/* 3D Native Arena Canvas with High-Contrast Vibrant Lighting */}
        <div className="flex-1 w-full h-full relative z-0">
          <Canvas
            shadows
            dpr={[1, 1.5]}
            camera={{ position: [0, 18, 20], fov: 50, near: 0.1, far: 800 }}
            gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
          >
            {/* Atmospheric Skybox Dome */}
            <color attach="background" args={['#090d16']} />

            {/* Vibrant Ambient & Directional Sunlight */}
            <ambientLight intensity={1.1} />
            <hemisphereLight args={['#38bdf8', '#1e293b', 0.9]} />
            <directionalLight
              position={[50, 75, 40]}
              intensity={2.4}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={10}
              shadow-camera-far={300}
              shadow-camera-left={-ARENA_RADIUS}
              shadow-camera-right={ARENA_RADIUS}
              shadow-camera-top={ARENA_RADIUS}
              shadow-camera-bottom={-ARENA_RADIUS}
            />
            {/* Fill Point Lights */}
            <pointLight position={[0, 30, 0]} intensity={2.5} color="#38bdf8" distance={250} />
            <pointLight position={[60, 20, 60]} intensity={1.8} color="#eab308" distance={150} />
            <pointLight position={[-60, 20, -60]} intensity={1.8} color="#06b6d4" distance={150} />

            {/* Arena Floor */}
            <ArenaFloor onPointerMoveGround={handleGroundPointerMove} />

            {/* City Props */}
            {propsList.map((prop) => (
              <PropMesh key={prop.id} prop={prop} />
            ))}

            {/* Player Hole */}
            <HoleMesh entity={player} />

            {/* AI Rivals */}
            {aiHoles.map((ai) => (
              <HoleMesh key={ai.id} entity={ai} />
            ))}

            {/* Dynamic Camera tracking */}
            <CameraController playerHole={player} />
          </Canvas>
        </div>

        {/* Betting / Match Launch Modal */}
        <AnimatePresence>
          {gameState === 'BETTING' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            >
              <div className="w-full max-w-md bg-[#0b1220]/95 border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 to-yellow-500 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(6,182,212,0.4)]">
                  <span className="text-3xl">🕳️</span>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <h1 className="text-3xl font-black text-white tracking-wider">HOLE SINK 3D</h1>
                  <span className="text-[10px] font-black bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 px-2 py-0.5 rounded-full">
                    OFFICIAL RULES
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-4 max-w-xs">
                  Steer your hole across the 3D metropolis. Eat small objects to grow, devour larger city props, and swallow smaller rival holes!
                </p>

                {/* Game Mode Selector */}
                <div className="flex gap-2 w-full p-1 bg-black/60 border border-white/10 rounded-2xl mb-5">
                  <button
                    onClick={() => setGameMode('BATTLE_ROYALE')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      gameMode === 'BATTLE_ROYALE'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    🏆 90s Battle Royale
                  </button>
                  <button
                    onClick={() => setGameMode('ENDLESS')}
                    className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                      gameMode === 'ENDLESS'
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ♾️ Endless City
                  </button>
                </div>

                {/* Reward Tier Guide (Battle Royale) */}
                {gameMode === 'BATTLE_ROYALE' ? (
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
                ) : (
                  <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold w-full mb-5">
                    🌟 Free Roam: Props & rival holes respawn continuously. Practice your steering and size growth!
                  </div>
                )}

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

        {/* Rules Modal */}
        <AnimatePresence>
          {showRules && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            >
              <div className="w-full max-w-md bg-[#0b1220] border border-cyan-500/40 rounded-3xl p-6 text-left shadow-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Trophy className="text-yellow-400" size={20} /> HOLE.IO RULES
                  </h3>
                  <button
                    onClick={() => setShowRules(false)}
                    className="text-white/60 hover:text-white font-bold text-sm px-2 py-1 rounded-lg bg-white/5"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-col gap-3 text-xs text-slate-300">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="font-bold text-yellow-400 text-sm mb-1">1. Size Progression Tiers</p>
                    <p>• <strong>Tier 1 (Size 1.3m - 2.0m):</strong> Cones, hydrants, streetlights, hot dog carts.</p>
                    <p>• <strong>Tier 2 (Size 2.0m - 3.2m):</strong> Park benches, trees, sports cars & sedans.</p>
                    <p>• <strong>Tier 3 (Size 3.2m - 5.0m):</strong> City buses, delivery trucks, fountains, billboards.</p>
                    <p>• <strong>Tier 4 (Size 5.0m+):</strong> Multi-story skyscrapers & larger rival holes!</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="font-bold text-cyan-400 text-sm mb-1">2. Hole vs Hole Devouring</p>
                    <p>If your hole is at least <strong>15% larger</strong> than a rival hole, drive over them to swallow them for +100 PTS and rapid size increase! If a rival is larger, avoid them or get swallowed.</p>
                  </div>

                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <p className="font-bold text-emerald-400 text-sm mb-1">3. Direct Steering Controls</p>
                    <p>• <strong>Mouse/Touch:</strong> Click / touch and drag anywhere to guide the hole direction.</p>
                    <p>• <strong>Keyboard:</strong> Use <strong>W, A, S, D</strong> or Arrow keys for instant steering.</p>
                  </div>
                </div>

                <Button
                  onClick={() => setShowRules(false)}
                  className="w-full py-3 rounded-xl font-bold bg-cyan-600 hover:bg-cyan-500 text-white"
                >
                  GOT IT!
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
              className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
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
