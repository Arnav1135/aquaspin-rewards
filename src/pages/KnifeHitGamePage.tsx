import { useState } from 'react';
import { KnifeGame } from '../games/knifethrower/KnifeGame';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function KnifeHitGamePage() {
  const navigate = useNavigate();
  // State for HUD
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [knivesLeft, setKnivesLeft] = useState(7);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* Game Canvas */}
      <KnifeGame 
        onScoreUpdate={(s) => setScore(s)}
        onLevelUpdate={(l) => setLevel(l)}
        onKnivesUpdate={(k) => setKnivesLeft(k)}
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none z-10">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="text-white hover:bg-white/10 pointer-events-auto flex items-center gap-2"
        >
          <ArrowLeft size={20} />
          Back to Lobby
        </Button>

        <div className="flex flex-col items-end gap-2 text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.8)]">
          <div className="text-4xl font-black tabular-nums tracking-tighter">
            {score.toString().padStart(4, '0')}
          </div>
          <div className="text-xl font-bold text-aqua-400">
            STAGE {level}
          </div>
          <div className="flex gap-1 mt-2">
            {/* Knife Indicators */}
            {Array.from({ length: 10 }).map((_, i) => (
              <div 
                key={i} 
                className={`w-2 h-6 rounded-sm transition-all duration-300 ${
                  i < knivesLeft 
                    ? 'bg-gradient-to-t from-gray-400 to-white shadow-[0_0_10px_rgba(255,255,255,0.5)]' 
                    : 'bg-white/10'
                }`}
                style={{
                  display: i < (level * 2 + 5) ? 'block' : 'none' // Max 15 knives per level
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
