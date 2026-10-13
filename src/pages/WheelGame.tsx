// src/pages/WheelGame.tsx
// Hyper-Realistic 2D Luxury Casino Spin Wheel

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameShell } from '@/components/games/GameShell';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Coins, Volume2, VolumeX, Palette, Play, Zap, Clock, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { useGameStore, WHEEL_SEGMENTS, WHEEL_THEMES } from '@/features/gameStore';
import { invokeEdgeFunction, supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TokenCounter } from '@/components/ui/TokenCounter';
import { RewardedAd } from '@/components/ads/RewardedAd';
import { InterstitialAd } from '@/components/ads/BannerAd';
import { playTone, vibrate, formatTokens } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import type { SpinResult } from '@/types/database';
import toast from 'react-hot-toast';
import { useProvablyFairStore } from '@/lib/crypto/provablyFairStore';
import { ProvablyFair } from '@/lib/crypto/provablyFair';
import { RealisticWheel2D } from '@/components/wheel/RealisticWheel2D';

const SPIN_COST = 10;

// ── Main UI Component ────────────────────────────────────────────────────────
export function WheelGame() {
  const animationRef = useRef<number>(0);
  const currentAngleRef = useRef(0);
  const isSpinningRef = useRef(false);

  const [rotationAngle, setRotationAngle] = useState(0);

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
  const [hasSpunToday, setHasSpunToday] = useState(false);
  const [isCheckingSpinStatus, setIsCheckingSpinStatus] = useState(true);

  const theme = WHEEL_THEMES[wheelTheme];
  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = (2 * Math.PI) / segmentCount;

  // ── Verify server & local daily spin status (once per day) ─────────────────
  useEffect(() => {
    let isMounted = true;
    const checkDailySpin = async () => {
      const todayDateStr = new Date().toISOString().split('T')[0];
      const localKey = `daily_spin_claimed_${profile?.id || 'guest'}_${todayDateStr}`;
      
      if (localStorage.getItem(localKey) === 'true') {
        if (isMounted) {
          setHasSpunToday(true);
          setIsCheckingSpinStatus(false);
        }
        return;
      }

      if (!profile || profile.id === 'guest' || profile.id.startsWith('guest')) {
        if (isMounted) setIsCheckingSpinStatus(false);
        return;
      }

      try {
        const { data: serverSpins } = await (supabase.from('spin_history') as any)
          .select('id, created_at')
          .eq('user_id', profile.id)
          .gte('created_at', `${todayDateStr}T00:00:00.000Z`)
          .limit(1);

        if (serverSpins && serverSpins.length > 0) {
          if (isMounted) {
            setHasSpunToday(true);
            localStorage.setItem(localKey, 'true');
          }
        }
      } catch (err) {
        console.warn('[WheelGame] Error verifying server daily spin status:', err);
      } finally {
        if (isMounted) setIsCheckingSpinStatus(false);
      }
    };

    checkDailySpin();
    return () => {
      isMounted = false;
    };
  }, [profile?.id]);

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

  // Clean up RAF on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

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
      audio.playChime(440, 0.2, 0.3);
    }
    vibrate([50, 30, 50]);

    let serverResult: SpinResult | null = null;
    try {
      const { data, error } = await invokeEdgeFunction<SpinResult>('spin', { spin_type: spinType });
      if (error || !data) throw new Error('API Error');
      serverResult = data;
    } catch {
      const pfState = useProvablyFairStore.getState();
      let serverSeed = pfState.activeServerSeed;
      if (!serverSeed) {
        await pfState.rotateServerSeed();
        serverSeed = useProvablyFairStore.getState().activeServerSeed;
      }
      const clientSeed = pfState.clientSeed || 'aquaspin_wheel';
      const nonce = pfState.getAndIncrementNonce();
      const outcomeFloat = await ProvablyFair.calculateOutcome(serverSeed, clientSeed, nonce);
      const chosenIndex = Math.floor(outcomeFloat * WHEEL_SEGMENTS.length);

      serverResult = {
        success: true,
        reward: WHEEL_SEGMENTS[chosenIndex].tokens,
        segment: WHEEL_SEGMENTS[chosenIndex].label,
        segment_index: chosenIndex,
        spin_type: spinType,
        new_balance: (profile?.tokens ?? 0) + WHEEL_SEGMENTS[chosenIndex].tokens,
      };
    }

    const targetSegmentIndex = serverResult.segment_index ?? Math.floor(Math.random() * segmentCount);
    // In RealisticWheel2D, segment i is at angle = -i * segmentAngle
    const targetSegmentAngle = -targetSegmentIndex * segmentAngle;
    const minSpins = 6 * 2 * Math.PI; // 6 full rotations for suspense

    // Calculate landing target angle
    const currentBase = currentAngleRef.current - (currentAngleRef.current % (2 * Math.PI));
    const targetAngle = currentBase + targetSegmentAngle - minSpins;

    const startAngle = currentAngleRef.current;
    const angleDiff = targetAngle - startAngle;
    const duration = 4800; // 4.8s realistic casino wheel deceleration
    const startTime = performance.now();

    // High-inertia physical deceleration with micro-bounce settle
    const easeOutWithSettle = (t: number) => {
      if (t >= 1) return 1;
      // Quartic ease out
      const base = 1 - Math.pow(1 - t, 4);
      return base;
    };

    const animate = (time: number) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutWithSettle(progress);

      const nextAngle = startAngle + angleDiff * easedProgress;
      currentAngleRef.current = nextAngle;
      setRotationAngle(nextAngle);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Subtle micro-settle bounce
        const settleStart = performance.now();
        const settleDuration = 400;

        const animateSettle = (now: number) => {
          const settleElapsed = now - settleStart;
          const sProgress = Math.min(settleElapsed / settleDuration, 1);
          // Damped oscillation
          const settleOffset = Math.sin(sProgress * Math.PI * 3) * Math.exp(-sProgress * 4) * 0.02;
          const finalAngle = targetAngle + settleOffset;
          currentAngleRef.current = finalAngle;
          setRotationAngle(finalAngle);

          if (sProgress < 1) {
            animationRef.current = requestAnimationFrame(animateSettle);
          } else {
            currentAngleRef.current = targetAngle;
            setRotationAngle(targetAngle);
            finishSpin(serverResult!);
          }
        };

        animationRef.current = requestAnimationFrame(animateSettle);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
  }, [soundEnabled, profile, updateProfile, setSpinning, segmentAngle, segmentCount]);

  const finishSpin = useCallback((serverResult: SpinResult) => {
    isSpinningRef.current = false;
    setSpinning(false);
    setSpinResult(serverResult);
    addSpinToHistory(serverResult);

    setCooldown(Date.now() + 30 * 1000);
    setCooldownSecs(30);
    refreshProfile();

    const isJackpot = serverResult.reward >= 500;
    if (isJackpot) {
      fireJackpotConfetti();
      vibrate([100, 50, 100, 50, 200]);
      if (soundEnabled) {
        audio.playChime(523, 0.4, 0.5);
        setTimeout(() => audio.playChime(659, 0.4, 0.5), 180);
        setTimeout(() => audio.playChime(784, 0.8, 0.6), 360);
      }
    } else {
      fireNormalConfetti();
      vibrate(100);
      if (soundEnabled) {
        audio.playChime(659, 0.3, 0.4);
        setTimeout(() => audio.playChime(880, 0.5, 0.4), 150);
      }
    }

    setFloatingReward({ amount: serverResult.reward, show: true });
    setTimeout(() => setFloatingReward({ amount: 0, show: false }), 2200);
  }, [soundEnabled, setSpinning, addSpinToHistory, setCooldown, refreshProfile]);

  const fireNormalConfetti = () => {
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 }, colors: ['#00F0FF', '#00C8D4', '#E8F4FD', '#FFD700'] });
  };

  const fireJackpotConfetti = () => {
    const count = 6;
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 360,
          startVelocity: 35,
          origin: { x: Math.random(), y: Math.random() - 0.2 },
          colors: ['#FFD700', '#FFC107', '#FF9100', '#00F0FF', '#FFFFFF']
        });
      }, i * 220);
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
    <GameShell onClose={() => window.history.back()}>
      <div className="min-h-screen bg-[#070d18] pt-16 pb-24 px-4 overflow-hidden relative font-sans">
        
        {/* Subtle Ambient Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-gradient-to-b from-cyan-900/15 via-blue-900/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-2xl mx-auto space-y-5 relative z-10">

          {/* Header */}
          <div className="text-center pt-2">
            <h1 className="font-display text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-200 to-amber-300 drop-shadow-md tracking-tight mb-1">
              Wheel of Fortune
            </h1>
            <p className="text-white/60 text-xs sm:text-sm font-medium">
              Spin costs <span className="text-amber-400 font-bold">{SPIN_COST} tokens</span> • Win up to <span className="text-yellow-300 font-extrabold">500 Tokens!</span>
            </p>
          </div>

          {/* Token Counter */}
          {profile && (
            <div className="flex items-center justify-center">
              <div className="bg-[#0b162c]/80 border border-white/10 rounded-2xl px-5 py-2 backdrop-blur-md shadow-xl flex items-center gap-2">
                <TokenCounter value={profile.tokens} size="md" />
              </div>
            </div>
          )}

          {/* ── 2D Hyper-Realistic Wheel Container ── */}
          <div className="relative py-2 flex flex-col items-center">
            <RealisticWheel2D
              rotationAngle={rotationAngle}
              isSpinning={isSpinning}
              themeName={wheelTheme}
              onCenterClick={handleSpinClick}
              canSpin={!isCoolingDown()}
            />

            {/* Spin Result Announcement Modal */}
            <AnimatePresence>
              {spinResult && (
                <motion.div
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-50 pointer-events-none"
                  initial={{ opacity: 0, y: 30, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 26 }}
                >
                  <div
                    className={`rounded-3xl p-7 text-center shadow-[0_20px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl border-2 ${
                      spinResult.reward >= 500
                        ? 'border-amber-400 bg-black/90 shadow-amber-500/30'
                        : 'border-cyan-400 bg-black/85 shadow-cyan-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <Sparkles size={16} className={spinResult.reward >= 500 ? 'text-amber-400' : 'text-cyan-400'} />
                      <p className="text-xs uppercase tracking-widest font-extrabold text-white/70">
                        {spinResult.reward >= 500 ? '🎰 GRAND JACKPOT! 🎰' : '🎉 CONGRATULATIONS!'}
                      </p>
                      <Sparkles size={16} className={spinResult.reward >= 500 ? 'text-amber-400' : 'text-cyan-400'} />
                    </div>
                    <p
                      className={`font-black text-5xl sm:text-6xl tracking-tight drop-shadow-xl ${
                        spinResult.reward >= 500
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-500'
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-sky-100'
                      }`}
                    >
                      +{formatTokens(spinResult.reward)}
                    </p>
                    <p className="text-white/80 font-semibold text-sm mt-3 uppercase tracking-wide">
                      {spinResult.segment}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col items-center gap-3 w-full max-w-sm mx-auto">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSpinClick}
              loading={isSpinning}
              disabled={isCoolingDown() || isSpinning}
              className="py-4 text-base font-black shadow-lg shadow-cyan-500/20"
            >
              {isCoolingDown() ? (
                <>
                  <Clock size={18} className="animate-spin" />
                  Wait {cooldownSecs}s
                </>
              ) : (
                <>
                  <Coins size={18} />
                  Spin Now ({SPIN_COST} Tokens)
                </>
              )}
            </Button>

            <Button
              variant="neon"
              fullWidth
              onClick={handleFreeSpinAd}
              disabled={isSpinning}
              className="py-3 font-bold"
            >
              <Play size={16} />
              Free Spin (Watch Video Ad)
            </Button>
          </div>

          {/* Utility Toggles (Audio, Theme) */}
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors shadow-md"
              onClick={toggleSound}
              title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>

            <div className="relative">
              <button
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors shadow-md"
                onClick={() => setThemePickerOpen(!themePickerOpen)}
                title="Change Wheel Theme"
              >
                <Palette size={18} />
              </button>

              <AnimatePresence>
                {themePickerOpen && (
                  <motion.div
                    className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-[#0d182e]/95 backdrop-blur-xl border border-white/15 rounded-2xl p-2.5 flex gap-2 shadow-2xl z-40"
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  >
                    {(Object.keys(WHEEL_THEMES) as (keyof typeof WHEEL_THEMES)[]).map((t) => (
                      <button
                        key={t}
                        className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${
                          wheelTheme === t ? 'scale-110 shadow-lg' : 'opacity-60 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: WHEEL_THEMES[t].borderColor + '33',
                          borderColor: WHEEL_THEMES[t].borderColor,
                          boxShadow: wheelTheme === t ? `0 0 12px ${WHEEL_THEMES[t].borderColor}` : 'none',
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

          {/* Wheel Segments Legend */}
          <Card className="rounded-3xl p-5 border border-white/10 bg-[#0d1629]/70 backdrop-blur-md shadow-2xl">
            <h3 className="font-display text-xs uppercase tracking-widest font-extrabold text-white/60 mb-3 flex items-center gap-1.5">
              <span>🎡</span>
              <span>Available Prizes</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {WHEEL_SEGMENTS.map((seg, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-transform hover:scale-[1.02] border ${
                    seg.isJackpot
                      ? 'border-amber-400/50 bg-gradient-to-r from-amber-950/60 to-yellow-900/40 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]'
                      : 'border-white/5 bg-white/5 text-white/80'
                  }`}
                >
                  <Zap size={11} style={{ color: seg.glowColor }} />
                  <span className="truncate">{seg.isJackpot ? '🏆 JACKPOT' : seg.label}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>

        {/* Floating Reward Animation */}
        <AnimatePresence>
          {floatingReward.show && (
            <motion.div
              className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50"
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -120, scale: 1.5 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, ease: 'easeOut' }}
            >
              <span className="font-black text-5xl sm:text-6xl text-cyan-300 drop-shadow-[0_0_30px_rgba(0,240,255,0.9)]">
                +{formatTokens(floatingReward.amount)}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

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
    </GameShell>
  );
}
