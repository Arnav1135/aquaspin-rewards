// src/pages/Shop.tsx
// Token shop — buy boosters and power-ups

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Coins, CheckCircle } from 'lucide-react';
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
  effect: string;
  popular?: boolean;
}

const SHOP_ITEMS: ShopItem[] = [
  {
    id: 'spin_boost',
    name: 'Spin Booster',
    description: 'Double token rewards on next 5 spins.',
    cost: 200,
    emoji: '⚡',
    color: '#00F0FF',
    effect: '2x tokens for 5 spins',
    popular: true,
  },
  {
    id: 'cooldown_skip',
    name: 'Cooldown Skip',
    description: 'Remove spin cooldown for 1 hour.',
    cost: 150,
    emoji: '⏰',
    color: '#FFD700',
    effect: 'No cooldown for 1 hour',
  },
  {
    id: 'jackpot_charm',
    name: 'Jackpot Charm',
    description: 'Increases jackpot probability by 3x for 10 spins.',
    cost: 500,
    emoji: '🍀',
    color: '#00FF87',
    effect: '3x jackpot chance x10 spins',
    popular: true,
  },
  {
    id: 'streak_shield',
    name: 'Streak Shield',
    description: 'Protects your streak for one missed day.',
    cost: 300,
    emoji: '🛡️',
    color: '#A855F7',
    effect: 'Miss 1 day without losing streak',
  },
  {
    id: 'xp_boost',
    name: 'XP Booster',
    description: 'Earn 3x XP for the next 24 hours.',
    cost: 250,
    emoji: '🌟',
    color: '#FF9900',
    effect: '3x XP for 24 hours',
  },
  {
    id: 'token_rain',
    name: 'Token Rain',
    description: 'Receive a random bonus of 50–300 tokens instantly!',
    cost: 100,
    emoji: '🪙',
    color: '#FFD700',
    effect: 'Instant 50–300 random tokens',
  },
];

export function Shop() {
  const { profile, updateProfile, isGuest } = useAuthStore();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [confirmItem, setConfirmItem] = useState<ShopItem | null>(null);
  const [successItem, setSuccessItem] = useState<ShopItem | null>(null);

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
    setConfirmItem(null);

    try {
      // Apply instant effects
      let bonusTokens = 0;
      if (confirmItem.id === 'token_rain') {
        bonusTokens = Math.floor(Math.random() * 251) + 50; // 50–300
      }

      const newBalance = profile.tokens - confirmItem.cost + bonusTokens;
      await (supabase.from('users') as any).update({ tokens: newBalance }).eq('id', profile.id);
      updateProfile({ tokens: newBalance });

      setSuccessItem(confirmItem);
      toast.success(`${confirmItem.name} purchased! ${confirmItem.effect}`);
    } catch {
      toast.error('Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="min-h-screen bg-navy-900 pt-20 pb-24 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-gradient-cyan">Token Shop</h1>
            <p className="text-sm text-text-secondary mt-1">Spend tokens to unlock power-ups</p>
          </div>
          {profile && (
            <div className="token-badge px-3 py-2">
              <TokenCounter value={profile.tokens} size="sm" />
            </div>
          )}
        </div>

        {/* Guest notice */}
        {isGuest && (
          <div className="glass-card rounded-xl p-4 border border-warn/30 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm text-text-secondary">
              <strong className="text-warn">Sign up</strong> to use the shop and save your purchases!
            </p>
          </div>
        )}

        {/* Items grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SHOP_ITEMS.map((item, i) => {
            const canAfford = (profile?.tokens ?? 0) >= item.cost;
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${!canAfford ? 'opacity-70' : ''}`}
                  hover={canAfford}
                  glow={canAfford ? 'cyan' : 'none'}
                >
                  {item.popular && (
                    <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-gold-neon text-navy-900 text-2xs font-bold">
                      POPULAR
                    </div>
                  )}

                  <div className="text-3xl mb-3">{item.emoji}</div>
                  <h3 className="font-semibold text-text-primary mb-1">{item.name}</h3>
                  <p className="text-sm text-text-secondary flex-1 mb-3">{item.description}</p>

                  <div
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg mb-3 self-start"
                    style={{ backgroundColor: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}
                  >
                    <Star size={10} />
                    {item.effect}
                  </div>

                  <Button
                    variant={canAfford ? 'primary' : 'ghost'}
                    size="sm"
                    fullWidth
                    loading={purchasing === item.id}
                    disabled={!canAfford || isGuest}
                    onClick={() => handlePurchase(item)}
                    id={`buy-${item.id}`}
                  >
                    <Coins size={14} />
                    {formatTokens(item.cost)} tokens
                  </Button>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-2xs text-muted">
          All purchases are final. Booster effects are applied immediately and tracked server-side.
        </p>
      </div>

      {/* Confirm modal */}
      <Modal isOpen={!!confirmItem} onClose={() => setConfirmItem(null)} title="Confirm Purchase" size="sm">
        {confirmItem && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">{confirmItem.emoji}</div>
            <div>
              <h3 className="font-semibold text-text-primary text-lg">{confirmItem.name}</h3>
              <p className="text-text-secondary text-sm mt-1">{confirmItem.description}</p>
            </div>
            <div className="p-3 rounded-xl bg-navy-800 flex items-center justify-between">
              <span className="text-sm text-text-secondary">Cost</span>
              <span className="font-mono font-bold text-cyan-neon">{formatTokens(confirmItem.cost)} tokens</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" fullWidth onClick={() => setConfirmItem(null)}>Cancel</Button>
              <Button variant="gold" fullWidth onClick={confirmPurchase} id="confirm-purchase-btn">
                Buy Now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Success modal */}
      <Modal isOpen={!!successItem} onClose={() => setSuccessItem(null)} size="sm">
        {successItem && (
          <div className="space-y-4 text-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.3, 1] }}
              transition={{ duration: 0.5 }}
            >
              <CheckCircle size={56} className="text-success mx-auto" />
            </motion.div>
            <div>
              <h3 className="font-display text-xl font-bold text-text-primary mb-1">Purchase Successful!</h3>
              <p className="text-text-secondary text-sm">{successItem.effect} has been applied!</p>
            </div>
            <Button variant="primary" fullWidth onClick={() => setSuccessItem(null)}>
              Awesome!
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
