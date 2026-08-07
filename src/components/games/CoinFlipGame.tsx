// src/components/games/CoinFlipGame.tsx
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { BetControl } from '@/components/ui/BetControl';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { vibrate } from '@/lib/utils';
import { audio } from '@/lib/audioEngine';
import { GameEngine3D } from '@/engine/GameEngine3D';
import { RigidBody, RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  createAppError,
  handleError,
  logError,
  withErrorHandling,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';
import toast from 'react-hot-toast';

interface CoinFlipGameProps {
  onClose: () => void;
}

type CoinSide = 'heads' | 'tails' | null;

/**
 * Coin Flip Game
 * 
 * Rules:
 * - Player bets on Heads or Tails
 * - 50/50 probability for each outcome
 * - Fair payout multiplier: (1 - houseEdge) / 0.5 ≈ 1.98x at 1% edge
 * - House edge: 1%
 */
function Coin3D({ flipping, result, selectedSide }: { flipping: boolean; result: CoinSide; selectedSide: CoinSide }) {
  const coinRef = useRef<RapierRigidBody>(null);
  const meshRef = useRef<THREE.Group>(null);
  
  // When flipping starts, apply upward impulse and torque
  useEffect(() => {
    if (flipping && coinRef.current) {
      // Reset position
      coinRef.current.setTranslation({ x: 0, y: 1, z: 0 }, true);
      coinRef.current.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
      
      // Physical launch!
      coinRef.current.applyImpulse({ x: (Math.random() - 0.5) * 2, y: 35, z: (Math.random() - 0.5) * 2 }, true);
      
      // Massive chaotic physical spin
      coinRef.current.applyTorqueImpulse({ 
        x: 15 + Math.random() * 10, 
        y: Math.random() * 2, 
        z: Math.random() * 2 
      }, true);
    }
  }, [flipping]);

  useFrame((_state) => {
    if (flipping && coinRef.current) {
      const linvel = coinRef.current.linvel();
      const pos = coinRef.current.translation();
      const rot = coinRef.current.rotation();
      
      const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w));
      
      // Aerodynamic "cheater" torque: When falling, gently coax the physical body to land on the correct face
      if (linvel.y < -1 && pos.y < 3) {
        const currentRotX = euler.x % (Math.PI * 2);
        const targetRotX = result === 'tails' ? Math.PI : (result === 'heads' ? 0 : currentRotX);
        
        let diff = targetRotX - currentRotX;
        // Normalize difference to -PI to PI
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        
        // Apply corrective physical torque
        coinRef.current.applyTorqueImpulse({ x: diff * 0.1, y: 0, z: 0 }, true);
      }
    }
  });

  return (
    <group>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[0, 2, 0]} intensity={2} color={selectedSide === 'heads' ? '#fbbf24' : '#a855f7'} />

      <RigidBody ref={coinRef} colliders="hull" restitution={0.7} friction={0.4}>
        <group ref={meshRef}>
          {/* Coin Body (True PBR) */}
          <mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.5, 1.5, 0.2, 32]} />
            <meshPhysicalMaterial color="#fbbf24" metalness={1.0} roughness={0.15} clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={2.0} />
          </mesh>
          
          {/* Heads Face */}
          <mesh position={[0, 0.11, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.4, 32]} />
            <meshPhysicalMaterial color="#f59e0b" metalness={0.8} roughness={0.3} clearcoat={0.5} envMapIntensity={1.5} />
          </mesh>

          {/* Tails Face */}
          <mesh position={[0, -0.11, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1.4, 32]} />
            <meshPhysicalMaterial color="#a855f7" metalness={0.8} roughness={0.3} clearcoat={0.5} envMapIntensity={1.5} />
          </mesh>
        </group>
      </RigidBody>

      {/* Floor to catch the coin */}
      <RigidBody type="fixed" position={[0, -2, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[10, 0.5, 10]} />
          <meshPhysicalMaterial clearcoat={1.0} clearcoatRoughness={0.1} envMapIntensity={1.5} transmission={0} thickness={0} color="#0f1729" />
        </mesh>
      </RigidBody>
    </group>
  );
}

export function CoinFlipGame({ onClose }: CoinFlipGameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  const [selectedSide, setSelectedSide] = useState<CoinSide>(null);
  const [flipping, setFlipping] = useState(false);
  const [result, setResult] = useState<CoinSide>(null);
  const [payoutResult, setPayoutResult] = useState<number | null>(null);
  const [history, setHistory] = useState<CoinSide[]>(['heads', 'tails', 'heads', 'heads', 'tails']);

  const balance = profile?.tokens ?? 0;
  const profileRef = useRef(profile);
  const balanceRef = useRef(balance);

  // Validate bet selection and amount
  const validateBet = useCallback((): { valid: boolean; error?: string } => {
    if (!selectedSide) return { valid: false, error: 'Select Heads or Tails to play' };
    if (betAmount <= 0) return { valid: false, error: 'Bet amount must be greater than 0' };
    if (betAmount > balance) return { valid: false, error: 'Insufficient tokens for this bet' };
    if (!Number.isFinite(betAmount)) return { valid: false, error: 'Invalid bet amount' };
    return { valid: true };
  }, [selectedSide, betAmount, balance]);

  // Update user balance in database with error handling
  const updateUserBalance = useCallback(
    withErrorHandling(
      async (newBalance: number, freeTrialsUsed?: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;

        try {
          const dbUpdates: any = { tokens: newBalance };
          if (freeTrialsUsed) {
            const currentTrials = pr.free_trials ?? 3;
            dbUpdates.free_trials = Math.max(0, currentTrials - 1);
          }

          const { error } = await (supabase.from('users') as any)
            .update(dbUpdates)
            .eq('id', pr.id);

          if (error) {
            throw createAppError(
              `Failed to update user balance: ${error.message}`,
              ErrorCategory.DATABASE,
              ErrorSeverity.ERROR,
              {
                userMessage: 'Failed to deduct tokens. Please try again.',
                context: { originalError: error.message },
              }
            );
          }

          return true;
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          throw createAppError(
            `Database update failed: ${error.message}`,
            ErrorCategory.DATABASE,
            ErrorSeverity.ERROR,
            {
              userMessage: 'Failed to process your bet. Your tokens have not been deducted.',
              context: { error: error.message },
            }
          );
        }
      },
      {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.ERROR,
        fallbackReturn: false,
      }
    ),
    []
  );

  // Update game result in database with error recovery
  const updateGameResult = useCallback(
    withErrorHandling(
      async (finalBalance: number, earned: number, won: boolean) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;

        try {
          const { error: updateError } = await (supabase.from('users') as any)
            .update({
              tokens: finalBalance,
              total_earned: pr.total_earned + (won ? Math.max(0, earned - betAmount) : 0),
              xp: pr.xp + Math.floor(betAmount * 0.1),
            })
            .eq('id', pr.id);

          if (updateError) {
            logError(updateError, { context: 'coinflip_result_update' });
          }

          const { error: statsError } = await (supabase.from('game_stats') as any).upsert({
            user_id: pr.id,
            games_played: 1,
            games_won: won ? 1 : 0,
          });

          if (statsError) {
            logError(statsError, { context: 'coinflip_stats_update' });
          }

          return true;
        } catch (err) {
          logError(err, { context: 'coinflip_database_error' });
          // Don't throw - update local state anyway
          return true;
        }
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: true }
    ),
    [betAmount]
  );

  const handleFlip = useCallback(async () => {
    try {
      // Validate bet
      const validation = validateBet();
      if (!validation.valid) {
        handleError(
          createAppError(
            validation.error || 'Invalid bet',
            ErrorCategory.VALIDATION,
            ErrorSeverity.WARNING,
            { userMessage: validation.error }
          ),
          { showToast: true }
        );
        return;
      }

      const pr = profileRef.current;
      if (!pr) {
        throw createAppError(
          'User profile not loaded',
          ErrorCategory.AUTH,
          ErrorSeverity.ERROR,
          { userMessage: 'Please refresh and try again.' }
        );
      }

      const isOwner = pr?.email === 'vermaarnav113@gmail.com';
      const freeTrials = pr?.free_trials ?? 3;
      const isFreeTrial = !isOwner && !pr?.has_deposited && freeTrials > 0;
      const outOfTrials = !isOwner && !pr?.has_deposited && freeTrials <= 0;

      if (outOfTrials) {
        handleError(
          createAppError(
            'No free trials remaining',
            ErrorCategory.GAME_LOGIC,
            ErrorSeverity.WARNING,
            { userMessage: 'Out of free trials! Deposit real cash to play unlimited.' }
          ),
          { showToast: true }
        );
        return;
      }

      const actualBet = isFreeTrial ? 0 : betAmount;
      const newBalance = balanceRef.current - actualBet;

      // Update database if not guest
      if (!pr.id.startsWith('guest')) {
        const updateSuccess = await updateUserBalance(newBalance, isFreeTrial);
        if (!updateSuccess) {
          throw createAppError(
            'Failed to update balance',
            ErrorCategory.DATABASE,
            ErrorSeverity.ERROR,
            { userMessage: 'Failed to process your bet. Please try again.' }
          );
        }
      }

      // Update local state
      balanceRef.current = newBalance;
      updateProfile({
        tokens: newBalance,
        ...(isFreeTrial ? { free_trials: Math.max(0, freeTrials - 1) } : {}),
      });

      if (isFreeTrial) {
        toast.success(`Free Trial Used! (${Math.max(0, freeTrials - 1)} left)`, {
          icon: '🎁',
          duration: 2000,
        });
      }

      // Start flip animation
      setFlipping(true);
      setResult(null);
      setPayoutResult(null);
      audio.play('coinflip', 'coin-toss-spin');
      vibrate([30, 30, 30]);

      // Determine result (50/50)
      const random = Math.random();
      const coinResult: CoinSide = random < 0.5 ? 'heads' : 'tails';

      // Wait for animation to complete
      setTimeout(async () => {
        try {
          setResult(coinResult);
          setFlipping(false);

          // Check if player won
          const won = coinResult === selectedSide;
          const multiplier = 1.98; // 1% house edge: (1 - 0.01) / 0.5 = 1.98x
          const earned = Math.floor(betAmount * multiplier);
          const finalBalance = balanceRef.current + earned;

          setPayoutResult(earned);

          // User feedback
          if (won) {
            toast.success(`🎉 ${coinResult.toUpperCase()}! +${earned - betAmount} tokens!`);
            audio.play('coinflip', 'win-result');
            vibrate([50, 50, 100]);
          } else {
            toast.error(`Lost ${betAmount} tokens.`);
            audio.play('coinflip', 'lose-result');
            vibrate(120);
          }

          // Update history
          setHistory(prev => [...prev.slice(-29), coinResult]);

          // Update database
          balanceRef.current = finalBalance;
          await updateGameResult(finalBalance, earned, won);
          updateProfile({ tokens: finalBalance });
        } catch (error) {
          logError(error, { context: 'coinflip_result_resolution' });
          setFlipping(false);
          handleError(error, {
            showToast: true,
            fallbackMessage: 'Failed to complete game. Your balance has not been updated.',
          });
        }
      }, 1500);
    } catch (error) {
      handleError(error, {
        showToast: true,
        fallbackMessage: 'Failed to flip coin. Please try again.',
      });
    }
  }, [validateBet, updateUserBalance, updateGameResult, betAmount, selectedSide]);

  return (
    <ErrorBoundary name="CoinFlipGame">
      <div className="flex flex-col lg:flex-row gap-6 p-4 max-w-5xl mx-auto min-h-[calc(100vh-120px)] items-stretch border border-cyan-400/40 shadow-[0_0_15px_rgba(34,211,238,0.15)] rounded-2xl" style={{ background: 'linear-gradient(135deg, #0e0b2e 0%, #12082a 50%, #0a1040 100%)' }}>
        <Card className="w-full lg:w-80 flex flex-col justify-between p-5 space-y-5 bg-slate-900/40 backdrop-blur-2xl border border-slate-700/50 rounded-2xl shrink-0 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="space-y-4">
            <BetControl betAmount={betAmount} setBetAmount={setBetAmount} disabled={flipping} />
            <div className="space-y-2">
              <span className="text-xs text-text-secondary font-medium">Pick a Side</span>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={flipping}
                  onClick={() => {
                    setSelectedSide('heads');
                    audio.play('coinflip', 'click');
                  }}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    selectedSide === 'heads'
                      ? 'border-yellow-500 bg-yellow-950/30 text-yellow-400 shadow-[0_0_16px_rgba(234,179,8,0.3)]'
                      : 'border-navy-700 text-text-secondary'
                  }`}
                >
                  👑 Heads
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  disabled={flipping}
                  onClick={() => {
                    setSelectedSide('tails');
                    audio.play('coinflip', 'click');
                  }}
                  className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                    selectedSide === 'tails'
                      ? 'border-purple-500 bg-purple-950/30 text-purple-400 shadow-[0_0_16px_rgba(168,85,247,0.3)]'
                      : 'border-navy-700 text-text-secondary'
                  }`}
                >
                  🪙 Tails
                </motion.button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Button variant="neon"
              size="lg"
              className="w-full font-bold py-4 rounded-xl w-full font-bold py-3.5 text-sm rounded-xl border border-cyan-400/40 shadow-lg shadow-cyan-500/20"
              disabled={flipping || !selectedSide || betAmount <= 0 || betAmount > balance}
              onClick={handleFlip}
            >
              {flipping ? 'Flipping...' : 'Flip Coin'}
            </Button>
            <Button variant="ghost" className="w-full text-xs text-muted" onClick={onClose}>
              Close Game
            </Button>
          </div>
        </Card>

        <Card className="flex-1 flex flex-col gap-4 relative min-h-[440px] bg-slate-950/40 backdrop-blur-2xl border border-slate-700/50 rounded-2xl p-5 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <div className="absolute top-4 right-4 flex items-center gap-1 text-2xs text-muted">
            <HelpCircle size={10} />
            <span>1% edge</span>
          </div>

          {/* History board */}
          <div className="grid grid-cols-12 gap-1">
            {history.slice(-30).map((h, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
                className={`w-5 h-5 rounded-full border text-2xs flex items-center justify-center font-bold ${
                  h === 'heads'
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400'
                    : 'bg-purple-500/20 border-purple-500/50 text-purple-400'
                }`}
              >
                {h === 'heads' ? '👑' : '🪙'}
              </motion.div>
            ))}
          </div>

          {/* Coin display */}
          <div className="flex-1 rounded-2xl flex flex-col items-center justify-center gap-6 p-4 relative"
            style={{
              background: 'radial-gradient(ellipse at center, #1a2847 0%, #0f1729 100%)',
              backgroundImage: 'radial-gradient(ellipse at center, #1a2847 0%, #0f1729 100%), repeating-linear-gradient(45deg, rgba(0,0,0,0.05) 0, rgba(0,0,0,0.05) 1px, transparent 0, transparent 50%)',
            }}
          >
            <div className="absolute inset-0 z-0">
              <GameEngine3D cameraPosition={[0, 3, 6]} enablePhysics={true} enablePostProcessing={true}>
                <Coin3D flipping={flipping} result={result || selectedSide || 'heads'} selectedSide={selectedSide} />
              </GameEngine3D>
            </div>

            {/* Result display overlay */}
            <div className="absolute bottom-10 inset-x-0 min-h-[48px] text-center z-10 pointer-events-none">
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <h3 className={`text-2xl font-bold font-display uppercase tracking-widest ${
                      result === 'heads' ? 'text-yellow-400' : 'text-purple-400'
                    }`}>
                      {result}!
                    </h3>
                    {payoutResult !== null && payoutResult > 0 && (
                      <p className="text-xs text-gold-neon font-semibold">Payout: +{payoutResult} tokens</p>
                    )}
                  </motion.div>
                )}
                {flipping && <p className="text-xs text-white/40 animate-pulse uppercase tracking-wider">Flipping...</p>}
              </AnimatePresence>
            </div>

            {/* Stats */}
            <div className="text-center text-2xs text-text-secondary space-y-1">
              <p>50% Heads | 50% Tails</p>
              <p>Payout: 1.98x on win</p>
            </div>
          </div>
        </Card>
      </div>
    </ErrorBoundary>
  );
}
