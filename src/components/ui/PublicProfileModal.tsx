import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Zap, Star, Shield, Flame } from "lucide-react";
import { useUIStore } from "@/features/uiStore";
import { supabase } from "@/lib/supabase";
import { getAvatarColor, getInitials, formatTokens } from "@/lib/utils";

interface PublicProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak: number;
  total_earned: number;
  created_at: string;
}

export function PublicProfileModal() {
  const { publicProfileId, setPublicProfileId } = useUIStore();
  const [data, setData] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicProfileId) {
      setData(null);
      return;
    }
    const loadProfile = async () => {
      setLoading(true);
      const { data: res } = await (supabase as any)
        .from("public_profiles")
        .select("*")
        .eq("id", publicProfileId)
        .single();
      
      if (res) setData(res as PublicProfileData);
      setLoading(false);
    };
    loadProfile();
  }, [publicProfileId]);

  if (!publicProfileId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setPublicProfileId(null)}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-[#16213e] rounded-3xl border border-[#66bdf2]/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
        >
          {/* Header Banner */}
          <div className="h-24 bg-gradient-to-br from-[#66bdf2] to-blue-700 relative">
            <button
              onClick={() => setPublicProfileId(null)}
              className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors backdrop-blur-md"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="px-6 pb-6 pt-0 relative">
            {/* Avatar Drop */}
            <div className="flex justify-center -mt-12 mb-4">
              <div 
                className="w-24 h-24 rounded-full border-4 border-[#16213e] flex items-center justify-center text-3xl font-black text-[#16213e] shadow-xl z-10"
                style={{ backgroundColor: data ? getAvatarColor(data.id) : "#333" }}
              >
                {data?.avatar_url ? (
                  <img src={data.avatar_url} className="w-full h-full rounded-full object-cover" />
                ) : (
                  data?.username ? getInitials(data.username) : "?"
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center py-8">
                <div className="w-8 h-8 border-4 border-[#66bdf2] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : data ? (
              <div className="text-center">
                <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                  {data.username}
                  {data.id === "180a5fb2-6ef0-482f-b4ec-011ddb6214ed" && (
                    <span title="Admin"><Shield size={18} className="text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" /></span>
                  )}
                </h2>
                <div className="text-sm text-white/50 mb-6 flex justify-center gap-4 mt-2">
                  <span className="flex items-center gap-1"><Zap size={14} className="text-emerald-400"/> Lvl {data.level}</span>
                  <span className="flex items-center gap-1"><Flame size={14} className="text-orange-400"/> {data.streak} Day Streak</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                    <Trophy className="text-yellow-400 mb-2" size={24} />
                    <span className="text-xs text-white/40 mb-1">Total Earned</span>
                    <span className="text-lg font-bold text-white">{formatTokens(data.total_earned)}</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 p-4 rounded-2xl flex flex-col items-center">
                    <Star className="text-purple-400 mb-2" size={24} />
                    <span className="text-xs text-white/40 mb-1">Experience</span>
                    <span className="text-lg font-bold text-white">{data.xp} XP</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 text-xs text-white/30">
                  Joined {new Date(data.created_at).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-center text-white/50 py-8">Profile not found.</div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}