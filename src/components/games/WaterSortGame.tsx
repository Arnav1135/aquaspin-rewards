import { useState } from 'react';
import { GameFrame } from './GameFrame';
import WaterSortPixi from './water-sort-pixi/WaterSortPixi';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

  const handleWin = () => {
    setScore(s => s + 100);
    setLevel(l => l + 1);
  };

  const handleRestart = () => {
    setLevel(l => l);
  };

  return (
    <GameFrame 
      title="Water Sort" 

      onClose={onClose}
      level={level}
      score={score}
      onRestart={handleRestart}
      canvasClassName="bg-[#050510]"
    >
      <div className="w-full h-full relative group">
        <WaterSortPixi key={`level-${level}-${Date.now()}`} level={level} onWin={handleWin} />
      </div>
    </GameFrame>
  );
}
