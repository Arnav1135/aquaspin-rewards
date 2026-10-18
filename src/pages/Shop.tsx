// src/pages/Shop.tsx
// Holographic Cyber-Vault Emporium, 3D Power-Up Canister Glows & Prismatic Purchase Energy FX

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Star, Coins, Zap, Shield, Sparkles,
  Flame, Boxes, Cpu, CheckCircle2,
  SlidersHorizontal, Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { Modal } from '@/components/ui/Modal';
import { formatTokens } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  emoji: string;
  color: string;
  glowColor: string;
  effect: string;
  popular?: boolean;
  category: 'boost' | 'tactical' | 'fortune';
  rarity: 'LEGENDARY' | 'EPIC' | 'RARE';
  powerLevel: number;
  canisterCode: string;
  chargeTime: string;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'spin_boost',
    name: 'Spin Booster',
    description: 'Double token rewards on next 5 spins.',
    cost: 200,
    emoji: '⚡',
    color: '#00F0FF',
    glowColor: 'rgba(0, 240, 255, 0.6)',
    effect: '2x tokens for 5 spins',
    popular: true,
    category: 'boost',
    rarity: 'LEGENDARY',
    powerLevel: 98,
    canisterCode: 'BST-01',
    chargeTime: 'INSTANT',
  },
  {
    id: 'cooldown_skip',
    name: 'Cooldown Skip',
    description: 'Remove spin cooldown for 1 hour.',
    cost: 150,
    emoji: '⏰',
    color: '#FFD700',
    glowColor: 'rgba(255, 215, 0, 0.6)',
    effect: 'No cooldown for 1 hour',
    category: 'tactical',
    rarity: 'RARE',
    powerLevel: 85,
    canisterCode: 'CHR-02',
    chargeTime: '60 MINS',
  },
  {
    id: 'jackpot_charm',
    name: 'Jackpot Charm',
    description: 'Increases jackpot probability by 3x for 10 spins.',
    cost: 500,
    emoji: '🍀',
    color: '#00FF87',
    glowColor: 'rgba(0, 255, 135, 0.6)',
    effect: '3x jackpot chance x10 spins',
    popular: true,
    category: 'fortune',
    rarity: 'LEGENDARY',
    powerLevel: 99,
    canisterCode: 'JKP-03',
    chargeTime: '10 SPINS',
  },
  {
    id: 'streak_shield',
    name: 'Streak Shield',
    description: 'Protects your streak for one missed day.',
    cost: 300,
    emoji: '🛡️',
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    effect: 'Miss 1 day without losing streak',
    category: 'tactical',
    rarity: 'EPIC',
    powerLevel: 92,
    canisterCode: 'SHD-04',
    chargeTime: 'PASSIVE',
  },
  {
    id: 'xp_boost',
    name: 'XP Booster',
    description: 'Earn 3x XP for the next 24 hours.',
    cost: 250,
    emoji: '🌟',
    color: '#FF9900',
    glowColor: 'rgba(255, 153, 0, 0.6)',
    effect: '3x XP for 24 hours',
    category: 'boost',
    rarity: 'EPIC',
    powerLevel: 90,
    canisterCode: 'XPB-05',
    chargeTime: '24 HRS',
  },
  {
    id: 'token_rain',
    name: 'Token Rain',
    description: 'Receive a random bonus of 50–300 tokens instantly!',
    cost: 100,
    emoji: '🪙',
    color: '#FBBF24',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    effect: 'Instant 50–300 random tokens',
    category: 'fortune',
    rarity: 'RARE',
    powerLevel: 82,
    canisterCode: 'TRN-06',
    chargeTime: 'BURST',
  },
];

/**
 * High-Fidelity Volumetric Cyber Booster Canister Component
 * Renders metallic PBR end-caps, transparent acrylic pressure cylinder,
 * animated plasma core fluid, rising particle bubbles, and suspended 3D artifact icon.
 */
function VolumetricCanister({
  item,
  isHovered,
  size = 'md',
}: {
  item: ShopItem;
  isHovered?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dims = {
    sm: { w: 100, h: 130, iconSize: 'text-2xl' },
    md: { w: 140, h: 175, iconSize: 'text-3xl' },
    lg: { w: 180, h: 220, iconSize: 'text-5xl' },
  }[size];

  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: dims.w, height: dims.h }}
    >
      {/* ── Volumetric Ambient Radial Backlight ── */}
      <motion.div
        className="absolute inset-0 rounded-full blur-2xl pointer-events-none"
        animate={{
          opacity: isHovered ? 0.75 : 0.35,
          scale: isHovered ? 1.15 : 0.95,
        }}
        transition={{ duration: 0.4 }}
        style={{
          background: `radial-gradient(circle, ${item.glowColor} 0%, transparent 70%)`,
        }}
      />

      {/* ── SVG Volumetric Canister Geometry ── */}
      <svg
        viewBox="0 0 140 180"
        className="w-full h-full relative z-10 overflow-visible"
      >
        <defs>
          {/* Metallic titanium top cap gradient */}
          <linearGradient id={`metal-grad-${item.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="25%" stopColor="#475569" />
            <stop offset="50%" stopColor="#94A3B8" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Glass cylinder reflection gradient */}
          <linearGradient id={`glass-grad-${item.id}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="15%" stopColor="rgba(255,255,255,0.06)" />
            <stop offset="45%" stopColor="rgba(0,0,0,0.4)" />
            <stop offset="85%" stopColor="rgba(255,255,255,0.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
          </linearGradient>

          {/* Animated Plasma fluid core gradient */}
          <linearGradient id={`plasma-grad-${item.id}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={item.color} stopOpacity="0.85" />
            <stop offset="60%" stopColor={item.color} stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
          </linearGradient>

          {/* Glow filter for neon containment coils */}
          <filter id={`neon-glow-${item.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* 1. Base Pedestal (PBR Heavy Titanium Mount) */}
        <path
          d="M 30 152 L 40 144 L 100 144 L 110 152 L 105 168 L 35 168 Z"
          fill={`url(#metal-grad-${item.id})`}
          stroke="#475569"
          strokeWidth="1.2"
        />
        {/* Pedestal Exhaust Vents */}
        <line x1="52" y1="158" x2="88" y2="158" stroke={item.color} strokeWidth="1.5" strokeOpacity="0.8" />
        <line x1="56" y1="163" x2="84" y2="163" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.5" />

        {/* 2. Glass Containment Cylinder Body */}
        <rect
          x="38"
          y="36"
          width="64"
          height="108"
          rx="12"
          fill="#0B132B"
          stroke="#334155"
          strokeWidth="1"
        />

        {/* 3. Liquid/Plasma Core Fluid */}
        <rect
          x="42"
          y="62"
          width="56"
          height="80"
          rx="8"
          fill={`url(#plasma-grad-${item.id})`}
          opacity="0.75"
        />

        {/* Fluid meniscus shimmer */}
        <ellipse
          cx="70"
          cy="62"
          rx="28"
          ry="6"
          fill={item.color}
          opacity="0.9"
          filter={`url(#neon-glow-${item.id})`}
        />

        {/* Glass specular overlay & tick marks */}
        <rect
          x="38"
          y="36"
          width="64"
          height="108"
          rx="12"
          fill={`url(#glass-grad-${item.id})`}
        />

        {/* Measurement tick marks */}
        <line x1="42" y1="55" x2="48" y2="55" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="42" y1="75" x2="46" y2="75" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.3" />
        <line x1="42" y1="95" x2="48" y2="95" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.4" />
        <line x1="42" y1="115" x2="46" y2="115" stroke="#FFFFFF" strokeWidth="1" strokeOpacity="0.3" />

        {/* 4. Top Titanium Pressure Cap */}
        <path
          d="M 35 36 L 44 22 L 96 22 L 105 36 Z"
          fill={`url(#metal-grad-${item.id})`}
          stroke="#475569"
          strokeWidth="1.2"
        />
        {/* Top Dome Cap */}
        <ellipse cx="70" cy="22" rx="26" ry="6" fill="#64748B" />
        <ellipse cx="70" cy="20" rx="18" ry="4" fill="#94A3B8" />

        {/* Top Status LED */}
        <circle
          cx="70"
          cy="19"
          r="2.5"
          fill={item.color}
          filter={`url(#neon-glow-${item.id})`}
        />

        {/* 5. Dual Neon Containment Rings */}
        {/* Upper Ring */}
        <rect
          x="35"
          y="42"
          width="70"
          height="5"
          rx="2.5"
          fill={`url(#metal-grad-${item.id})`}
          stroke={item.color}
          strokeWidth="1"
          filter={`url(#neon-glow-${item.id})`}
        />
        {/* Lower Ring */}
        <rect
          x="35"
          y="134"
          width="70"
          height="5"
          rx="2.5"
          fill={`url(#metal-grad-${item.id})`}
          stroke={item.color}
          strokeWidth="1"
          filter={`url(#neon-glow-${item.id})`}
        />

        {/* Vertical Specular Glass Highlight Slit */}
        <path
          d="M 44 46 L 46 46 L 46 130 L 44 130 Z"
          fill="#FFFFFF"
          opacity="0.45"
        />
      </svg>

      {/* ── Suspended 3D Floating Power-Up Artifact Hologram ── */}
      <motion.div
        className={`absolute z-20 pointer-events-none drop-shadow-[0_0_12px_${item.color}] ${dims.iconSize}`}
        animate={{
          y: isHovered ? [-4, 4, -4] : [-2, 2, -2],
          scale: isHovered ? [1.1, 1.18, 1.1] : [1, 1.05, 1],
          rotate: isHovered ? [-3, 3, -3] : [0, 0, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <span>{item.emoji}</span>
      </motion.div>

      {/* ── Floating Energy Plasma Spark Micro-Particles ── */}
      <motion.div
        className="absolute z-10 w-1.5 h-1.5 rounded-full pointer-events-none"
        style={{ backgroundColor: item.color }}
        animate={{
          y: [30, -35],
          x: [-12, 10, -5],
          opacity: [0, 0.9, 0],
        }}
        transition={{
          duration: 2.2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      <motion.div
        className="absolute z-10 w-1 h-1 rounded-full pointer-events-none"
        style={{ backgroundColor: '#FFFFFF' }}
        animate={{
          y: [25, -40],
          x: [8, -14, 4],
          opacity: [0, 0.8, 0],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          delay: 0.8,
          ease: 'linear',
        }}
      />
    </div>
  );
}

export function Shop() {
  const { profile, updateProfile, isGuest } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'popular' | 'boost' | 'tactical' | 'fortune'>('all');

  const filteredItems = useMemo(() => {
    if (selectedFilter === 'all') return SHOP_ITEMS;
    if (selectedFilter === 'popular') return SHOP_ITEMS.filter((i) => i.popular);
    return SHOP_ITEMS.filter((i) => i.category === selectedFilter);
  }, [selectedFilter]);

  const handlePurchase = async (item: ShopItem) => {
    if (isGuest) {
      toast.error('Sign up to use the shop!');
      return;
    }
    if (!profile || profile.tokens < item.cost) {
      toast.error(`Not enough tokens! Need ${formatTokens(item.cost - (profile?.tokens ?? 0))} more.`);
      return;
    }
    setConfirmItem(item);
  };

  const confirmPurchase = async () => {
    if (!confirmItem || !profile) return;
    setPurchasing(confirmItem.id);
    const itemToBuy = confirmItem;
    setConfirmItem(null);

    try {
      // Apply instant effects
      let bonusTokens = 0;
      if (itemToBuy.id === 'token_rain') {
        bonusTokens = Math.floor(Math.random() * 251) + 50; // 50–300
      }

      const newBalance = profile.tokens - itemToBuy.cost + bonusTokens;
      await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);
      updateProfile({ tokens: newBalance });

      // Trigger Celebratory Prismatic Confetti Burst
      confetti({
        particleCount: 75,
        spread: 80,
        origin: { y: 0.62 },
        colors: [itemToBuy.color, '#00F0FF', '#FFD700', '#FFFFFF', '#00FF87'],
        ticks: 220,
      });

      setSuccessItem(itemToBuy);
      toast.success(`${itemToBuy.name} acquired! ${itemToBuy.effect}`);
    } catch {
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4 relative overflow-hidden">
      {/* ── Volumetric Cyber Ambient Lighting ── */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[650px] h-96 bg-cyan-500/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-80 right-[-120px] w-96 h-96 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-40 left-[-100px] w-96 h-96 bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* ── Background Cyber Grid Overlay ── */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#00F0FF 1px, transparent 1px), linear-gradient(90deg, #00F0FF 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="max-w-4xl mx-auto space-y-6 relative z-10">

        {/* ── Cyber-Vault Header & Command HUD ── */}
        <div className="glass-card p-5 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-navy-900/90 via-navy-800/80 to-navy-900/90 backdrop-blur-xl relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 px-3 py-1 bg-cyan-500/10 border-b border-l border-cyan-500/30 rounded-bl-xl flex items-center gap-1.5 text-3xs font-mono text-cyan-400">
            <Radio size={10} className="text-cyan-400 animate-pulse" />
            <span>PBR VAULT DISPENSER ACTIVE</span>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mt-2">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Boxes size={22} className="text-cyan-400" />
                <h1 className="font-display text-2xl md:text-3xl font-extrabold text-gradient-cyan">
                  Holographic Cyber-Vault
                </h1>
              </div>
              <p className="text-xs md:text-sm text-text-secondary">
                Acquire high-potency power canisters, reward multipliers, and tactical artifacts.
              </p>
            </div>

            {/* Token Reservoir Display */}
            {profile && (
              <div className="flex items-center gap-3 bg-navy-950/60 p-2.5 px-4 rounded-xl border border-gold-neon/30 shadow-inner">
                <div className="text-right">
                  <span className="text-3xs font-mono text-text-secondary uppercase tracking-widest block">
                    Available Reservoir
                  </span>
                  <TokenCounter value={profile.tokens} size="sm" />
                </div>
                <div className="w-8 h-8 rounded-lg bg-gold-neon/10 border border-gold-neon/30 flex items-center justify-center text-gold-neon shadow-[0_0_12px_rgba(255,215,0,0.3)]">
                  <Coins size={18} />
                </div>
              </div>
            )}
          </div>

          {/* Quick HUD Metrics Bar */}
          <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-3xs font-mono text-text-secondary">
            <div className="flex items-center gap-1.5">
              <Cpu size={12} className="text-cyan-400" />
              <span>STABILITY: <strong className="text-cyan-300">100% QUANTUM LOCK</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap size={12} className="text-amber-400" />
              <span>DISPENSE: <strong className="text-amber-300">INSTANTANEOUS</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield size={12} className="text-emerald-400" />
              <span>INTEGRITY: <strong className="text-emerald-300">PBR CERTIFIED</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-400" />
              <span>CATALOG: <strong className="text-purple-300">{SHOP_ITEMS.length} CANISTERS</strong></span>
            </div>
          </div>
        </div>

        {/* Guest notice */}
        {isGuest && (
          <div className="glass-card rounded-xl p-4 border border-amber-500/40 bg-amber-500/5 flex items-center gap-3 shadow-lg">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm text-text-secondary">
              <strong className="text-amber-400">Sign up</strong> to access the cyber-vault and retain power-up canisters in your inventory!
            </p>
          </div>
        )}

        {/* ── Filter / Navigation Category Tabs ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary mr-1">
            <SlidersHorizontal size={14} className="text-cyan-400" />
            <span className="font-mono text-3xs uppercase">Filter:</span>
          </div>
          {[
            { id: 'all', label: 'All Artifacts' },
            { id: 'popular', label: '⚡ Popular Cores' },
            { id: 'boost', label: 'Multipliers' },
            { id: 'tactical', label: 'Tactical' },
            { id: 'fortune', label: 'Fortune & Burst' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-all duration-200 whitespace-nowrap ${
                selectedFilter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                  : 'bg-navy-800/60 text-text-secondary hover:text-text-primary hover:bg-navy-800 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Volumetric Canister Emporium Grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item, i) => {
            const canAfford = (profile?.tokens ?? 0) >= item.cost;
            const isHovered = hoveredCard === item.id;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onMouseEnter={() => setHoveredCard(item.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className="relative group"
              >
                {/* ── Animated Radial Aura Flare for Popular Items ── */}
                {item.popular && (
                  <div
                    className="absolute -inset-[2px] rounded-2xl opacity-75 blur-md pointer-events-none transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `linear-gradient(135deg, ${item.color} 0%, rgba(255,215,0,0.6) 50%, ${item.color} 100%)`,
                    }}
                  />
                )}

                <Card
                  className={`relative h-full flex flex-col justify-between overflow-hidden border transition-all duration-300 rounded-2xl backdrop-blur-xl bg-gradient-to-br from-navy-950/95 via-navy-900/90 to-navy-950/95 ${
                    !canAfford ? 'opacity-85' : ''
                  } ${
                    isHovered
                      ? 'border-cyan-400/60 shadow-[0_12px_32px_rgba(0,0,0,0.6)] transform -translate-y-1'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Card Specular Glint Sweep on Hover */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none transition-transform duration-700 ${
                      isHovered ? 'translate-x-full' : '-translate-x-full'
                    }`}
                  />

                  {/* Header Badges */}
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span
                      className="px-2 py-0.5 rounded text-3xs font-mono font-bold tracking-wider"
                      style={{
                        backgroundColor: `${item.color}20`,
                        color: item.color,
                        border: `1px solid ${item.color}40`,
                      }}
                    >
                      {item.rarity} // {item.canisterCode}
                    </span>

                    {item.popular && (
                      <div className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 text-navy-950 text-3xs font-black tracking-wider flex items-center gap-1 shadow-[0_0_10px_rgba(255,215,0,0.5)]">
                        <Flame size={10} className="fill-navy-950" />
                        OVERDRIVE HOT
                      </div>
                    )}
                  </div>

                  {/* ── Volumetric Canister Showcase ── */}
                  <div className="my-2 flex flex-col items-center justify-center">
                    <VolumetricCanister item={item} isHovered={isHovered} size="md" />
                  </div>

                  {/* Canister Meta & Description */}
                  <div className="relative z-10 flex-1 flex flex-col justify-between mt-2">
                    <div>
                      <h3 className="font-display font-bold text-text-primary text-base flex items-center justify-between">
                        <span>{item.name}</span>
                        <span className="font-mono text-xs font-semibold" style={{ color: item.color }}>
                          Pwr {item.powerLevel}%
                        </span>
                      </h3>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    </div>

                    {/* Operational Effect Chip */}
                    <div
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg my-3"
                      style={{
                        backgroundColor: `${item.color}15`,
                        color: item.color,
                        border: `1px solid ${item.color}35`,
                      }}
                    >
                      <Star size={12} className="shrink-0" />
                      <span className="font-medium truncate">{item.effect}</span>
                    </div>

                    {/* Action Button */}
                    <Button
                      variant={canAfford ? 'primary' : 'ghost'}
                      size="sm"
                      fullWidth
                      loading={purchasing === item.id}
                      disabled={!canAfford || isGuest}
                      onClick={() => handlePurchase(item)}
                      id={`buy-${item.id}`}
                      className="font-mono font-bold tracking-wide"
                    >
                      <Coins size={14} />
                      {formatTokens(item.cost)} Tokens
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-3xs font-mono text-text-secondary/70 pt-4">
          AquaSpin Cyber-Vault Protocol v4.2 • Autonomous Energy Core Dispenser • All acquisitions permanently synced.
        </p>
      </div>

      {/* ── High-Tech Canister Inspection & Confirmation Modal ── */}
      <Modal
        isOpen={!!confirmItem}
        onClose={() => setConfirmItem(null)}
        title="Canister Acquisition Protocol"
        size="md"
      >
        {confirmItem && (
          <div className="space-y-5 text-center relative overflow-hidden py-1">
            {/* Ambient Modal Glow */}
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-40"
              style={{ backgroundColor: confirmItem.color }}
            />

            {/* Canister Inspection Viewport */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-full max-w-[200px] py-2 bg-navy-950/60 rounded-2xl border border-white/10 flex items-center justify-center shadow-inner relative">
                <div className="absolute top-2 left-2 text-3xs font-mono text-cyan-400/70">
                  SCAN // 3D PBR
                </div>
                <VolumetricCanister item={confirmItem} isHovered={true} size="md" />
              </div>
            </div>

            <div className="relative z-10">
              <span
                className="px-2.5 py-0.5 rounded text-3xs font-mono font-bold tracking-wider uppercase inline-block mb-1"
                style={{
                  backgroundColor: `${confirmItem.color}20`,
                  color: confirmItem.color,
                  border: `1px solid ${confirmItem.color}40`,
                }}
              >
                {confirmItem.rarity} ARTIFACT
              </span>
              <h3 className="font-display font-extrabold text-text-primary text-xl">
                {confirmItem.name}
              </h3>
              <p className="text-text-secondary text-xs mt-1 max-w-sm mx-auto">
                {confirmItem.description}
              </p>
            </div>

            {/* Live Token Ledger Preview */}
            <div className="relative z-10 p-3 rounded-xl bg-navy-950/70 border border-white/10 grid grid-cols-2 gap-2 text-left font-mono">
              <div>
                <span className="text-3xs text-text-secondary block">CANISTER COST</span>
                <span className="text-sm font-bold text-amber-400">
                  {formatTokens(confirmItem.cost)} Tokens
                </span>
              </div>
              <div>
                <span className="text-3xs text-text-secondary block">RESERVOIR AFTER DISPENSE</span>
                <span className="text-sm font-bold text-cyan-300">
                  {formatTokens(Math.max(0, (profile?.tokens ?? 0) - confirmItem.cost))} Tokens
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="relative z-10 flex gap-3 pt-2">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => setConfirmItem(null)}
              >
                Abort
              </Button>
              <Button
                variant="gold"
                fullWidth
                onClick={confirmPurchase}
                id="confirm-purchase-btn"
                className="font-mono font-bold tracking-wider"
              >
                Engage & Dispense
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Prismatic Celebratory Success Modal ── */}
      <Modal
        isOpen={!!successItem}
        onClose={() => setSuccessItem(null)}
        size="sm"
      >
        {successItem && (
          <div className="space-y-5 text-center py-4 relative overflow-hidden">
            {/* Prismatic Energy Shockwave Backlight */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: [0.4, 1.8, 1.4], opacity: [0, 0.7, 0.4] }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
              style={{ backgroundColor: successItem.color }}
            />

            {/* Celebratory Icon Animation */}
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: [0, 1.35, 1], rotate: 0 }}
              transition={{ duration: 0.6, type: 'spring' }}
              className="relative z-10 mx-auto w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/60 flex items-center justify-center shadow-[0_0_24px_rgba(0,255,135,0.4)]"
            >
              <CheckCircle2 size={36} className="text-emerald-400" />
            </motion.div>

            <div className="relative z-10 space-y-1">
              <div className="text-3xs font-mono text-emerald-400 font-bold tracking-widest uppercase">
                // DISPENSER CYCLING COMPLETE
              </div>
              <h3 className="font-display text-2xl font-black text-text-primary">
                Canister Deployed!
              </h3>
              <p className="text-text-secondary text-xs pt-1">
                <strong className="text-white">{successItem.name}</strong> has been successfully bound to your active session.
              </p>
            </div>

            {/* Effect Display Box */}
            <div
              className="relative z-10 p-3 rounded-xl border font-mono text-xs text-center"
              style={{
                backgroundColor: `${successItem.color}15`,
                borderColor: `${successItem.color}40`,
                color: successItem.color,
              }}
            >
              ⚡ {successItem.effect}
            </div>

            <Button
              variant="primary"
              fullWidth
              onClick={() => setSuccessItem(null)}
              className="relative z-10 font-mono font-bold tracking-wider"
            >
              Acknowledge & Continue
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
