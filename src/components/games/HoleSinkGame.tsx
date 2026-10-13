import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { ResponsiveCanvas as Canvas } from '@/components/ui/ResponsiveCanvas';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Sparkles } from '@react-three/drei';
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
import { Trophy, Timer, Zap, Play, RotateCcw, Shield, Crown } from 'lucide-react';

// ==========================================
// CONSTANTS & GAME DEFINITIONS
// ==========================================

const ARENA_RADIUS = 260; // Huge endless metropolis
const ROUND_TIME = 90; // 90 seconds for Battle Royale
const BASE_RADIUS = 1.3;

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
    | 'parkinglot'
    | 'hotdog'
    | 'ferris'
    | 'fountain'
    | 'bus'
    | 'helipad'
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
  { name: 'TitanVoid', color: '#ff2d55', rimColor: '#ff0033' },
  { name: 'EmeraldSink', color: '#00e676', rimColor: '#00ff88' },
  { name: 'AbyssReaper', color: '#b388ff', rimColor: '#7c4dff' },
  { name: 'SolarVortex', color: '#ff9100', rimColor: '#ff6d00' },
  { name: 'NebulaCrush', color: '#00e5ff', rimColor: '#00b0ff' },
  { name: 'PhantomMaw', color: '#d500f9', rimColor: '#aa00ff' },
  { name: 'CosmicDrain', color: '#ffd600', rimColor: '#ffab00' },
  { name: 'QuantumGulp', color: '#ff1744', rimColor: '#d50000' }
];

// Generate city props covering the endless 260m arena with extensive variety of urban props
function createCityProps(): PropItem[] {
  const list: PropItem[] = [];
  let id = 1;

  // 1. Streetlights on sidewalks along multiple concentric city avenues (250 streetlights)
  for (let i = 0; i < 250; i++) {
    const angle = (i / 250) * Math.PI * 2;
    const dist = 14 + (i % 8) * 30;
    list.push({
      id: id++,
      type: 'streetlight',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle + Math.PI / 2,
      radius: 0.5,
      height: 4.8,
      mass: 8,
      points: 15,
      color: '#e2e8f0',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 2. Parking Plazas with marked spaces & cars (50 parking plazas)
  for (let i = 0; i < 50; i++) {
    const angle = (i / 50) * Math.PI * 2 + 0.15;
    const dist = 22 + (i % 6) * 38;
    list.push({
      id: id++,
      type: 'parkinglot',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle,
      radius: 2.4,
      height: 0.1,
      mass: 12,
      points: 20,
      color: '#1e293b',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 3. Small props (Cones, Hydrants) (300 items)
  for (let i = 0; i < 300; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 4 + Math.random() * (ARENA_RADIUS - 10);
    const isCone = Math.random() > 0.45;
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

  // 4. Street Hot Dog & Food Carts (45 items)
  for (let i = 0; i < 45; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 10 + Math.random() * (ARENA_RADIUS - 15);
    list.push({
      id: id++,
      type: 'hotdog',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: 0.8,
      height: 1.8,
      mass: 8,
      points: 20,
      color: '#ef4444',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 5. Medium props (Park Benches, Trees, City Sedans & Sports Cars) (350 props)
  for (let i = 0; i < 350; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 6 + Math.random() * (ARENA_RADIUS - 12);
    const rand = Math.random();
    const type: 'bench' | 'tree' | 'car' = rand < 0.3 ? 'bench' : rand < 0.65 ? 'tree' : 'car';
    const rad = type === 'bench' ? 0.7 : type === 'tree' ? 1.0 : 1.35;
    const pts = type === 'bench' ? 15 : type === 'tree' ? 25 : 45;
    const carColors = ['#2563eb', '#dc2626', '#eab308', '#0284c7', '#10b981', '#8b5cf6', '#ec4899', '#f97316'];
    list.push({
      id: id++,
      type,
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: rad,
      height: type === 'car' ? 1.2 : 2.2,
      mass: pts,
      points: pts,
      color: type === 'car' ? carColors[i % carColors.length] : '#15803d',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 6. City Transit Double-Decker & Metro Buses (60 buses)
  for (let i = 0; i < 60; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 15 + Math.random() * (ARENA_RADIUS - 18);
    list.push({
      id: id++,
      type: 'bus',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: 2.2,
      height: 2.8,
      mass: 140,
      points: 120,
      color: i % 2 === 0 ? '#eab308' : '#3b82f6',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 7. City Public Fountains (30 grand fountains)
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2 + 0.3;
    const dist = 28 + (i % 5) * 45;
    list.push({
      id: id++,
      type: 'fountain',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle,
      radius: 2.6,
      height: 2.2,
      mass: 160,
      points: 150,
      color: '#38bdf8',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 8. Commercial Highway Billboards (40 billboards)
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 20 + Math.random() * (ARENA_RADIUS - 20);
    list.push({
      id: id++,
      type: 'billboard',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: 2.0,
      height: 6.5,
      mass: 80,
      points: 80,
      color: '#f43f5e',
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 9. Large props (Delivery Trucks, Commercial Towers & High-Rises) (200 skyscrapers & trucks)
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 16 + Math.random() * (ARENA_RADIUS - 22);
    const isTruck = Math.random() > 0.7;
    const type: 'truck' | 'building' = isTruck ? 'truck' : 'building';
    const rad = isTruck ? 1.9 : 2.5 + Math.random() * 2.2;
    const pts = isTruck ? 90 : 250;
    const bldgColors = ['#1e293b', '#334155', '#1e1b4b', '#0f172a', '#18181b', '#0284c7', '#047857'];
    list.push({
      id: id++,
      type,
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: Math.random() * Math.PI * 2,
      radius: rad,
      height: isTruck ? 2.2 : 9 + Math.random() * 16,
      mass: pts,
      points: pts,
      color: isTruck ? '#94a3b8' : bldgColors[i % bldgColors.length],
      isFalling: false,
      fallSpeed: 0
    });
  }

  // 10. Giant Skyline Landmarks (Ferris Wheels & Rooftop Helipads) (20 iconic landmarks)
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2 + 0.45;
    const dist = 35 + (i % 4) * 55;
    const isFerris = i % 2 === 0;
    list.push({
      id: id++,
      type: isFerris ? 'ferris' : 'helipad',
      pos: new THREE.Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
      rot: angle,
      radius: isFerris ? 4.5 : 3.8,
      height: isFerris ? 10.0 : 1.2,
      mass: 450,
      points: 500,
      color: isFerris ? '#f59e0b' : '#334155',
      isFalling: false,
      fallSpeed: 0
    });
  }

  return list;
}

// ==========================================
// 3D SCENE MESH COMPONENTS
// ==========================================

function ArenaFloor({ onPointerMoveGround }: { onPointerMoveGround?: (pt: THREE.Vector3) => void }) {
  const cityGroundTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // 1. Asphalt Roadway Base
    ctx.fillStyle = '#1e2430';
    ctx.fillRect(0, 0, 1024, 1024);

    // Fine asphalt texture grain
    for (let i = 0; i < 3500; i++) {
      const rx = Math.random() * 1024;
      const ry = Math.random() * 1024;
      ctx.fillStyle = i % 2 === 0 ? '#161a24' : '#283142';
      ctx.fillRect(rx, ry, 2, 2);
    }

    // 2. Concrete Sidewalk Curbs
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, 0, 1024, 60);
    ctx.fillRect(0, 460, 1024, 100);
    ctx.fillRect(0, 964, 1024, 60);
    ctx.fillRect(0, 0, 60, 1024);
    ctx.fillRect(460, 0, 100, 1024);
    ctx.fillRect(964, 0, 60, 1024);

    // 3. Double Yellow Central Dividing Lines
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(250, 0); ctx.lineTo(250, 1024);
    ctx.moveTo(260, 0); ctx.lineTo(260, 1024);
    ctx.moveTo(760, 0); ctx.lineTo(760, 1024);
    ctx.moveTo(770, 0); ctx.lineTo(770, 1024);
    ctx.stroke();

    // Horizontal Yellow Lines
    ctx.beginPath();
    ctx.moveTo(0, 250); ctx.lineTo(1024, 250);
    ctx.moveTo(0, 260); ctx.lineTo(1024, 260);
    ctx.moveTo(0, 760); ctx.lineTo(1024, 760);
    ctx.moveTo(0, 770); ctx.lineTo(1024, 770);
    ctx.stroke();

    // 4. White Dashed Lane Markers
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([24, 24]);
    ctx.beginPath();
    ctx.moveTo(150, 0); ctx.lineTo(150, 1024);
    ctx.moveTo(370, 0); ctx.lineTo(370, 1024);
    ctx.moveTo(650, 0); ctx.lineTo(650, 1024);
    ctx.moveTo(870, 0); ctx.lineTo(870, 1024);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. White Pedestrian Crosswalks at Intersections
    ctx.fillStyle = '#f8fafc';
    for (let c = 0; c < 12; c++) {
      ctx.fillRect(470, 80 + c * 30, 80, 14);
      ctx.fillRect(470, 580 + c * 30, 80, 14);
      ctx.fillRect(80 + c * 30, 470, 14, 80);
      ctx.fillRect(580 + c * 30, 470, 14, 80);
    }

    // 6. Demarcated White Parking Lot Bays
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let b = 0; b < 6; b++) {
      // Top Parking bay
      ctx.strokeRect(600 + b * 45, 120, 35, 70);
      // Bottom Parking bay
      ctx.strokeRect(600 + b * 45, 830, 35, 70);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(42, 42);
    return texture;
  }, []);

  return (
    <group>
      {/* Endless City Ground plane with direct Raycast capture */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.01, 0]}
        receiveShadow
        onPointerMove={(e) => {
          if (onPointerMoveGround) {
            onPointerMoveGround(e.point);
          }
        }}
      >
        <circleGeometry args={[ARENA_RADIUS, 96]} />
        <meshStandardMaterial map={cityGroundTexture} roughness={0.65} metalness={0.15} />
      </mesh>

      {/* Outer Luxury City Perimeter Barrier with Glowing Amber Guardrails */}
      <mesh position={[0, 1.0, 0]}>
        <cylinderGeometry args={[ARENA_RADIUS, ARENA_RADIUS, 2.0, 96, 1, true]} />
        <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0, 2.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ARENA_RADIUS, 0.35, 16, 96]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.9} emissive="#0284c7" emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

// 3D Hole representation with event horizon and neon rim
function HoleMesh({ entity }: { entity: HoleEntity }) {
  const innerRef = useRef<THREE.Mesh>(null);
  const accretionRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (innerRef.current) {
      innerRef.current.rotation.z += delta * 3.0;
    }
    if (accretionRef.current) {
      accretionRef.current.rotation.z -= delta * 1.8;
    }
    if (pulseRef.current) {
      const pulse = 1.0 + Math.sin(clock.getElapsedTime() * 4.5) * 0.08;
      pulseRef.current.scale.set(pulse, pulse, 1);
    }
  });

  if (entity.respawnTimer > 0) return null;

  return (
    <group position={[entity.pos.x, 0.02, entity.pos.z]}>
      {/* Glowing Neon Rim */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
        <torusGeometry args={[entity.radius, 0.16 + entity.radius * 0.04, 24, 48]} />
        <meshStandardMaterial
          color={entity.rimColor}
          emissive={entity.rimColor}
          emissiveIntensity={2.0}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Dark Vortex Event Horizon */}
      <mesh ref={innerRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[entity.radius * 0.96, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* OPTION B: AAA Screen-Space Suction Funnel & Swirling Gravitational Distortion */}
      <mesh position={[0, -1.8, 0]}>
        <cylinderGeometry args={[entity.radius * 0.98, entity.radius * 0.08, 3.6, 36, 6, true]} />
        <meshStandardMaterial
          color="#020617"
          roughness={0.1}
          metalness={0.9}
          side={THREE.DoubleSide}
          wireframe={false}
        />
      </mesh>
      {/* Dynamic Gravitational Accretion Disk (Inward Swirl) */}
      <mesh ref={accretionRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]}>
        <ringGeometry args={[entity.radius * 0.35, entity.radius * 1.45, 36]} />
        <meshBasicMaterial
          color={entity.rimColor}
          transparent
          opacity={0.38}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Event Horizon Suction Shockwave Ring */}
      <mesh ref={pulseRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <ringGeometry args={[entity.radius * 0.88, entity.radius * 1.05, 32]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.25}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Floating Name & Score Label */}
      <Text
        position={[0, 2.4 + entity.radius * 0.35, 0]}
        fontSize={Math.max(0.65, entity.radius * 0.35)}
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
      case 'streetlight':
        return (
          <group position={[0, 2.25, 0]}>
            {/* Vertical Steel Mast */}
            <mesh position={[0, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.12, 4.5, 12]} />
              <meshStandardMaterial color="#475569" roughness={0.3} metalness={0.8} />
            </mesh>
            {/* Horizontal Lamp Arm */}
            <mesh position={[0.4, 2.1, 0]} rotation={[0, 0, Math.PI / 12]}>
              <cylinderGeometry args={[0.06, 0.06, 1.0, 8]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            {/* Glowing Lamp Head */}
            <mesh position={[0.8, 2.2, 0]}>
              <boxGeometry args={[0.35, 0.15, 0.25]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.8} roughness={0.1} />
            </mesh>
            {/* Downward Streetlight Glow Spot */}
            <pointLight position={[0.8, 1.9, 0]} intensity={1.5} distance={12} color="#bae6fd" />
          </group>
        );
      case 'parkinglot':
        return (
          <group position={[0, 0.05, 0]}>
            {/* Asphalt pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[5.2, 3.4]} />
              <meshStandardMaterial color="#1e293b" roughness={0.8} />
            </mesh>
            {/* Yellow Curb Edging */}
            <mesh position={[0, 0.06, 1.7]}>
              <boxGeometry args={[5.2, 0.12, 0.2]} />
              <meshStandardMaterial color="#eab308" roughness={0.4} />
            </mesh>
            <mesh position={[0, 0.06, -1.7]}>
              <boxGeometry args={[5.2, 0.12, 0.2]} />
              <meshStandardMaterial color="#eab308" roughness={0.4} />
            </mesh>
            {/* Static Parked Sedan in Lot */}
            <group position={[0, 0.5, 0]}>
              <mesh>
                <boxGeometry args={[1.5, 0.6, 2.8]} />
                <meshStandardMaterial color="#0284c7" metalness={0.7} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0.45, -0.2]}>
                <boxGeometry args={[1.3, 0.45, 1.6]} />
                <meshStandardMaterial color="#0f172a" roughness={0.1} />
              </mesh>
            </group>
          </group>
        );
      case 'building':
        return (
          <group position={[0, prop.height / 2, 0]}>
            {/* Main Skyscraper / Building Tower */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={[prop.radius * 1.8, prop.height, prop.radius * 1.8]} />
              <meshStandardMaterial color={prop.color} roughness={0.25} metalness={0.8} />
            </mesh>
            {/* Architectural Glowing Window Grid Patterns */}
            <mesh position={[0, 0, prop.radius * 0.91]}>
              <planeGeometry args={[prop.radius * 1.5, prop.height * 0.85]} />
              <meshStandardMaterial
                color="#bae6fd"
                emissive="#38bdf8"
                emissiveIntensity={0.65}
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>
            <mesh position={[0, 0, -prop.radius * 0.91]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[prop.radius * 1.5, prop.height * 0.85]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#eab308"
                emissiveIntensity={0.5}
                roughness={0.1}
                metalness={0.9}
              />
            </mesh>
            {/* Rooftop Helipad / AC Mech Unit */}
            <mesh position={[0, prop.height / 2 + 0.3, 0]}>
              <boxGeometry args={[prop.radius * 0.9, 0.6, prop.radius * 0.9]} />
              <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.4} />
            </mesh>
            {/* Rooftop Warning Beacon Light */}
            <mesh position={[0, prop.height / 2 + 0.8, 0]}>
              <sphereGeometry args={[0.18, 12, 12]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={3.0} />
            </mesh>
          </group>
        );
      case 'hotdog':
        return (
          <group position={[0, 0.6, 0]}>
            {/* Red & White Food Cart Base */}
            <mesh>
              <boxGeometry args={[1.2, 0.8, 0.8]} />
              <meshStandardMaterial color="#ef4444" roughness={0.3} />
            </mesh>
            {/* Stainless Steel Prep Counter */}
            <mesh position={[0, 0.45, 0]}>
              <boxGeometry args={[1.3, 0.1, 0.9]} />
              <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.2} />
            </mesh>
            {/* Cart Wheels */}
            <mesh position={[-0.4, -0.25, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            <mesh position={[0.4, -0.25, 0.42]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.22, 0.22, 0.08, 16]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>
            {/* Umbrella Pole & Canopy */}
            <mesh position={[0.3, 1.0, 0]}>
              <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
            <mesh position={[0.3, 1.6, 0]}>
              <coneGeometry args={[0.9, 0.4, 8]} />
              <meshStandardMaterial color="#facc15" roughness={0.4} />
            </mesh>
          </group>
        );
      case 'bus':
        return (
          <group position={[0, 1.4, 0]}>
            {/* Bus Body Chassis */}
            <mesh castShadow>
              <boxGeometry args={[2.2, 2.4, 7.5]} />
              <meshStandardMaterial color={prop.color} metalness={0.4} roughness={0.3} />
            </mesh>
            {/* Glass Window Strips */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[2.24, 0.7, 7.0]} />
              <meshStandardMaterial color="#0284c7" metalness={0.9} roughness={0.1} />
            </mesh>
            {/* Front Destination Neon Screen */}
            <mesh position={[0, 0.95, 3.76]}>
              <planeGeometry args={[1.8, 0.35]} />
              <meshStandardMaterial color="#fef08a" emissive="#eab308" emissiveIntensity={1.5} />
            </mesh>
            {/* Wheels */}
            {[-2.2, 2.2].map((wz, wi) => (
              <group key={wi}>
                <mesh position={[-1.12, -0.9, wz]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.5, 0.5, 0.25, 16]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
                <mesh position={[1.12, -0.9, wz]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.5, 0.5, 0.25, 16]} />
                  <meshStandardMaterial color="#0f172a" />
                </mesh>
              </group>
            ))}
          </group>
        );
      case 'fountain':
        return (
          <group position={[0, 0.4, 0]}>
            {/* Circular Stone Basin */}
            <mesh>
              <cylinderGeometry args={[2.6, 2.8, 0.8, 24]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.4} />
            </mesh>
            {/* Shimmering Aqua Water Pool */}
            <mesh position={[0, 0.35, 0]}>
              <cylinderGeometry args={[2.3, 2.3, 0.15, 24]} />
              <meshStandardMaterial color="#38bdf8" roughness={0.1} metalness={0.8} />
            </mesh>
            {/* Tiered Center Spire */}
            <mesh position={[0, 1.0, 0]}>
              <cylinderGeometry args={[0.8, 1.1, 1.2, 16]} />
              <meshStandardMaterial color="#94a3b8" />
            </mesh>
            <mesh position={[0, 1.8, 0]}>
              <sphereGeometry args={[0.4, 16, 16]} />
              <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={1.2} />
            </mesh>
          </group>
        );
      case 'billboard':
        return (
          <group position={[0, 3.2, 0]}>
            {/* Steel Column Support */}
            <mesh position={[0, -1.6, 0]}>
              <cylinderGeometry args={[0.2, 0.25, 3.2, 12]} />
              <meshStandardMaterial color="#475569" metalness={0.8} />
            </mesh>
            {/* Large Glowing Display Board */}
            <mesh position={[0, 0.8, 0]}>
              <boxGeometry args={[4.2, 2.2, 0.25]} />
              <meshStandardMaterial color="#1e293b" metalness={0.6} />
            </mesh>
            <mesh position={[0, 0.8, 0.14]}>
              <planeGeometry args={[4.0, 2.0]} />
              <meshStandardMaterial color="#ec4899" emissive="#db2777" emissiveIntensity={0.8} />
            </mesh>
          </group>
        );
      case 'helipad':
        return (
          <group position={[0, 0.1, 0]}>
            {/* Octagonal landing pad */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[3.6, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.7} />
            </mesh>
            {/* Yellow Border Ring */}
            <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[3.4, 0.15, 12, 32]} />
              <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.8} />
            </mesh>
            {/* White Helipad 'H' Emblem */}
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.6, 1.85, 32]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </group>
        );
      case 'ferris':
        return (
          <group position={[0, 5.0, 0]}>
            {/* Dual A-Frame Ground Supports */}
            <mesh position={[-2.2, -2.5, 0]} rotation={[0, 0, 0.25]}>
              <cylinderGeometry args={[0.15, 0.2, 5.5, 8]} />
              <meshStandardMaterial color="#0284c7" metalness={0.8} />
            </mesh>
            <mesh position={[2.2, -2.5, 0]} rotation={[0, 0, -0.25]}>
              <cylinderGeometry args={[0.15, 0.2, 5.5, 8]} />
              <meshStandardMaterial color="#0284c7" metalness={0.8} />
            </mesh>
            {/* Giant Outer Wheel Ring */}
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[4.2, 0.15, 16, 48]} />
              <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
            </mesh>
            {/* Wheel Spokes */}
            {[0, 1, 2, 3].map((sp) => (
              <mesh key={sp} rotation={[0, 0, (sp * Math.PI) / 4]}>
                <cylinderGeometry args={[0.06, 0.06, 8.4, 8]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} />
              </mesh>
            ))}
            {/* Center Axle Hub */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.5, 0.5, 0.6, 16]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
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

// Global Trauma / Screen Shake State for AAA Impact
let globalTrauma = 0;
export function addHoleCameraTrauma(amount: number) {
  globalTrauma = Math.min(1.0, globalTrauma + amount);
}

// Camera tracking controller with smooth dynamic altitude zoom & trauma shake
function CameraController({ playerHole }: { playerHole: HoleEntity }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    const r = playerHole.radius;
    const camHeight = 13 + r * 2.2;
    const camDistance = 15 + r * 2.5;

    // Decay trauma over time
    globalTrauma = Math.max(0, globalTrauma - delta * 2.5);
    const shakeIntensity = globalTrauma * globalTrauma;
    const shakeOffsetX = (Math.random() - 0.5) * shakeIntensity * 1.8;
    const shakeOffsetY = (Math.random() - 0.5) * shakeIntensity * 1.2;

    const targetPos = new THREE.Vector3(
      playerHole.pos.x + shakeOffsetX,
      camHeight + shakeOffsetY,
      playerHole.pos.z + camDistance
    );

    camera.position.lerp(targetPos, Math.min(1, delta * 4.0));
    camera.lookAt(playerHole.pos.x, 0.5, playerHole.pos.z);
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

  const isMountedRef = useRef(true);
  const keysRef = useRef<{ [k: string]: boolean }>({});
  const groundTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const pointerActiveRef = useRef(false);

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
      const angle = (idx * Math.PI) / 2 + Math.PI / 4;
      const dist = 18 + idx * 4;
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
    if (gameMode === 'ENDLESS') return; // Endless mode never ends!

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
        invulnerable: 2.5
      };
    });

    setAiHoles(spawnedAI);
    setTimeLeft(ROUND_TIME);
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

  // Directional tracking from ground pointer or screen drag
  const handleGroundPointerMove = (groundPoint: THREE.Vector3) => {
    if (gameState !== 'PLAYING') return;
    groundTargetRef.current.copy(groundPoint);
    pointerActiveRef.current = true;
  };

  // Screen-level pointer fallback for touch / mobile drag
  const handleScreenPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gameState !== 'PLAYING') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;

    // Vector relative to screen center
    groundTargetRef.current.set(player.pos.x + dx * 0.04, 0, player.pos.z + dy * 0.04);
    pointerActiveRef.current = true;
  };

  // Continuous 60FPS Game Physics Loop
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const delta = Math.min((time - lastTime) / 1000, 0.04);
      lastTime = time;

      // 1. Move Player
      setPlayer((prev) => {
        if (prev.respawnTimer > 0) {
          const nextTimer = prev.respawnTimer - delta;
          if (nextTimer <= 0) {
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

        // Keyboard vector (W/A/S/D or Arrow keys)
        const isUp = Boolean(keysRef.current['w'] || keysRef.current['arrowup']);
        const isDown = Boolean(keysRef.current['s'] || keysRef.current['arrowdown']);
        const isLeft = Boolean(keysRef.current['a'] || keysRef.current['arrowleft']);
        const isRight = Boolean(keysRef.current['d'] || keysRef.current['arrowright']);

        if (isUp) moveDir.z -= 1;
        if (isDown) moveDir.z += 1;
        if (isLeft) moveDir.x -= 1;
        if (isRight) moveDir.x += 1;

        const speed = Math.max(10.0, 16.0 - prev.radius * 0.55);

        if (moveDir.lengthSq() > 0) {
          // Keyboard actively steering: clear pointer active to prevent mouse dragging conflict
          pointerActiveRef.current = false;
          moveDir.normalize();
          prev.pos.x += moveDir.x * speed * delta;
          prev.pos.z += moveDir.z * speed * delta;
        } else if (pointerActiveRef.current) {
          const dx = groundTargetRef.current.x - prev.pos.x;
          const dz = groundTargetRef.current.z - prev.pos.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.3) {
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
                pos: new THREE.Vector3(Math.cos(angle) * 25, 0, Math.sin(angle) * 25)
              };
            }
            return { ...ai, respawnTimer: nextT };
          }

          const invul = Math.max(0, ai.invulnerable - delta);
          const speed = Math.max(8.0, 13.0 - ai.radius * 0.5);

          // AI target pick
          const dx = ai.targetPos.x - ai.pos.x;
          const dz = ai.targetPos.z - ai.pos.z;
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
        const holes = [player, ...aiHoles];

        const updated = prevProps.map((prop) => {
          if (prop.pos.y < -4.0) return prop;

          if (!prop.isFalling) {
            for (const h of holes) {
              if (h.respawnTimer > 0) continue;
              const dist = Math.hypot(prop.pos.x - h.pos.x, prop.pos.z - h.pos.z);

              // Must fit inside hole opening
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
            // Sucking down into the vortex with gravitational vortex spiral
            changed = true;
            const newY = prop.pos.y - (prop.fallSpeed + 26.0 * delta) * delta;
            const eater = holes.find((h) => h.id === prop.eatenBy);

            let newX = prop.pos.x;
            let newZ = prop.pos.z;
            if (eater) {
              newX += (eater.pos.x - prop.pos.x) * delta * 7.0;
              newZ += (eater.pos.z - prop.pos.z) * delta * 7.0;
            }

            // Swallow point reached
            if (newY <= -3.2 && prop.pos.y > -3.2) {
              if (prop.eatenBy === 'player') {
                const screenPan = Math.max(-1, Math.min(1, prop.pos.x / 40));
                // Add proportional camera trauma based on swallowed mass
                addHoleCameraTrauma(Math.min(0.65, prop.mass * 0.04));
                audio.play3DSpatialChime(600 + Math.min(800, prop.points * 12), 0.35, screenPan, 0.4);
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

              // Infinite Dynamic City Respawn: Teleport swallowed prop to a new random location in city
              const respawnAngle = Math.random() * Math.PI * 2;
              const respawnDist = 10 + Math.random() * (ARENA_RADIUS - 15);
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

      // 4. Hole-on-Hole PvP Swallowing
      if (player.respawnTimer <= 0 && player.invulnerable <= 0) {
        aiHoles.forEach((ai) => {
          if (ai.respawnTimer > 0 || ai.invulnerable > 0) return;
          const dist = Math.hypot(player.pos.x - ai.pos.x, player.pos.z - ai.pos.z);

          // Player swallows AI
          if (dist < player.radius && player.radius > ai.radius * 1.15) {
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
          else if (dist < ai.radius && ai.radius > player.radius * 1.15) {
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

  // Live Leaderboard
  const leaderboard = useMemo(() => {
    return [player, ...aiHoles].sort((a, b) => b.score - a.score);
  }, [player, aiHoles]);

  return (
    <ErrorBoundary name="HoleSink3D">
      <div className="relative w-full h-[100dvh] min-h-[100dvh] bg-[#05070d] flex flex-col font-sans overflow-hidden select-none"
        onPointerMove={handleScreenPointerMove}
      >
        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto" style={{ paddingTop: 'env(safe-area-inset-top, 1rem)' }}>
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
              {/* Game Mode / Timer Badge */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-black/70 border border-cyan-500/30 backdrop-blur-md">
                <Timer size={18} className="text-cyan-400" />
                <span className="text-xl font-black text-white tracking-widest">
                  {gameMode === 'ENDLESS' ? '∞ ENDLESS' : `${timeLeft}s`}
                </span>
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

        {/* 3D Native Arena Canvas */}
        <div className="flex-1 w-full h-full relative z-0">
          <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
            {/* Atmospheric Skybox Dome */}
            <color attach="background" args={['#07101e']} />
            <fog attach="fog" args={['#07101e', 60, 320]} />

            {/* High-Dynamic AAA Sunlight & Hemisphere Fill */}
            <ambientLight intensity={0.7} />
            <hemisphereLight args={['#38bdf8', '#0f172a', 0.8]} />
            <directionalLight
              position={[60, 80, 40]}
              intensity={2.2}
              castShadow
              shadow-mapSize={[2048, 2048]}
              shadow-camera-near={10}
              shadow-camera-far={320}
              shadow-camera-left={-ARENA_RADIUS}
              shadow-camera-right={ARENA_RADIUS}
              shadow-camera-top={ARENA_RADIUS}
              shadow-camera-bottom={-ARENA_RADIUS}
            />
            {/* Neon Cyan Center Spotlight */}
            <pointLight position={[0, 30, 0]} intensity={3.5} color="#38bdf8" distance={200} />

            {/* Arena Floor & Props */}
            <ArenaFloor onPointerMoveGround={handleGroundPointerMove} />

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
            <Sparkles count={180} scale={60} size={2.5} speed={0.5} opacity={0.35} color="#38bdf8" />
          </Canvas>
        </div>

        {/* Betting / Match Launch Modal */}
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
                <p className="text-xs text-slate-400 mb-4 max-w-xs">
                  Devour the expanded metropolis, streetlights, traffic & rival holes. Grow to infinite proportions!
                </p>

                {/* Game Mode Selector (Battle Royale vs Endless Free Roam) */}
                <div className="flex gap-2 w-full p-1 bg-black/50 border border-white/10 rounded-2xl mb-5">
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

                {/* Reward Tier Guide (Active in Battle Royale) */}
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
                    🌟 Endless Mode: No timer! Props & rival holes respawn infinitely. Grow endlessly without match limits.
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
