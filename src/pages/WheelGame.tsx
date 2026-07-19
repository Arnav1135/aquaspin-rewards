// src/pages/WheelGame.tsx
// 3D Canvas-based spinning wheel powered by Three.js (React Three Fiber)

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins, Volume2, VolumeX, Palette, Play, Zap, Clock } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useGameStore, WHEEL_SEGMENTS, WHEEL_THEMES } from '@/features/gameStore';
import { invokeEdgeFunction } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { RewardedAd } from '@/components/ads/RewardedAd';
import { InterstitialAd } from '@/components/ads/BannerAd';
import { playTone, vibrate, formatTokens } from '@/lib/utils';
import type { SpinResult } from '@/types/database';
import toast from 'react-hot-toast';

// 3D Imports
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, PresentationControls, Float } from '@react-three/drei';
import { GameEngine3D } from '@/engine/GameEngine3D';

const SPIN_COST = 10;

// ── 3D Wheel Component ──────────────────────────────────────────────────────
function Wheel3D({ theme, angleRef, spinning }: { theme: any, angleRef: React.MutableRefObject<number>, spinning: boolean }) {
  const wheelRef = useRef<THREE.Group>(null);
  
  // Generate a texture for the wheel face using off-screen canvas
  const wheelTexture = useMemo(() => {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 20;

    const segmentCount = WHEEL_SEGMENTS.length;
    const segmentAngle = (2 * Math.PI) / segmentCount;

    // Background
    ctx.fillStyle = theme.borderColor;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Segments
    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      const segGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const isDark = i % 2 === 0;
      segGradient.addColorStop(0, isDark ? '#0A1428' : '#0D1B36');
      segGradient.addColorStop(0.6, isDark ? '#0D1B36' : '#112244');
      segGradient.addColorStop(1, isDark ? '#112244' : '#162B57');

      ctx.fillStyle = segGradient;
      ctx.fill();

      // Border
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = seg.isJackpot ? '#FFD700' : `${theme.borderColor}60`;
      ctx.lineWidth = seg.isJackpot ? 8 : 4;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);
      ctx.translate(radius * 0.7, 0);

      ctx.font = seg.isJackpot ? 'bold 45px Orbitron, sans-serif' : 'bold 40px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (seg.isJackpot) {
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#FFD700';
        ctx.fillText('JACKPOT', 0, -20);
        ctx.font = 'bold 38px Orbitron, sans-serif';
        ctx.fillText('500', 0, 30);
      } else {
        ctx.shadowColor = seg.glowColor;
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#E8F4FD';
        const parts = seg.label.split(' ');
        ctx.fillText(parts[0], 0, -25);
        ctx.font = 'bold 32px Inter, sans-serif';
        ctx.fillStyle = seg.glowColor;
        ctx.fillText(parts[1] ?? '', 0, 25);
      }
      ctx.restore();
    });

    // Center
    ctx.beginPath();
    ctx.arc(cx, cy, 120, 0, 2 * Math.PI);
    ctx.fillStyle = theme.centerColor;
    ctx.fill();
    ctx.lineWidth = 15;
    ctx.strokeStyle = theme.borderColor;
    ctx.stroke();
    
    ctx.font = 'bold 40px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.borderColor;
    ctx.fillText('SPIN', cx, cy);

    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 16;
    return texture;
  }, [theme]);

  // Use frame to sync wheel rotation with the ref driven by the easeOut animation
  useFrame(() => {
    if (wheelRef.current) {
      wheelRef.current.rotation.z = angleRef.current;
      if (spinning) {
         // Add a tiny bit of random shake to the group to simulate force
         wheelRef.current.position.x = (Math.random() - 0.5) * 0.02;
         wheelRef.current.position.y = (Math.random() - 0.5) * 0.02;
      } else {
         wheelRef.current.position.set(0,0,0);
      }
    }
  });

  return (
    <PresentationControls global config={{ mass: 2, tension: 500 }} snap={{ mass: 4, tension: 1500 }} rotation={[0, 0, 0]} polar={[-Math.PI / 6, Math.PI / 6]} azimuth={[-Math.PI / 6, Math.PI / 6]}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2}>
        <group ref={wheelRef}>
          {/* Main Cylinder */}
          <mesh rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
            <cylinderGeometry args={[2.8, 2.8, 0.4, 64]} />
            <meshStandardMaterial 
              color="#ffffff" 
              metalness={0.4} 
              roughness={0.2} 
            />
          </mesh>
          
          {/* Top face with texture */}
          <mesh position={[0, 0, 0.21]} receiveShadow>
            <circleGeometry args={[2.8, 64]} />
            <meshStandardMaterial 
              map={wheelTexture} 
              metalness={0.3} 
              roughness={0.4} 
              emissive={theme.borderColor}
              emissiveIntensity={0.1}
            />
          </mesh>

          {/* Golden Rim */}
          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <torusGeometry args={[2.8, 0.08, 16, 100]} />
            <meshStandardMaterial color={theme.borderColor} metalness={0.8} roughness={0.2} />
          </mesh>
        </group>

        {/* 3D Pointer / Flipper */}
        <group position={[0, 2.9, 0.4]}>
          <mesh castShadow>
            <coneGeometry args={[0.3, 0.6, 4]} />
            <meshStandardMaterial color={theme.pointerColor} metalness={0.9} roughness={0.1} />
          </mesh>
        </group>
      </Float>
    </PresentationControls>
  );
}

// ── Main UI Component ────────────────────────────────────────────────────────
export function WheelGame() {
  const animationRef = useRef<number>(0);
  const currentAngleRef = useRef(0);
  const isSpinningRef = useRef(false);

  const { profile, updateProfile, refreshProfile } = useAuthStore();
  const {
    isSpinning, setSpinning,
    wheelTheme, setWheelTheme,
    spinCooldownEndsAt, setCooldown, getCooldownRemaining, isCoolingDown,
    soundEnabled, toggleSound,
    addSpinToHistory
  } = useGameStore();

  const [rewardedAdOpen, setRewardedAdOpen] = useState(false);
  const [interstitialOpen, setInterstitialOpen] = useState(false);
  const [spinResult, setSpinResult] = useState<SpinResult | null>(null);
  const [cooldownSecs, setCooldownSecs] = useState(0);
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [pendingSpinType, setPendingSpinType] = useState<'paid' | 'ad_rewarded'>('paid');
  const [floatingReward, setFloatingReward] = useState<{ amount: number; show: boolean }>({ amount: 0, show: false });

  const theme = WHEEL_THEMES[wheelTheme];
  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = (2 * Math.PI) / segmentCount;

  // ── Cooldown ticker
  useEffect(() => {
    if (!isCoolingDown()) {
      setCooldownSecs(0);
      return;
    }

    const interval = setInterval(() => {
      const remaining = getCooldownRemaining();
      setCooldownSecs(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [spinCooldownEndsAt, isCoolingDown, getCooldownRemaining]);

  // ── Execute spin animation + server result ─────────────────────────────────
  const executeSpin = useCallback(async (spinType: 'paid' | 'ad_rewarded') => {
    if (isSpinningRef.current) return;

    if (Math.random() < 0.3 && spinType === 'paid') {
      setInterstitialOpen(true);
      return;
    }

    setSpinning(true);
    isSpinningRef.current = true;
    setSpinResult(null);

    if (spinType === 'paid' && profile) {
      updateProfile({ tokens: profile.tokens - SPIN_COST });
    }

    if (soundEnabled) {
      playTone(440, 0.1, 'sawtooth', 0.2);
    }
    vibrate([50, 30, 50]);

    let serverResult: SpinResult | null = null;
    try {
      const { data, error } = await invokeEdgeFunction<SpinResult>('spin', { spin_type: spinType });
      if (error || !data) throw new Error('API Error');
      serverResult = data;
    } catch {
      serverResult = {
        success: true,
        reward: WHEEL_SEGMENTS[Math.floor(Math.random() * WHEEL_SEGMENTS.length)].tokens,
        segment: WHEEL_SEGMENTS[0].label,
        segment_index: Math.floor(Math.random() * WHEEL_SEGMENTS.length),
        spin_type: spinType,
        new_balance: (profile?.tokens ?? 0) + 50,
      };
    }

    const targetSegmentIndex = serverResult.segment_index ?? Math.floor(Math.random() * segmentCount);
    const targetSegmentAngle = -targetSegmentIndex * segmentAngle;
    const minSpins = 5 * 2 * Math.PI;
    const targetAngle = currentAngleRef.current - (currentAngleRef.current % (2 * Math.PI))
      + targetSegmentAngle - minSpins;

    const startAngle = currentAngleRef.current;
    const angleDiff = targetAngle - startAngle;
    const duration = 4000;
    const startTime = performance.now();

    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      currentAngleRef.current = startAngle + angleDiff * easedProgress;

      if (soundEnabled && Math.floor(easedProgress * 20) > Math.floor((easedProgress - 0.02) * 20)) {
        playTone(600 + (1 - easedProgress) * 400, 0.05, 'square', 0.1);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        isSpinningRef.current = false;
        setSpinning(false);
        setSpinResult(serverResult);
        addSpinToHistory(serverResult!);

        setCooldown(Date.now() + 30 * 1000);
        setCooldownSecs(30);
        refreshProfile();

        const isJackpot = serverResult!.reward >= 500;
        if (isJackpot) {
          fireJackpotConfetti();
          vibrate([100, 50, 100, 50, 200]);
          if (soundEnabled) {
            playTone(523, 0.2, 'sine', 0.4);
            setTimeout(() => playTone(659, 0.2, 'sine', 0.4), 200);
            setTimeout(() => playTone(784, 0.4, 'sine', 0.4), 400);
          }
        } else {
          fireNormalConfetti();
          vibrate(100);
          if (soundEnabled) {
            playTone(523, 0.15, 'sine', 0.3);
            setTimeout(() => playTone(659, 0.2, 'sine', 0.3), 150);
          }
        }

        setFloatingReward({ amount: serverResult!.reward, show: true });
        setTimeout(() => setFloatingReward({ amount: 0, show: false }), 2000);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [soundEnabled, profile, updateProfile, setSpinning, setCooldown, addSpinToHistory, refreshProfile, segmentAngle, segmentCount]);

  const fireNormalConfetti = () => {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 }, colors: ['#00F0FF', '#00C8D4', '#E8F4FD', '#00788A'] });
  };

  const fireJackpotConfetti = () => {
    const count = 5;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 360, startVelocity: 30, origin: { x: Math.random(), y: Math.random() - 0.2 }, colors: ['#FFD700', '#FFC107', '#FF4500', '#00F0FF'] });
      }, i * 250);
    }
  };

  const handleSpinClick = () => {
    if (isCoolingDown()) return toast.error(`Wait ${cooldownSecs}s before spinning again`);
    if (isSpinning) return;
    if (!profile) return toast.error('Please sign in to spin!');
    if (profile.tokens < SPIN_COST) return toast.error('Not enough tokens! Watch an ad for a free spin.');
    executeSpin('paid');
  };

  const handleFreeSpinAd = () => {
    if (isSpinning) return;
    setRewardedAdOpen(true);
    setPendingSpinType('ad_rewarded');
  };

  const handleAdRewardEarned = (_tokens: number) => {
    setRewardedAdOpen(false);
    setTimeout(() => executeSpin('ad_rewarded'), 500);
  };

  const handleInterstitialClose = () => {
    setInterstitialOpen(false);
    setTimeout(() => executeSpin(pendingSpinType), 300);
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4 overflow-hidden relative">
      <div className="max-w-2xl mx-auto space-y-6 relative z-10">

        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-gradient-cyan mb-2">3D Wheel of Fortune</h1>
          <p className="text-text-secondary text-sm">Spin costs {SPIN_COST} tokens • Win up to 500!</p>
        </div>

        {profile && (
          <div className="flex items-center justify-center">
            <div className="token-badge px-4 py-2">
              <TokenCounter value={profile.tokens} size="md" />
            </div>
          </div>
        )}

        <div className="flex flex-col items-center gap-4">
          
          {/* ── 3D Canvas Container ── */}
          <div className="relative w-full h-[400px] md:h-[500px]">
            <GameEngine3D enablePostProcessing={true} environmentPreset="night">
              <Wheel3D theme={theme} angleRef={currentAngleRef} spinning={isSpinning} />
              <ContactShadows position={[0, -3.5, 0]} opacity={0.5} scale={10} blur={2} far={4} color="#0A1428" />
            </GameEngine3D>
          </div>

          {/* ── Spin result announcement ── */}
          <AnimatePresence>
            {spinResult && (
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-20 pointer-events-none"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className={`glass-card rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl ${spinResult.reward >= 500 ? 'border-gold-neon bg-navy-900/80' : 'border-cyan-neon bg-navy-900/80'}`}>
                  <p className="text-sm text-text-secondary mb-1">{spinResult.reward >= 500 ? '🎰 JACKPOT! 🎰' : '🎉 You won!'}</p>
                  <p className={`font-display text-5xl font-bold drop-shadow-xl ${spinResult.reward >= 500 ? 'text-neon-gold' : 'text-neon-cyan'}`}>
                    +{formatTokens(spinResult.reward)}
                  </p>
                  <p className="text-text-secondary text-sm mt-2">{spinResult.segment}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
            <Button variant="primary" size="lg" fullWidth onClick={handleSpinClick} loading={isSpinning} disabled={isCoolingDown() || isSpinning}>
              {isCoolingDown() ? <><Clock size={18} />Wait {cooldownSecs}s</> : <><Coins size={18} />Spin ({SPIN_COST} Tokens)</>}
            </Button>
            <Button variant="neon" fullWidth onClick={handleFreeSpinAd} disabled={isSpinning}>
              <Play size={16} />Free Spin (Watch Ad)
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <button className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary" onClick={toggleSound}>
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            <div className="relative">
              <button className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary" onClick={() => setThemePickerOpen(!themePickerOpen)}>
                <Palette size={18} />
              </button>
              <AnimatePresence>
                {themePickerOpen && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-card rounded-xl p-2 flex gap-2"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                  >
                    {(Object.keys(WHEEL_THEMES) as (keyof typeof WHEEL_THEMES)[]).map((t) => (
                      <button
                        key={t}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${wheelTheme === t ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                        style={{ backgroundColor: WHEEL_THEMES[t].borderColor + '33', borderColor: WHEEL_THEMES[t].borderColor }}
                        onClick={() => { setWheelTheme(t); setThemePickerOpen(false); }}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <Card className="rounded-2xl">
          <h3 className="font-display text-sm font-semibold text-text-secondary mb-3">🎡 Wheel Segments</h3>
          <div className="grid grid-cols-3 gap-2">
            {WHEEL_SEGMENTS.map((seg, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-navy-800 border text-xs font-medium ${seg.isJackpot ? 'border-gold-neon/40 text-gold-neon' : 'border-navy-600 text-text-secondary'}`}>
                <Zap size={10} style={{ color: seg.glowColor }} />
                <span>{seg.isJackpot ? '🏆 JACKPOT' : seg.label}</span>
              </div>
            ))}
          </div>
        </Card>

      </div>

      <AnimatePresence>
        {floatingReward.show && (
          <motion.div
            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
            initial={{ opacity: 1, y: 0, scale: 0.8 }} animate={{ opacity: 0, y: -100, scale: 1.4 }} exit={{ opacity: 0 }} transition={{ duration: 1.8, ease: 'easeOut' }}
          >
            <span className="font-display font-bold text-4xl text-neon-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]">
              +{formatTokens(floatingReward.amount)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <RewardedAd isOpen={rewardedAdOpen} onClose={() => setRewardedAdOpen(false)} onRewardEarned={handleAdRewardEarned} triggerReason="free spin" />
      <InterstitialAd isOpen={interstitialOpen} onClose={handleInterstitialClose} delay={3} />
    </div>
  );
}
