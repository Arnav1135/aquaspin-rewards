import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gamepad2, Coins, Trophy, Gift } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthStore } from "@/features/authStore";
import { supabase } from "@/lib/supabase";
import { audio } from "@/lib/audioEngine";
import toast from "react-hot-toast";

interface DailyQuestsProps {
  totalGamesPlayed: number;
  totalEarned: number;
  totalWins: number;
}

export function DailyQuests({ totalGamesPlayed, totalEarned, totalWins }: DailyQuestsProps) {
  const { profile, updateProfile } = useAuthStore();
  const [claimedQuests, setClaimedQuests] = useState<string[]>([]);

  useEffect(() => { //
    const saved = localStorage.getItem("aquaspin_claimed_quests");
    if (saved) {
      try {
        setClaimedQuests(JSON.parse(saved));
      } catch (e) { /* ignore error */ }
    }
  }, []);

  const quests = [
    {
      id: "play_100",
      title: "Play 100 Games",
      current: totalGamesPlayed,
      target: 100,
      reward: 5000,
      icon: <Gamepad2 size={18} className="text-cyan-400" />,
      color: "bg-cyan-500",
      shadow: "shadow-[0_0_15px_rgba(6,182,212,0.5)]"
    },
    {
      id: "earn_50k",
      title: "Earn 50,000 Tokens",
      current: totalEarned,
      target: 50000,
      reward: 10000,
      icon: <Coins size={18} className="text-yellow-400" />,
      color: "bg-yellow-500",
      shadow: "shadow-[0_0_15px_rgba(234,179,8,0.5)]"
    },
    {
      id: "win_50",
      title: "Win 50 Games",
      current: totalWins,
      target: 50,
      reward: 7500,
      icon: <Trophy size={18} className="text-fuchsia-400" />,
      color: "bg-fuchsia-500",
      shadow: "shadow-[0_0_15px_rgba(217,70,239,0.5)]"
    },
  ];

  const handleClaim = async (id: string, reward: number) => {
    if (!profile) return;
    
    // Optimistic UI update
    const updated = [...claimedQuests, id];
    setClaimedQuests(updated);
    localStorage.setItem("aquaspin_claimed_quests", JSON.stringify(updated));
    
    // Audio and VFX
    audio.playChime(1500, 1.0, 0.8);
    setTimeout(() => audio.playChime(2000, 1.2, 1.0), 300);
    toast.success(`Quest Complete! +${reward.toLocaleString()} Tokens`, { icon: "??" });

    // Secure token insertion
    try {
      const { data, error } = await (supabase as any).rpc("update_user_tokens", {
        p_user_id: profile.id,
        p_amount_change: reward
      });
      if (!error && data !== undefined) {
        updateProfile({ tokens: data });
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Card className="rounded-2xl mt-6 relative overflow-hidden border-white/5 bg-black/40 backdrop-blur-md">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[50px] rounded-full pointer-events-none" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="text-emerald-400" />
          Lifetime Quests
        </CardTitle>
      </CardHeader>
      <div className="space-y-4 px-1 pb-4">
        {quests.map((quest, i) => {
          const progress = Math.min(100, Math.max(0, (quest.current / quest.target) * 100));
          const isComplete = quest.current >= quest.target;
          const isClaimed = claimedQuests.includes(quest.id);

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`relative p-4 rounded-xl border transition-all ${isComplete && !isClaimed ? "bg-white/10 border-white/20 " + quest.shadow : "bg-black/20 border-white/5"}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-black/40 rounded-lg">
                  {quest.icon}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {quest.title}
                    {!isClaimed && (
                      <span className="text-[10px] uppercase font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        +{quest.reward.toLocaleString()}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-white/50">
                    {quest.current.toLocaleString()} / {quest.target.toLocaleString()}
                  </p>
                </div>
                
                {isClaimed ? (
                  <span className="text-xs font-black text-white/20 px-3 py-1.5 bg-white/5 rounded-full">
                    CLAIMED
                  </span>
                ) : isComplete ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleClaim(quest.id, quest.reward)}
                    className="text-xs font-black text-black px-4 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-[0_0_15px_rgba(52,211,153,0.5)] hover:shadow-[0_0_25px_rgba(52,211,153,0.8)] transition-all"
                  >
                    CLAIM
                  </motion.button>
                ) : null}
              </div>
              
              <div className="h-2 w-full bg-black/50 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full ${quest.color}`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </Card>
  );
}