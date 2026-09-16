import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Star, Zap } from "lucide-react";
import { useAuthStore } from "@/features/authStore";
import { supabase } from "@/lib/supabase";
import { audio } from "@/lib/audioEngine";
import confetti from "canvas-confetti";

export function LevelUpManager() {
  const { profile, updateProfile } = useAuthStore();
  const [showLevelUp, setShowLevelUp] = useState<number | null>(null);

  // Helper to calculate level from total XP
  const calculateLevel = (xp: number) => {
    let lvl = 1;
    let threshold = 500;
    let remainingXp = xp;
    while (remainingXp >= threshold) {
      remainingXp -= threshold;
      lvl++;
      threshold = lvl * 500;
    }
    return lvl;
  };

  useEffect(() => {
    if (!profile) return;
    
    const correctLevel = calculateLevel(profile.xp || 0);
    
    if (correctLevel > (profile.level || 1)) {
      // Level Up!
      setShowLevelUp(correctLevel);
      
      // Update DB and local state
      // @ts-ignore
      supabase.from("users").update({ level: correctLevel }).eq("id", profile.id).then();
      updateProfile({ level: correctLevel });
      
      // Audio and Confetti
      audio.playChime(1500, 1.0, 0.8);
      setTimeout(() => audio.playChime(2000, 1.2, 1.0), 300);
      
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 10000 };

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
      }, 250);
    }
  }, [profile?.xp, profile?.level, profile?.id, updateProfile]);

  return (
    <AnimatePresence>
      {showLevelUp && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"
            onClick={() => setShowLevelUp(null)}
          />
          <motion.div
            initial={{ scale: 0.5, y: 100, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }}
            exit={{ scale: 0.5, y: -100, opacity: 0, rotate: 10 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="relative pointer-events-auto flex flex-col items-center bg-gradient-to-b from-[#16213e] to-black p-10 rounded-[3rem] border-4 border-yellow-400 shadow-[0_0_100px_rgba(250,204,21,0.5)]"
          >
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 10, ease: "linear" }}
              className="absolute -top-20 -z-10 opacity-50"
            >
              <Star size={200} className="text-yellow-400/20 fill-yellow-400/20" />
            </motion.div>
            
            <Trophy size={80} className="text-yellow-400 mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" />
            
            <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 mb-2 uppercase tracking-widest text-center drop-shadow-lg">
              Level Up!
            </h2>
            
            <p className="text-xl text-white/80 font-bold flex items-center gap-2 mb-8">
              You are now Level <span className="text-3xl text-yellow-400">{showLevelUp}</span>
            </p>

            <button
              onClick={() => setShowLevelUp(null)}
              className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-2xl text-xl shadow-[0_0_30px_rgba(250,204,21,0.4)] transition-all active:scale-95 flex items-center gap-2"
            >
              <Zap size={24} /> AWESOME
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}