import React from 'react';
import { Hammer, Shuffle, PlusCircle, Rocket, Gift } from 'lucide-react';
import { BoosterType } from '../types';

interface BoosterBarProps {
  activeBooster: BoosterType | null;
  boosterCounts: Record<BoosterType, number>;
  onSelectBooster: (type: BoosterType) => void;
  isProcessing: boolean;
}

export const BoosterBar: React.FC<BoosterBarProps> = ({
  activeBooster,
  boosterCounts,
  onSelectBooster,
  isProcessing,
}) => {
  const boosters: { type: BoosterType; label: string; icon: React.ReactNode; color: string }[] = [
    {
      type: 'lollipop-hammer',
      label: 'Hammer',
      icon: <Hammer className="w-4 h-4" />,
      color: 'from-pink-500 to-rose-600',
    },
    {
      type: 'hand-switch',
      label: 'Free Swap',
      icon: <Shuffle className="w-4 h-4" />,
      color: 'from-amber-500 to-orange-600',
    },
    {
      type: 'extra-moves',
      label: '+5 Moves',
      icon: <PlusCircle className="w-4 h-4" />,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      type: 'ufo',
      label: 'UFO Bomb',
      icon: <Rocket className="w-4 h-4" />,
      color: 'from-indigo-500 to-purple-600',
    },
    {
      type: 'party-booster',
      label: 'Party Boom',
      icon: <Gift className="w-4 h-4" />,
      color: 'from-fuchsia-500 to-pink-600',
    },
  ];

  return (
    <div className="w-full max-w-[540px] bg-slate-900/80 border border-slate-700/60 backdrop-blur-md rounded-2xl p-2 shadow-xl flex items-center justify-around gap-1 text-white">
      {boosters.map((b) => {
        const count = boosterCounts[b.type] || 0;
        const isActive = activeBooster === b.type;

        return (
          <button
            key={b.type}
            disabled={isProcessing || count <= 0}
            onClick={() => onSelectBooster(b.type)}
            className={`relative flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              isActive
                ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-105 shadow-lg font-black'
                : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 hover:scale-105'
            } ${count <= 0 ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'}`}
          >
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${b.color} text-white shadow`}>
              {b.icon}
            </div>
            <span className="text-[10px] font-bold mt-1 tracking-tight">{b.label}</span>

            {/* Quantity Badge */}
            <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};
