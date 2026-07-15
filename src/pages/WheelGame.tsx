// src/pages/WheelGame.tsx
// Canvas-based spinning wheel with physics, sounds, confetti, and ad integration

import { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins, Volume2, VolumeX, Palette, Play, Zap, Clock } from 'lucide-react';
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

export function WheelGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

  // ── Canvas draw function ─────────────────────────────────────────────────────
  const drawWheel = useCallback((angle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const radius = cx - 10;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // ── Draw outer glow ring
    const glowGradient = ctx.createRadialGradient(cx, cy, radius - 5, cx, cy, radius + 15);
    glowGradient.addColorStop(0, `${theme.borderColor}80`);
    glowGradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = glowGradient;
    ctx.lineWidth = 10;
    ctx.stroke();

    // ── Draw segments
    WHEEL_SEGMENTS.forEach((seg, i) => {
      const startAngle = angle + i * segmentAngle - Math.PI / 2;
      const endAngle = startAngle + segmentAngle;

      // Segment fill
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();

      // Alternating gradient fills
      const segGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      const isDark = i % 2 === 0;
      segGradient.addColorStop(0, isDark ? '#0A1428' : '#0D1B36');
      segGradient.addColorStop(0.6, isDark ? '#0D1B36' : '#112244');
      segGradient.addColorStop(1, isDark ? '#112244' : '#162B57');

      ctx.fillStyle = segGradient;
      ctx.fill();

      // Segment border (thin neon line)
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.strokeStyle = seg.isJackpot ? '#FFD700' : `${theme.borderColor}60`;
      ctx.lineWidth = seg.isJackpot ? 2 : 1;
      ctx.stroke();

      // ── Draw label text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startAngle + segmentAngle / 2);

      // Token icon or label
      const textRadius = radius * 0.65;
      ctx.translate(textRadius, 0);

      ctx.font = seg.isJackpot ? 'bold 11px Orbitron, sans-serif' : 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (seg.isJackpot) {
        // Glowing gold JACKPOT text
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 10;
        ctx.fillStyle = '#FFD700';
        ctx.fillText('JACKPOT', 0, -7);
        ctx.font = 'bold 10px Orbitron, sans-serif';
        ctx.fillText('500', 0, 7);
      } else {
        ctx.shadowColor = seg.glowColor;
        ctx.shadowBlur = 6;
        ctx.fillStyle = '#E8F4FD';
        const parts = seg.label.split(' ');
        ctx.fillText(parts[0], 0, -6);
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.fillStyle = seg.glowColor;
        ctx.fillText(parts[1] ?? '', 0, 6);
      }

      ctx.restore();
    });

    // ── Draw center circle
    const centerGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
    centerGradient.addColorStop(0, theme.centerColor);
    centerGradient.addColorStop(0.7, '#0A1428');
    centerGradient.addColorStop(1, '#162B57');

    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.fillStyle = centerGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, 2 * Math.PI);
    ctx.strokeStyle = theme.borderColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = theme.borderColor;
    ctx.shadowBlur = 15;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Center icon (spin text)
    ctx.font = 'bold 8px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = theme.borderColor;
    ctx.fillText('SPIN', cx, cy);

    // ── NOTE: Pointer is now rendered as a static HTML element, not in the canvas ──
  }, [theme, segmentAngle]);

  // ── Initial draw
  useEffect(() => {
    drawWheel(currentAngleRef.current);
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

    // Play spin sound
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
    const targetAngle = currentAngleRef.current - (currentAngleRef.current % (2 * Math.PI))
      + targetSegmentAngle + minSpins
      - Math.PI / 2 + segmentAngle / 2;

    const startAngle = currentAngleRef.current;
    const angleDiff = targetAngle - startAngle;
    const duration = 4000; // 4 second spin
    const startTime = performance.now();

    // Ease-out cubic
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 4);

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOut(progress);

      currentAngleRef.current = startAngle + angleDiff * easedProgress;
      drawWheel(currentAngleRef.current);

      // Tick sound
      if (soundEnabled && Math.floor(easedProgress * 20) > Math.floor((easedProgress - 0.02) * 20)) {
        playTone(600 + (1 - easedProgress) * 400, 0.05, 'square', 0.1);
      }

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Spin complete
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
  }, [soundEnabled, profile, updateProfile, setSpinning, setCooldown, addSpinToHistory, refreshProfile, drawWheel, segmentAngle, segmentCount]);

  const fireNormalConfetti = () => {
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#00F0FF', '#00C8D4', '#E8F4FD', '#00788A'],
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
    // Give free spin
    setTimeout(() => executeSpin('ad_rewarded'), 500);
  };

  const handleInterstitialClose = () => {
    setInterstitialOpen(false);
    // Resume spin after interstitial
    setTimeout(() => executeSpin(pendingSpinType), 300);
  };

  const canvasSize = Math.min(window.innerWidth - 48, 360);

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-gradient-cyan mb-2">Spin the Wheel</h1>
          <p className="text-text-secondary text-sm">Spin costs {SPIN_COST} tokens • Win up to 500!</p>
        </div>

        {/* ── Token balance ── */}
        {profile && (
          <div className="flex items-center justify-center">
            <div className="token-badge px-4 py-2">
              <TokenCounter value={profile.tokens} size="md" />
            </div>
          </div>
        )}

        {/* ── Wheel canvas ── */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative wheel-container">
            {/* Outer glow rings */}
            <div className="absolute inset-0 rounded-full" style={{
              boxShadow: `0 0 60px ${theme.borderColor}30, 0 0 120px ${theme.borderColor}15`
            }} />

            <canvas
              ref={canvasRef}
              width={canvasSize}
              height={canvasSize}
              className="wheel-canvas"
              style={{ width: canvasSize, height: canvasSize }}
              onClick={handleSpinClick}
              aria-label="Spin wheel"
              role="button"
              tabIndex={0}
            />

            {/* Fixed pointer triangle — stays at the top, never rotates */}
            <div
              className="absolute left-1/2 -translate-x-1/2 z-10 pointer-events-none"
              style={{ top: -10 }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: `22px solid ${theme.pointerColor}`,
                  filter: `drop-shadow(0 0 8px ${theme.pointerColor})`,
                }}
              />
            </div>

            {/* Spinning overlay glow */}
            <AnimatePresence>
              {isSpinning && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{ boxShadow: `0 0 80px ${theme.borderColor}50` }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* ── Spin result announcement ── */}
          <AnimatePresence>
            {spinResult && (
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              >
                <div className={`glass-card rounded-2xl p-4 text-center ${spinResult.reward >= 500 ? 'border-gold-neon/50' : 'border-cyan-neon/30'}`}>
                  <p className="text-sm text-text-secondary mb-1">
                    {spinResult.reward >= 500 ? '🎰 JACKPOT! 🎰' : '🎉 You won!'}
                  </p>
                  <p className={`font-display text-3xl font-bold ${spinResult.reward >= 500 ? 'text-neon-gold' : 'text-neon-cyan'}`}>
                    +{formatTokens(spinResult.reward)}
                  </p>
                  <p className="text-text-secondary text-xs mt-1">{spinResult.segment}</p>
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
            >
              <Play size={16} />
              Free Spin (Watch Ad)
            </Button>
          </div>

          {/* ── Controls row ── */}
          <div className="flex items-center gap-3">
            {/* Sound toggle */}
            <button
              className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute' : 'Sound on'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            {/* Theme picker */}
            <div className="relative">
              <button
                className="btn-ghost p-2 rounded-xl text-muted hover:text-text-secondary"
                onClick={() => setThemePickerOpen(!themePickerOpen)}
                title="Change wheel theme"
              >
                <Palette size={18} />
              </button>

              <AnimatePresence>
                {themePickerOpen && (
                  <motion.div
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 glass-card rounded-xl p-2 flex gap-2"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                  >
                    {(Object.keys(WHEEL_THEMES) as (keyof typeof WHEEL_THEMES)[]).map((t) => (
                      <button
                        key={t}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${wheelTheme === t ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                        style={{
                          backgroundColor: WHEEL_THEMES[t].borderColor + '33',
                          borderColor: WHEEL_THEMES[t].borderColor,
                        }}
                        onClick={() => { setWheelTheme(t); setThemePickerOpen(false); }}
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
        <Card className="rounded-2xl">
          <h3 className="font-display text-sm font-semibold text-text-secondary mb-3">🎡 Wheel Segments</h3>
          <div className="grid grid-cols-3 gap-2">
            {WHEEL_SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-navy-800 border text-xs font-medium
                  ${seg.isJackpot ? 'border-gold-neon/40 text-gold-neon' : 'border-navy-600 text-text-secondary'}`}
              >
                <Zap size={10} style={{ color: seg.glowColor }} />
                <span>{seg.isJackpot ? '🏆 JACKPOT' : seg.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Odds disclaimer ── */}
        <p className="text-center text-2xs text-muted">
          Spin results are generated server-side for fairness. Jackpot probability: ~1.2%.
          {' '}Tokens are virtual and not redeemable for real cash below 1000 tokens.
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
            <span className="font-display font-bold text-4xl text-neon-cyan drop-shadow-[0_0_20px_rgba(0,240,255,0.8)]">
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
