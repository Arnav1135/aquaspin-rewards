import { useState } from 'react';
import { GameFrame } from './GameFrame';
import { WaterSortPro } from './water-sort-pro/components/WaterSortPro';

interface Props { onClose: () => void }

export function WaterSortGame({ onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);

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
      <div className="w-full h-full relative group overflow-hidden">
        <WaterSortPro key={`level-${level}-${Date.now()}`} onClose={onClose} />
      </div>
    </GameFrame>
  );
}
