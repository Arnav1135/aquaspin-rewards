// src/components/ui/GameSkeleton.tsx
import { motion } from 'framer-motion';

export const GameSkeleton = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl overflow-hidden p-6 gap-6 relative">
      {/* Background shimmer */}
      <motion.div 
        className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-800/30 to-transparent -skew-x-12"
        animate={{ x: ['-150%', '150%'] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
      />
      
      {/* Game Board Placeholder */}
      <div className="w-full max-w-2xl aspect-video bg-slate-800/50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700/50">
        <div className="grid grid-cols-5 gap-2 w-3/4 h-3/4 opacity-30">
           {Array.from({ length: 20 }).map((_, i) => (
             <motion.div 
               key={i} 
               className="bg-slate-700 rounded-lg"
               animate={{ opacity: [0.3, 0.6, 0.3] }}
               transition={{ repeat: Infinity, duration: 2, delay: i * 0.05 }}
             />
           ))}
        </div>
      </div>
      
      {/* Controls Placeholder */}
      <div className="flex gap-4 w-full max-w-2xl mt-auto">
        <div className="h-12 w-1/3 bg-slate-800/80 rounded-xl" />
        <div className="h-12 w-2/3 bg-slate-800/80 rounded-xl" />
      </div>
    </div>
  );
};
