// src/pages/Referral.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Copy, Share2, Users, Coins, Trophy, CheckCircle2, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/authStore';
import { supabase } from '@/lib/supabase';

export function Referral() {
  const { profile } = useAuthStore();
  const [stats, setStats] = useState({ count: 0, earned: 0 });
  const [referredUsers, setReferredUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const referralCode = profile ? `AQUA-${profile.id.slice(0, 6).toUpperCase()}` : '';
  const referralLink = `https://aquaspin-rewards.vercel.app?ref=${referralCode}`;

  useEffect(() => {
    if (profile) {
      loadReferralData();
    }
  }, [profile]);

  const loadReferralData = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      // Fetch users who were referred by this user
      const { data } = await supabase
        .from('users')
        .select('username, created_at')
        .eq('referred_by', profile.id)
        .order('created_at', { ascending: false });
        
      if (data) {
        setReferredUsers(data);
        // Each successful referral gives 500 tokens (assumed to be earned if they played a game, but we'll approximate here or just say 500 * count)
        setStats({
          count: data.length,
          earned: data.length * 500
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied! 📋');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join AquaSpin Rewards',
          text: 'Use my code to get 500 bonus tokens on signup!',
          url: referralLink,
        });
        toast.success('Thanks for sharing! 🚀');
      } catch (err) {
        console.error(err);
      }
    } else {
      handleCopy();
    }
  };

  // Determine tier
  let tier = 'Bronze';
  let tierColor = 'text-amber-600';
  let tierBg = 'bg-amber-500/10 border-amber-500/20';
  if (stats.count >= 21) {
    tier = 'Gold';
    tierColor = 'text-yellow-400';
    tierBg = 'bg-yellow-400/10 border-yellow-400/20';
  } else if (stats.count >= 6) {
    tier = 'Silver';
    tierColor = 'text-slate-300';
    tierBg = 'bg-slate-300/10 border-slate-300/20';
  }

  return (
    <div className="pt-24 pb-32 px-4 max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <motion.div 
        className="text-center mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#66bdf2] to-[#7b8bc1] mb-4 shadow-lg shadow-[#66bdf2]/20">
          <Gift size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-black text-white mb-2">Invite & Earn</h1>
        <p className="text-[#c2e7fa] text-sm">
          Get <span className="font-bold text-[#66bdf2]">500 tokens</span> for every friend who joins and plays their first game!
        </p>
      </motion.div>

      {/* Referral Code Card */}
      <motion.div
        className="glass-panel p-6 rounded-3xl mb-6 relative overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#66bdf2] blur-[80px] opacity-20 rounded-full" />
        
        <p className="text-sm text-[#c2e7fa] mb-2 font-medium uppercase tracking-wider">Your Referral Link</p>
        
        <div className="flex items-center gap-2 mb-4 bg-[#16213e]/50 p-3 rounded-2xl border border-[#4a90d9]/20 backdrop-blur-md">
          <span className="flex-1 text-[#66bdf2] font-mono text-sm truncate select-all px-2">
            {referralLink}
          </span>
          <button 
            onClick={handleCopy}
            className="p-2 rounded-xl bg-[#4a90d9]/20 text-[#66bdf2] hover:bg-[#4a90d9]/40 transition-colors"
          >
            <Copy size={18} />
          </button>
        </div>

        <button 
          onClick={handleShare}
          className="w-full btn-primary py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
        >
          <Share2 size={18} /> Share with Friends
        </button>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          className="glass-panel p-4 rounded-3xl flex items-center gap-3"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-10 h-10 rounded-xl bg-[#66bdf2]/20 flex items-center justify-center text-[#66bdf2]">
            <Users size={20} />
          </div>
          <div>
            <p className="text-2xs text-[#c2e7fa] uppercase tracking-wider">Friends</p>
            <p className="text-lg font-bold text-white">{stats.count}</p>
          </div>
        </motion.div>

        <motion.div
          className="glass-panel p-4 rounded-3xl flex items-center gap-3"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center text-green-400">
            <Coins size={20} />
          </div>
          <div>
            <p className="text-2xs text-[#c2e7fa] uppercase tracking-wider">Earned</p>
            <p className="text-lg font-bold text-white">{stats.earned}</p>
          </div>
        </motion.div>
      </div>

      {/* Tier Info */}
      <motion.div
        className={`border ${tierBg} p-5 rounded-3xl mb-8 flex items-center justify-between backdrop-blur-md`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <Trophy className={tierColor} size={24} />
          <div>
            <p className={`font-bold ${tierColor}`}>{tier} Tier</p>
            <p className="text-xs text-white/60">
              {stats.count < 6 ? '6 friends for Silver' : stats.count < 21 ? `${21 - stats.count} more for Gold` : 'Max tier reached!'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Referred Users List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-bold text-white mb-4">Your Invites</h3>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="w-8 h-8 rounded-full border-2 border-[#66bdf2]/30 border-t-[#66bdf2] animate-spin" />
          </div>
        ) : referredUsers.length === 0 ? (
          <div className="text-center p-8 glass-panel rounded-3xl">
            <Users size={32} className="mx-auto text-[#c2e7fa]/40 mb-3" />
            <p className="text-[#c2e7fa]">No friends invited yet.</p>
            <p className="text-xs text-white/40 mt-1">Share your link to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {referredUsers.map((user, idx) => (
              <div key={idx} className="glass-panel p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#16213e] flex items-center justify-center text-sm font-bold text-[#66bdf2]">
                    {user.username?.substring(0, 2).toUpperCase() || '??'}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{user.username || 'Anonymous'}</p>
                    <p className="text-xs text-white/40">{new Date(user.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <CheckCircle2 size={18} className="text-green-400" />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
