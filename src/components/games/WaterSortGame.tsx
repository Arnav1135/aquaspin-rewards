import { useState } from 'react';
import { GameFrame } from './GameFrame';
import WaterSort3D from './water-sort/WaterSort3D';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

  const handleWin = () => {
    setScore(s => s + 100);
    setLevel(l => l + 1);
  };

  const handleRestart = () => {
    // A trick to force re-render the same level
    setLevel(l => l); 
  };

  return (
    <GameFrame 
      title="Water Sort 3D" 
      onClose={onClose}
      level={level}
      score={score}
      onRestart={handleRestart}
      canvasClassName="bg-[#050510]"
    >
      <div className="w-full h-full relative group">
        <WaterSort3D level={level} onWin={handleWin} />
        
        {/* Premium Glass UI Overlay */}
        <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-2 rounded-full font-bold shadow-lg">
            Level {level}
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 text-[#5ab8ea] px-6 py-2 rounded-full font-bold shadow-lg">
            Score: {score}
          </div>
        </div>
      </div>
    </GameFrame>
  );
}
