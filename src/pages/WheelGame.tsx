// src/pages/WheelGame.tsx
// Physical Casino PBR Outer Bevel Rim, Metallic Chrome Pegs, Dynamic Motion-Blur Shading & Holographic Aqua-Core for Wheel Game

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins, Volume2, VolumeX, Palette, Play, Zap, Clock, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useGameStore, WHEEL_SEGMENTS, WHEEL_THEMES } from '@/features/gameStore';
import { useUIStore } from '@/features/uiStore';
import { invokeEdgeFunction } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { RewardedAd } from '@/components/ads/RewardedAd';
import { InterstitialAd } from '@/components/ads/BannerAd';
import { playTone, vibrate, formatTokens } from '@/lib/utils';
import type { SpinResult } from '@/types/database';
import toast from 'react-hot-toast';

const SPIN_COST = 10;

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

export function WheelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const currentAngleRef = useRef(0);
  const lastAngleRef = useRef(0);
  const isSpinningRef = useRef(false);

  // Kinetic flapper spring physics
  const pointerAngleRef = useRef(0);
  const pointerVelRef = useRef(0);
  const lastPegIndexRef = useRef<number>(-1);
  const sparksRef = useRef<SparkParticle[]>([]);

  const { profile, updateProfile, refreshProfile } = useAuthStore();
  const {
    isSpinning, setSpinning,
    wheelTheme, setWheelTheme,
    spinCooldownEndsAt, setCooldown, getCooldownRemaining, isCoolingDown,
    soundEnabled, toggleSound,
    addSpinToHistory
  } = useGameStore();

  // openAdModal available for future direct ad triggers
  const { openAdModal: _openAdModal } = useUIStore();

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

  // ── Spawn kinetic pointer sparks on peg hit ─────────────────────────────────
  const spawnFlapperSparks = useCallback((x: number, y: number, color: string) => {
    const sparks = sparksRef.current;
    for (let i = 0; i < 4; i++) {
      const angle = Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = Math.random() * 3 + 1.5;
      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 2.5 + 1.5,
        life: 1.0,
        maxLife: 1.0,
        color: i % 2 === 0 ? '#FFFFFF' : color,
      });
    }
  }, []);

  // ── Canvas draw function with PBR Rim, Chrome Pegs & Kinetic Flapper ─────────
  const drawWheel = useCallback((angle: number, angularVelocity: number = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const outerRimRadius = cx - 4;
    const wheelRadius = outerRimRadius - 16;

    ctx.clearRect(0, 0, width, height);

    // ── 1. Outer Deep Ambient Cabinet Drop Shadow
    const cabinetShadow = ctx.createRadialGradient(cx, cy, wheelRadius, cx, cy, outerRimRadius + 8);
    cabinetShadow.addColorStop(0, 'rgba(0,0,0,0.7)');
    cabinetShadow.addColorStop(0.8, 'rgba(0,0,0,0.3)');
    cabinetShadow.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius + 8, 0, 2 * Math.PI);
    ctx.fillStyle = cabinetShadow;
    ctx.fill();

    // ── 2. PBR Physical Brushed Metallic Outer Rim
    const rimGradient = ctx.createRadialGradient(cx, cy, wheelRadius - 2, cx, cy, outerRimRadius);
    rimGradient.addColorStop(0, '#1E293B');
    rimGradient.addColorStop(0.2, '#334155');
    rimGradient.addColorStop(0.45, '#94A3B8');
    rimGradient.addColorStop(0.65, '#E2E8F0'); // Specular rim reflection
    rimGradient.addColorStop(0.8, '#64748B');
    rimGradient.addColorStop(1, '#0F172A');

    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius, 0, 2 * Math.PI);
    ctx.arc(cx, cy, wheelRadius, 0, 2 * Math.PI, true);
    ctx.fillStyle = rimGradient;
    ctx.fill();

    // Metallic Machined Concentric Milling Ridges
    ctx.beginPath();
    ctx.arc(cx, cy, wheelRadius + (outerRimRadius - wheelRadius) * 0.5, 0, 2 * Math.PI);
    ctx.strokeStyle = `${theme.borderColor}80`;
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius - 1, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer Ambient Glow Aura
    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius + 2, 0, 2 * Math.PI);
    ctx.strokeStyle = `${theme.borderColor}40`;
    ctx.lineWidth = 4;
    ctx.shadowColor = theme.borderColor;
    ctx.shadowBlur = 18;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── 3. High-Speed Angular Motion Blur Underlay
    const isBlurActive = Math.abs(angularVelocity) > 0.04;
    if (isBlurActive) {
      const blurSamples = 3;
      for (let b = 1; b <= blurSamples; b++) {
        const blurAngle = angle - angularVelocity * (b * 0.28);
        ctx.save();
        ctx.globalAlpha = 0.18 / b;
        WHEEL_SEGMENTS.forEach((seg, i) => {
          const sAngle = blurAngle + i * segmentAngle - Math.PI / 2;
          const eAngle = sAngle + segmentAngle;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, wheelRadius, sAngle, eAngle);
          ctx.closePath();
          ctx.fillStyle = seg.isJackpot ? '#FFD700' : seg.color;
          ctx.fill();
        });
        ctx.restore();
      }
    }

    // ── 4. Main Segments Render
    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = angle + i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wheelRadius, startAngle, endAngle);
      ctx.closePath();

      // Physical multi-stop depth gradient
      const segGradient = ctx.createRadialGradient(cx, cy, 32, cx, cy, wheelRadius);
      const isDark = i % 2 === 0;

      if (seg.isJackpot) {
        // Shimmering Molten Gold Jackpot Segment
        segGradient.addColorStop(0, '#593D00');
        segGradient.addColorStop(0.35, '#B45309');
        segGradient.addColorStop(0.7, '#F59E0B');
        segGradient.addColorStop(0.92, '#FDE68A');
        segGradient.addColorStop(1, '#FFD700');
      } else {
        segGradient.addColorStop(0, isDark ? '#060D1E' : '#0B172E');
        segGradient.addColorStop(0.4, isDark ? '#0A1838' : '#10244C');
        segGradient.addColorStop(0.8, isDark ? '#0E214A' : '#163166');
        segGradient.addColorStop(1, isDark ? '#142C62' : '#1C3E80');
      }

      ctx.fillStyle = segGradient;
      ctx.fill();

      // Segment Edge Bevel (Embossed physical divider)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wheelRadius, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = seg.isJackpot ? '#FFD700' : `${theme.borderColor}55`;
      ctx.lineWidth = seg.isJackpot ? 2 : 1;
      ctx.stroke();

      // ── Segment Label & Value
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);

      const textRadius = wheelRadius * 0.64;
      ctx.translate(textRadius, 0);

      if (seg.isJackpot) {
        // Glowing Jackpot Typography with 3D drop shadow
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.font = '900 11px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('JACKPOT', 0, -8);

        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#FDE047';
        ctx.font = '900 12px Orbitron, sans-serif';
        ctx.fillText('500', 0, 7);
      } else {
        ctx.font = 'bold 9px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = '#FFFFFF';
        const parts = seg.label.split(' ');
        ctx.fillText(parts[0], 0, -6);

        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.fillStyle = seg.glowColor;
        ctx.shadowColor = seg.glowColor;
        ctx.shadowBlur = 6;
        ctx.fillText(parts[1] ?? '', 0, 6);
      }

      ctx.restore();
    });

    // ── 5. 3D Extruded Chrome Divider Pegs on Outer Track
    const pegTrackRadius = wheelRadius + (outerRimRadius - wheelRadius) * 0.5;
    const pegRadius = 3.6;

    for (let i = 0; i < segmentCount; i++) {
      const pegAngle = angle + i * segmentAngle - Math.PI / 2;
      const px = cx + Math.cos(pegAngle) * pegTrackRadius;
      const py = cy + Math.sin(pegAngle) * pegTrackRadius;

      // Peg Drop Shadow
      ctx.beginPath();
      ctx.arc(px + 1.2, py + 1.5, pegRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fill();

      // Chrome Sphere Specular Shading
      const chromeGrad = ctx.createRadialGradient(
        px - pegRadius * 0.35,
        py - pegRadius * 0.35,
        0.5,
        px,
        py,
        pegRadius
      );
      chromeGrad.addColorStop(0, '#FFFFFF'); // Specular hotspot
      chromeGrad.addColorStop(0.3, '#E2E8F0');
      chromeGrad.addColorStop(0.7, '#94A3B8');
      chromeGrad.addColorStop(0.9, '#475569');
      chromeGrad.addColorStop(1, '#0F172A');

      ctx.beginPath();
      ctx.arc(px, py, pegRadius, 0, 2 * Math.PI);
      ctx.fillStyle = chromeGrad;
      ctx.fill();

      // Fine golden/cyan rim contour
      ctx.beginPath();
      ctx.arc(px, py, pegRadius, 0, 2 * Math.PI);
      ctx.strokeStyle = `${theme.borderColor}80`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Sharp white specular glint pin
      ctx.beginPath();
      ctx.arc(px - pegRadius * 0.35, py - pegRadius * 0.35, 1, 0, 2 * Math.PI);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    // ── 6. Holographic Aqua-Core Reactor Center Hub
    const hubRadius = 34;

    // Hub Outer Turbine Ring with Counter-Rotating Cyber Runes
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-angle * 0.5);

    ctx.beginPath();
    ctx.arc(0, 0, hubRadius + 6, 0, 2 * Math.PI);
    ctx.strokeStyle = `${theme.borderColor}40`;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Turbine tick marks
    for (let t = 0; t < 8; t++) {
      const ta = (t * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(ta) * (hubRadius + 2), Math.sin(ta) * (hubRadius + 2));
      ctx.lineTo(Math.cos(ta) * (hubRadius + 7), Math.sin(ta) * (hubRadius + 7));
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    // Hub Ambient Occlusion Ring
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fill();

    // Convex Glassmorphic Core Gradient
    const hubGrad = ctx.createRadialGradient(cx - 6, cy - 8, 2, cx, cy, hubRadius);
    hubGrad.addColorStop(0, '#FFFFFF'); // Specular lens gloss
    hubGrad.addColorStop(0.2, theme.borderColor);
    hubGrad.addColorStop(0.65, '#0A1428');
    hubGrad.addColorStop(1, '#050B14');

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, 2 * Math.PI);
    ctx.fillStyle = hubGrad;
    ctx.fill();

    // Polished Metallic Core Bevel
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius, 0, 2 * Math.PI);
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = theme.borderColor;
    ctx.shadowBlur = 16;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Glowing AquaSpin Center Text
    ctx.font = '900 9px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = theme.borderColor;
    ctx.shadowBlur = 10;
    ctx.fillText('AQUASPIN', cx, cy - 4);
    ctx.font = '700 8px Inter, sans-serif';
    ctx.fillStyle = theme.borderColor;
    ctx.fillText('SPIN', cx, cy + 7);
    ctx.shadowBlur = 0;

    // ── 7. Kinetic Spring Flapper Pointer at Top Center
    const flapperLength = 26;
    const flapperBaseY = 4;
    const flapperPivotX = cx;
    const flapperPivotY = flapperBaseY;

    ctx.save();
    ctx.translate(flapperPivotX, flapperPivotY);
    ctx.rotate(pointerAngleRef.current);

    // Flapper Drop Shadow
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, flapperLength);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Flapper Metallic Blade (Gold & Titanium)
    const flapperGrad = ctx.createLinearGradient(-6, 0, 6, flapperLength);
    flapperGrad.addColorStop(0, '#FFFFFF');
    flapperGrad.addColorStop(0.3, theme.pointerColor);
    flapperGrad.addColorStop(0.7, '#E2E8F0');
    flapperGrad.addColorStop(1, '#94A3B8');

    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, flapperLength);
    ctx.closePath();
    ctx.fillStyle = flapperGrad;
    ctx.fill();

    ctx.strokeStyle = theme.pointerColor;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = theme.pointerColor;
    ctx.shadowBlur = 12;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Flapper Mounting Chrome Pivot Pin
    const pinGrad = ctx.createRadialGradient(-1, -1, 0.5, 0, 0, 4);
    pinGrad.addColorStop(0, '#FFFFFF');
    pinGrad.addColorStop(0.5, '#CBD5E1');
    pinGrad.addColorStop(1, '#334155');

    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = pinGrad;
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();

    // ── 8. Render & Animate Kinetic Tick Sparks
    const sparks = sparksRef.current;
    for (let s = sparks.length - 1; s >= 0; s--) {
      const sp = sparks[s];
      sp.x += sp.vx;
      sp.y += sp.vy;
      sp.vy += 0.15; // Gravity
      sp.life -= 0.04;

      if (sp.life <= 0) {
        sparks.splice(s, 1);
        continue;
      }

      ctx.save();
      ctx.globalAlpha = sp.life;
      ctx.fillStyle = sp.color;
      ctx.shadowColor = sp.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size * sp.life, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }, [theme, segmentAngle, segmentCount]);

  // ── Initial draw & resize listener
  useEffect(() => {
    drawWheel(currentAngleRef.current, 0);
  }, [drawWheel]);

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

    // Show pre-spin interstitial 30% of the time
    if (Math.random() < 0.3 && spinType === 'paid') {
      setInterstitialOpen(true);
      return;
    }

    setSpinning(true);
    isSpinningRef.current = true;
    setSpinResult(null);

    // Optimistic token deduction for paid spin
    if (spinType === 'paid' && profile) {
      updateProfile({ tokens: profile.tokens - SPIN_COST });
    }

    // Play spin start sound
    if (soundEnabled) {
      playTone(440, 0.1, 'sawtooth', 0.2);
    }
    vibrate([50, 30, 50]);

    // Call edge function (server generates the actual result)
    let serverResult: SpinResult | null = null;
    try {
      const { data, error } = await invokeEdgeFunction<SpinResult>('spin', { spin_type: spinType });
      if (error || !data) {
        toast.error('Spin failed. Please try again.');
        setSpinning(false);
        isSpinningRef.current = false;
        if (spinType === 'paid' && profile) {
          updateProfile({ tokens: profile.tokens }); // Revert
        }
        return;
      }
      serverResult = data;
    } catch {
      // Fallback to mock result for offline/guest play
      serverResult = {
        success: true,
        reward: WHEEL_SEGMENTS[Math.floor(Math.random() * WHEEL_SEGMENTS.length)].tokens,
        segment: WHEEL_SEGMENTS[0].label,
        segment_index: Math.floor(Math.random() * WHEEL_SEGMENTS.length),
        spin_type: spinType,
        new_balance: (profile?.tokens ?? 0) + 50,
      };
    }

    // ── Animate wheel to land on server-determined segment ─────────────────
    const targetSegmentIndex = serverResult.segment_index ?? Math.floor(Math.random() * segmentCount);

    // Calculate target angle (land pointer at top of target segment)
    const targetSegmentAngle = -targetSegmentIndex * segmentAngle;
    const minSpins = 5 * 2 * Math.PI;
    const targetAngle =
      currentAngleRef.current -
      (currentAngleRef.current % (2 * Math.PI)) +
      targetSegmentAngle +
      minSpins -
      Math.PI / 2 +
      segmentAngle / 2;

    const startAngle = currentAngleRef.current;
    const angleDiff = targetAngle - startAngle;
    const duration = 4200; // 4.2 second luxurious physical spin
    const startTime = performance.now();

    // Ease-out quintic for weighty luxury feel
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 5);

    lastAngleRef.current = startAngle;
    lastPegIndexRef.current = -1;

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      const newAngle = startAngle + angleDiff * easedProgress;
      const angularVelocity = newAngle - lastAngleRef.current;
      lastAngleRef.current = newAngle;
      currentAngleRef.current = newAngle;

      // ── Physical Flapper & Peg Collision Detection ──
      // Pointer is located at top center (-Math.PI / 2)
      // Check which peg is passing top center
      const normalizedAngle = (newAngle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentPegIndex = Math.floor(normalizedAngle / segmentAngle);

      if (currentPegIndex !== lastPegIndexRef.current) {
        lastPegIndexRef.current = currentPegIndex;

        // Deflect flapper in direction of rotation
        pointerAngleRef.current = 0.36;
        pointerVelRef.current = 0;

        // Spawn spark particles from flapper tip
        const canvas = canvasRef.current;
        if (canvas) {
          spawnFlapperSparks(canvas.width / 2, 26, theme.borderColor);
        }

        // Crisp mechanical peg tick chime
        if (soundEnabled) {
          const pitch = 640 + (1 - easedProgress) * 360;
          playTone(pitch, 0.035, 'triangle', 0.14);
        }
      }

      // Spring physics on flapper pointer
      pointerVelRef.current += (0 - pointerAngleRef.current) * 0.42 - pointerVelRef.current * 0.28;
      pointerAngleRef.current += pointerVelRef.current;

      drawWheel(newAngle, angularVelocity);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
        pointerAngleRef.current = 0;
        pointerVelRef.current = 0;
        isSpinningRef.current = false;
        setSpinning(false);
        setSpinResult(serverResult);
        addSpinToHistory(serverResult!);

        // Set server-enforced cooldown
        setCooldown(Date.now() + 30 * 1000);
        setCooldownSecs(30);

        // Refresh profile with new balance
        refreshProfile();

        // Celebration
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

        // Show floating reward
        setFloatingReward({ amount: serverResult!.reward, show: true });
        setTimeout(() => setFloatingReward({ amount: 0, show: false }), 2000);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [
    soundEnabled,
    profile,
    updateProfile,
    setSpinning,
    setCooldown,
    addSpinToHistory,
    refreshProfile,
    drawWheel,
    segmentAngle,
    segmentCount,
    spawnFlapperSparks,
    theme.borderColor,
  ]);

  const fireNormalConfetti = () => {
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#00F0FF', '#00C8D4', '#E8F4FD', '#FFD700'],
    });
  };

  const fireJackpotConfetti = () => {
    const count = 5;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        confetti({
          ...defaults,
          particleCount: 80,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFC107', '#FF4500', '#00F0FF'],
        });
      }, i * 250);
    }
  };

  const handleSpinClick = () => {
    if (isCoolingDown()) {
      toast.error(`Wait ${cooldownSecs}s before spinning again`);
      return;
    }
    if (isSpinning) return;

    if (!profile) {
      toast.error('Please sign in to spin!');
      return;
    }

    if (profile.tokens < SPIN_COST) {
      toast.error('Not enough tokens! Watch an ad for a free spin.');
      return;
    }

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

  const canvasSize = Math.min(typeof window !== 'undefined' ? window.innerWidth - 48 : 360, 380);

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4 select-none">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-neon/10 border border-cyan-neon/30 text-xs text-cyan-neon mb-2">
            <Sparkles size={12} />
            <span>Physical PBR Casino Cabinet • 60 FPS</span>
          </div>
          <h1 className="font-display text-3xl font-extrabold text-gradient-cyan mb-2">
            AquaSpin Wheel
          </h1>
          <p className="text-text-secondary text-sm">
            Spin costs {SPIN_COST} tokens • Win up to 500 tokens!
          </p>
        </div>

        {/* ── Token balance ── */}
        {profile && (
          <div className="flex items-center justify-center">
            <div className="token-badge px-4 py-2 shadow-lg shadow-primary-800/20">
              <TokenCounter value={profile.tokens} size="md" />
            </div>
          </div>
        )}

        {/* ── Wheel Canvas Container ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative wheel-container">
            {/* Ambient Cabinet Volumetric Glow Rings */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                boxShadow: `0 0 70px ${theme.borderColor}35, 0 0 130px ${theme.borderColor}15`,
              }}
            />

            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              className="wheel-canvas cursor-pointer drop-shadow-2xl"
              style={{ width: canvasSize, height: canvasSize }}
              onClick={handleSpinClick}
              aria-label="Spin wheel"
              role="button"
              tabIndex={0}
            />

            {/* Dynamic Spin Bloom Overlay */}
            <AnimatePresence>
              {isSpinning && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 90px ${theme.borderColor}60` }}
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── Spin result announcement ── */}
          <AnimatePresence>
            {spinResult && (
              <motion.div
                className="text-center w-full max-w-xs"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div
                  className={`glass-card rounded-2xl p-4 text-center border-2 ${
                    spinResult.reward >= 500
                      ? 'border-gold-neon/60 bg-gold-neon/10 shadow-neon-gold'
                      : 'border-cyan-neon/40 bg-navy-800/80 shadow-neon-cyan'
                  }`}
                >
                  <p className="text-sm font-semibold text-text-secondary mb-1">
                    {spinResult.reward >= 500 ? '🎰 MEGA JACKPOT! 🎰' : '🎉 You Won!'}
                  </p>
                  <p
                    className={`font-display text-3xl font-black ${
                      spinResult.reward >= 500 ? 'text-gold-neon' : 'text-cyan-neon'
                    }`}
                  >
                    +{formatTokens(spinResult.reward)}
                  </p>
                  <p className="text-text-secondary text-xs mt-1 font-medium">{spinResult.segment}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Action buttons ── */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Main spin button */}
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSpinClick}
              loading={isSpinning}
              disabled={isCoolingDown() || isSpinning}
              id="spin-btn"
              className="shadow-lg shadow-primary-800/30 font-semibold"
            >
              {isCoolingDown() ? (
                <>
                  <Clock size={18} />
                  Wait {cooldownSecs}s
                </>
              ) : (
                <>
                  <Coins size={18} />
                  Spin ({SPIN_COST} Tokens)
                </>
              )}
            </Button>

            {/* Free spin via ad */}
            <Button
              variant="neon"
              fullWidth
              onClick={handleFreeSpinAd}
              disabled={isSpinning}
              id="free-spin-btn"
              className="font-medium"
            >
              <Play size={16} />
              Free Spin (Watch Ad)
            </Button>
          </div>

          {/* ── Controls row ── */}
          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary transition-colors"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute' : 'Sound on'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Theme picker */}
            <div className="relative">
              <button
                className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary transition-colors"
                onClick={() => setThemePickerOpen(!themePickerOpen)}
                title="Change wheel theme"
              >
                <Palette size={18} />
              </button>

              <AnimatePresence>
                {themePickerOpen && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-card rounded-xl p-2 flex gap-2 border border-navy-600 bg-navy-800/95 shadow-xl"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    {(Object.keys(WHEEL_THEMES) as (keyof typeof WHEEL_THEMES)[]).map(t => (
                      <button
                        key={t}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${
                          wheelTheme === t ? 'scale-110 shadow-md' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: WHEEL_THEMES[t].borderColor + '33',
                          borderColor: WHEEL_THEMES[t].borderColor,
                        }}
                        onClick={() => {
                          setWheelTheme(t);
                          setThemePickerOpen(false);
                        }}
                        title={WHEEL_THEMES[t].name}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Segments legend ── */}
        <Card className="rounded-2xl border border-navy-700/80 bg-navy-850/60 backdrop-blur-md">
          <h3 className="font-display text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1.5">
            <span>🎡 Wheel Segments</span>
            <span className="text-2xs text-muted font-normal">({segmentCount} segments)</span>
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {WHEEL_SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-navy-800 border text-xs font-medium transition-colors
                  ${
                    seg.isJackpot
                      ? 'border-gold-neon/50 text-gold-neon bg-gold-neon/5 font-bold'
                      : 'border-navy-600/80 text-text-secondary hover:border-navy-500'
                  }`}
              >
                <Zap size={10} style={{ color: seg.glowColor }} />
                <span>{seg.isJackpot ? '🏆 JACKPOT' : seg.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Odds disclaimer ── */}
        <p className="text-center text-2xs text-muted">
          Spin results are generated server-side for fairness. Jackpot probability: ~1.2%. Tokens are
          virtual and not redeemable for real cash below 1000 tokens.
        </p>
      </div>

      {/* ── Floating reward popup ── */}
      <AnimatePresence>
        {floatingReward.show && (
          <motion.div
            className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
            initial={{ opacity: 1, y: 0, scale: 0.8 }}
            animate={{ opacity: 0, y: -100, scale: 1.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.8, ease: 'easeOut' }}
          >
            <span className="font-display font-black text-4xl text-cyan-neon drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]">
              +{formatTokens(floatingReward.amount)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Ads ── */}
      <RewardedAd
        isOpen={rewardedAdOpen}
        onClose={() => setRewardedAdOpen(false)}
        onRewardEarned={handleAdRewardEarned}
        triggerReason="free spin"
      />

      <InterstitialAd
        isOpen={interstitialOpen}
        onClose={handleInterstitialClose}
        delay={3}
      />
    </div>
  );
}
