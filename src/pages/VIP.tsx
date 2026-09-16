import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, Star, Shield, Zap, Gift, Coins, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/features/authStore';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';

const TIERS = [
  { name: 'Bronze', minLevel: 1, color: 'from-amber-700 to-amber-900', iconColor: 'text-amber-500', rakeback: '2%', perks: ['Basic Support', 'Standard Withdrawals'] },
  { name: 'Silver', minLevel: 10, color: 'from-slate-400 to-slate-600', iconColor: 'text-slate-300', rakeback: '5%', perks: ['Priority Support', 'Daily Free Spin', 'Faster Withdrawals'] },
  { name: 'Gold', minLevel: 30, color: 'from-yellow-400 to-yellow-600', iconColor: 'text-yellow-300', rakeback: '10%', perks: ['VIP Host', 'Weekly Bonuses', 'Instant Withdrawals'] },
  { name: 'Platinum', minLevel: 60, color: 'from-cyan-400 to-blue-600', iconColor: 'text-cyan-300', rakeback: '15%', perks: ['Dedicated VIP Host', 'Loss Cashback', 'Exclusive Events', 'No Withdrawal Limits'] },
  { name: 'Diamond', minLevel: 90, color: 'from-purple-400 to-pink-600', iconColor: 'text-purple-300', rakeback: '20%', perks: ['Everything in Platinum', 'Luxury Gifts', 'Private Tournaments', 'Highest Rakeback'] },
];

export function VIP() {
  const { profile, updateProfile } = useAuthStore();
  const [claiming, setClaiming] = useState(false);

  const currentLevel = profile?.level || 1;
  const xp = profile?.xp || 0;
  
  // Find current tier
  let currentTierIndex = 0;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (currentLevel >= TIERS[i].minLevel) {
      currentTierIndex = i;
      break;
    }
  }
  
  const currentTier = TIERS[currentTierIndex];
  const nextTier = currentTierIndex < TIERS.length - 1 ? TIERS[currentTierIndex + 1] : null;
  
  const progressToNext = nextTier 
    ? Math.min(100, Math.max(0, ((currentLevel - currentTier.minLevel) / (nextTier.minLevel - currentTier.minLevel)) * 100))
    : 100;

  const handleClaimRakeback = async () => {
    if (!profile) return;
    setClaiming(true);
    
    // Simulate rakeback calculation (based on level & a random variation for demo)
    const baseRakeback = Math.floor(currentLevel * 50 * (1 + Math.random()));
    
    try {
      const newTokens = profile.tokens + baseRakeback;
      const { error } = await (supabase.from('users') as any).update({ tokens: newTokens }).eq('id', profile.id);
      
      if (error) throw error;
      
      updateProfile({ tokens: newTokens });
      toast.success(`Claimed ${baseRakeback} tokens in Rakeback!`);
    } catch (err) {
      toast.error('Failed to claim Rakeback. Try again later.');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white mb-2 flex items-center gap-3">
          <Crown className="text-yellow-400" size={32} />
          VIP Club
        </h1>
        <p className="text-text-secondary">Level up to unlock exclusive perks, higher rakeback, and luxury rewards.</p>
      </header>

      {/* Current Tier Overview */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl"
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${currentTier.color} opacity-20`} />
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
          <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${currentTier.color} p-1 shadow-xl shrink-0`}>
            <div className="w-full h-full bg-navy-900 rounded-full flex items-center justify-center border-4 border-black/50">
              <Crown className={`${currentTier.iconColor}`} size={48} />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left w-full">
            <h2 className={`text-4xl font-display font-black mb-1 ${currentTier.iconColor}`}>
              {currentTier.name} VIP
            </h2>
            <p className="text-white/60 font-medium mb-6">Level {currentLevel} • {xp.toLocaleString()} XP</p>
            
            {nextTier ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/80 font-medium">Progress to {nextTier.name}</span>
                  <span className="text-white/50">Level {nextTier.minLevel}</span>
                </div>
                <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full bg-gradient-to-r ${nextTier.color}`} 
                  />
                </div>
              </div>
            ) : (
              <div className="inline-block px-4 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold">
                Max VIP Rank Achieved!
              </div>
            )}
          </div>
          
          <div className="shrink-0 w-full md:w-auto flex flex-col gap-3">
            <div className="bg-black/40 border border-white/10 rounded-2xl p-4 text-center min-w-[160px]">
              <div className="text-white/60 text-xs font-bold uppercase tracking-wider mb-1">Current Rakeback</div>
              <div className={`text-3xl font-black ${currentTier.iconColor}`}>{currentTier.rakeback}</div>
            </div>
            <Button 
              variant="primary" 
              className="py-3" 
              onClick={handleClaimRakeback}
              disabled={claiming}
            >
              {claiming ? 'Processing...' : 'Claim Rakeback'}
            </Button>
          </div>
        </div>
      </motion.section>

      {/* Tiers List */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <Star className="text-cyan-400" size={20} />
          VIP Benefits
        </h3>
        
        <div className="grid grid-cols-1 gap-4">
          {TIERS.map((tier, index) => {
            const isUnlocked = currentLevel >= tier.minLevel;
            const isCurrent = index === currentTierIndex;
            
            return (
              <motion.div 
                key={tier.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-2xl border transition-all ${
                  isCurrent 
                    ? `bg-gradient-to-r from-navy-800 to-navy-900 border-${tier.color.split(' ')[0].replace('from-', '')}/50 shadow-[0_0_30px_rgba(0,0,0,0.2)]` 
                    : isUnlocked 
                      ? 'bg-navy-800/80 border-white/10 opacity-70' 
                      : 'bg-navy-900/50 border-white/5 opacity-50 grayscale'
                } flex flex-col md:flex-row gap-6 items-start md:items-center`}
              >
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 bg-navy-900 ${
                    isUnlocked ? `border-${tier.color.split(' ')[0].replace('from-', '')} ${tier.iconColor}` : 'border-white/10 text-white/20'
                  }`}>
                    {isUnlocked ? <Shield size={24} /> : <Shield size={24} />}
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold ${isUnlocked ? tier.iconColor : 'text-white/40'}`}>
                      {tier.name}
                    </h4>
                    <p className="text-xs text-white/40 font-medium">Level {tier.minLevel}+</p>
                  </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {tier.perks.map((perk, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-white/70">
                      <Zap size={14} className={isUnlocked ? 'text-cyan-400' : 'text-white/20'} />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
                
                <div className="shrink-0 flex items-center justify-between w-full md:w-auto border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                  <div className="text-left md:text-right">
                    <div className="text-xs text-white/40 font-medium uppercase mb-1">Rakeback</div>
                    <div className={`text-xl font-bold ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                      {tier.rakeback}
                    </div>
                  </div>
                  {!isUnlocked && (
                    <div className="bg-black/40 px-3 py-1.5 rounded-lg text-xs font-medium text-white/40 border border-white/5">
                      Locked
                    </div>
                  )}
                  {isCurrent && (
                    <div className="bg-cyan-500/20 text-cyan-400 px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-500/30">
                      Current Rank
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
